const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QUOTA_EXCEEDED, geminiUnavailable } = require('./aiGuidance');
const {
  imageCheckFields,
  imageCheckPrompt,
  logImageRejection,
  normaliseImageCheck,
} = require('./imageCheck');

const MODEL_NAME = 'gemini-3.8-flash';

const SKIN_ISSUE_PROMPT = `
You support an academic Ayurvedic wellness app. You are not a doctor or dermatologist and you must not diagnose.
Look at the photo and give general, informational Ayurvedic skincare guidance only.

Image check (do this first, and fill in "imageCheck"):
Decide whether this photo is suitable for a skin assessment.
${imageCheckFields('skin')}
If "isValid" is false, do not describe or assess anything: use "unable_to_assess", leave "concern" and "observations" empty, and leave every list empty.

Rules:
- Do not name a disease and do not give a diagnosis. Describe at most one possible visible skin concern in plain everyday words (for example "visible dryness" or "uneven tone").
- Do not give severity ratings, grades, percentages, probabilities, or confidence scores.
- If the photo is unclear, does not show skin, or you cannot tell, use "unable_to_assess".
- If no clear concern is visible, use "no_clear_concern".
- Keep suggestions gentle and general. No prescription medicines and no dosages.
- If something could need professional care (pain, bleeding, spreading, or lasting changes), say in selfCare that a qualified healthcare professional should be consulted.

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "imageCheck": { "isValid": <true|false>, "imageCategory": "<category>", "humanSkinVisible": <true|false>, "faceCount": <number>, "quality": "<quality>", "reason": "<reason>" },
  "status": "possible_concern" | "no_clear_concern" | "unable_to_assess",
  "concern": "<short plain-language description of a possible visible concern, or an empty string>",
  "observations": "<1-2 sentences of general observations about what is visible>",
  "factors": ["<general factor that can contribute>", "<factor>", "<factor>"],
  "herbs": [
    { "name": "<herb>", "emoji": "<emoji>", "benefit": "<general benefit>", "usage": "<gentle external or dietary use>" }
  ],
  "selfCare": ["<self-care suggestion>", "<suggestion>", "<suggestion>"]
}
`;

// Appended after the English instructions so every safety rule above still applies unchanged.
const SINHALA_OUTPUT_INSTRUCTION = `
Language:
- Write every human-readable text value in natural, simple Sinhala that an ordinary Sri Lankan user can easily understand. Avoid awkward word-for-word translation.
- This applies to every string in the JSON: "concern", "observations", every item in "factors" and "selfCare", and the "benefit" and "usage" of every herb. The <...> placeholders above only describe the content; write that content in Sinhala script. Do not leave any sentence or list item in English.
- Keep all JSON keys, the "status" values, every "imageCheck" value, and emoji exactly as specified above, in English/ASCII.
- For herb names, use the common Sinhala name only when you are certain of it; otherwise keep the English name. A botanical or technical term that has no clear Sinhala equivalent may stay in English inside brackets.
- All of the rules above still apply in Sinhala: no diagnosis, no disease names, no severity, percentages, probabilities, or confidence scores, no prescription medicines, and no dosages.
`;

// Used once, only after an answer still contained English text in Sinhala mode.
const SINHALA_STRICT_INSTRUCTION = `
Important: a previous answer to this request still contained English sentences. Write the value of "concern", "observations", every "factors" and "selfCare" item, and every herb "benefit" and "usage" entirely in Sinhala script. English is allowed only for an herb name or a bracketed botanical term.
`;

function withLanguage(prompt, language) {
  return language === 'si' ? `${prompt}\n${SINHALA_OUTPUT_INSTRUCTION}` : prompt;
}

/** The full skin-guidance instruction text; shared by every provider so the safety rules stay identical. */
function skinIssuePrompt({ language = 'en', strictLanguage = false } = {}) {
  const prompt = withLanguage(SKIN_ISSUE_PROMPT, language);
  return strictLanguage && language === 'si' ? `${prompt}\n${SINHALA_STRICT_INSTRUCTION}` : prompt;
}

function getApiKey() {
  const key = String(process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'your_gemini_api_key_here') {
    throw geminiUnavailable(new Error('GEMINI_API_KEY is not configured.'));
  }
  return key;
}

function parseJsonContent(text) {
  const clean = String(text || '')
    .replace(/```json|```/g, '')
    .trim();
  return JSON.parse(clean);
}

// Mutable only so tests can shorten the waits; production always uses these values.
const RETRY_POLICY = {
  maxAttempts: 2,
  attemptTimeoutMs: 45000,
  retryDelayMs: 1500,
};

const TRANSIENT_NETWORK_PATTERN = /fetch failed|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|UND_ERR_/i;

function timeoutError(timeoutMs) {
  const error = new Error(`Gemini did not respond within ${timeoutMs} ms.`);
  error.name = 'GeminiTimeoutError';
  return error;
}

// Only temporary provider conditions are retried; anything else (invalid key, quota,
// bad request, safety block) would fail the same way again.
function classifyFailure(error) {
  if (error && error.name === 'GeminiTimeoutError') {
    return { category: 'timeout', retryable: true };
  }
  const status = error && typeof error.status === 'number' ? error.status : null;
  if (status === 503) {
    return { category: 'provider_unavailable', retryable: true };
  }
  if (status !== null) {
    return { category: `http_${status}`, retryable: false };
  }
  if (TRANSIENT_NETWORK_PATTERN.test(String((error && error.message) || ''))) {
    return { category: 'network', retryable: true };
  }
  return { category: 'provider_error', retryable: false };
}

// Reads only the structured quota fields Google attaches to a 429, never the provider message.
function quotaInfo(error) {
  const details = Array.isArray(error && error.errorDetails) ? error.errorDetails : [];
  let quotaId = null;
  let retryAfterSeconds = null;
  for (const detail of details) {
    const type = String((detail && detail['@type']) || '');
    if (type.endsWith('QuotaFailure') && Array.isArray(detail.violations)) {
      const id = detail.violations[0] && detail.violations[0].quotaId;
      if (typeof id === 'string' && /^[\w-]{1,120}$/.test(id)) {
        quotaId = id;
      }
    } else if (type.endsWith('RetryInfo')) {
      const match = /^(\d{1,7})(?:\.\d+)?s$/.exec(String(detail.retryDelay || ''));
      if (match) {
        retryAfterSeconds = Number(match[1]);
      }
    }
  }
  return { quotaId, retryAfterSeconds };
}

// Metadata only: never the key, prompt, image data, provider message, or user details.
function logFailure({ attempt, maxAttempts, category, status, elapsedMs, willRetry, quota }) {
  const quotaText =
    quota && (quota.quotaId || quota.retryAfterSeconds !== null)
      ? `, quotaId=${quota.quotaId ?? 'unknown'}, retryAfterSeconds=${quota.retryAfterSeconds ?? 'unknown'}`
      : '';
  console.warn(
    `Gemini request failed (model=${MODEL_NAME}, attempt=${attempt}/${maxAttempts}, ` +
      `category=${category}, httpStatus=${status ?? 'none'}, elapsedMs=${elapsedMs}, willRetry=${willRetry}${quotaText})`,
  );
}

async function generateWithTimeout(model, request, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(timeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([model.generateContent(request, { signal: controller.signal }), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Any provider-side failure (bad or revoked key, quota, outage, timeout, network, blocked or
// unparseable output) means the photo was not analysed, so the client should fall back.
async function callGemini(
  request,
  readResponse,
  { maxAttempts = RETRY_POLICY.maxAttempts, attemptTimeoutMs = RETRY_POLICY.attemptTimeoutMs } = {},
) {
  const apiKey = getApiKey();
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODEL_NAME });

  let result;
  for (let attempt = 1; ; attempt += 1) {
    const startedAt = Date.now();
    try {
      result = await generateWithTimeout(model, request, attemptTimeoutMs);
      break;
    } catch (error) {
      const { category, retryable } = classifyFailure(error);
      const willRetry = retryable && attempt < maxAttempts;
      const status = typeof error?.status === 'number' ? error.status : null;
      const quota = status === 429 ? quotaInfo(error) : null;
      logFailure({
        attempt,
        maxAttempts,
        category,
        status,
        elapsedMs: Date.now() - startedAt,
        willRetry,
        quota,
      });
      if (!willRetry) {
        const unavailable = geminiUnavailable(error);
        if (quota) {
          unavailable.reason = QUOTA_EXCEEDED;
          unavailable.retryAfterSeconds = quota.retryAfterSeconds;
        }
        throw unavailable;
      }
      await wait(RETRY_POLICY.retryDelayMs);
    }
  }

  try {
    return readResponse(result.response.text());
  } catch (error) {
    console.warn(`Gemini response was unusable (model=${MODEL_NAME}, category=unusable_response)`);
    throw geminiUnavailable(error);
  }
}

async function analyseSkinIssue(
  { imageBase64, mimeType = 'image/jpeg', language = 'en', strictLanguage = false },
  options = {},
) {
  return callGemini(
    [
      skinIssuePrompt({ language, strictLanguage }),
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ],
    parseJsonContent,
    options,
  );
}

/**
 * Skin Type Assessment photo check (one clear face). Resolves to { isValid, reason, imageCategory };
 * an answer that does not match the schema is unusable and surfaces as GEMINI_UNAVAILABLE.
 */
async function checkSkinImage({ imageBase64, mimeType = 'image/jpeg' }) {
  return callGemini(
    [
      imageCheckPrompt('face'),
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ],
    text => {
      const raw = parseJsonContent(text);
      const imageCheck = normaliseImageCheck(raw, 'face');
      if (!imageCheck) {
        throw new Error('The image check did not match the expected schema.');
      }
      if (!imageCheck.isValid) {
        logImageRejection('face', raw, imageCheck);
      }
      return imageCheck;
    },
  );
}

function herbalRecommendationsPrompt(condition, dosha, language = 'en') {
  const prompt = `
You are an Ayurvedic herbalist AI.
Provide 5 herbal remedies for "${condition}"${dosha ? ` for ${dosha} dosha` : ''}.

Return ONLY valid JSON array:
[
  { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to prepare and use>" }
]
`;
  return withLanguage(prompt, language);
}

function dailyTipPrompt(dosha, language = 'en') {
  const prompt = `Give one short, practical Ayurvedic wellness tip${
    dosha ? ` for ${dosha} dosha` : ''
  }. Return only the tip text, no quotes, no markdown, max 2 sentences.`;
  return language === 'si'
    ? `${prompt} Write the tip in natural, simple Sinhala that an ordinary Sri Lankan user can easily understand.`
    : prompt;
}

async function getHerbalRecommendations(condition, dosha, language = 'en') {
  return callGemini(herbalRecommendationsPrompt(condition, dosha, language), parseJsonContent);
}

async function getDailyTip(dosha, language = 'en') {
  return callGemini(dailyTipPrompt(dosha, language), text => String(text || '').trim());
}

module.exports = {
  MODEL_NAME,
  RETRY_POLICY,
  SKIN_ISSUE_PROMPT,
  SINHALA_OUTPUT_INSTRUCTION,
  SINHALA_STRICT_INSTRUCTION,
  withLanguage,
  skinIssuePrompt,
  parseJsonContent,
  classifyFailure,
  herbalRecommendationsPrompt,
  dailyTipPrompt,
  analyseSkinIssue,
  checkSkinImage,
  getHerbalRecommendations,
  getDailyTip,
};
