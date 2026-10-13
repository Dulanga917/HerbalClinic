const { geminiUnavailable } = require('./aiGuidance');
const { parseJsonContent, skinIssuePrompt } = require('./gemini');

const MODEL_NAME = 'qwen/qwen3.8-27b';
const CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Mutable only so tests can shorten the wait and swap the transport; production always uses these.
const GROQ_POLICY = {
  attemptTimeoutMs: 20000,
  reasoningEffort: 'low',
  maxCompletionTokens: 2048,
};
const transport = { fetch: (...args) => globalThis.fetch(...args) };

function getApiKey() {
  return String(process.env.GROQ_API_KEY || '').trim();
}

function isConfigured() {
  return getApiKey().length > 0;
}

// Metadata only: never the key, prompt, image data, provider message, or user details.
function logFailure(category, status, elapsedMs) {
  console.warn(
    `Groq request failed (model=${MODEL_NAME}, category=${category}, httpStatus=${status ?? 'none'}, elapsedMs=${elapsedMs})`,
  );
}

function requestBody(input) {
  const { imageBase64, mimeType = 'image/jpeg', language = 'en', strictLanguage = false } = input;
  return {
    model: MODEL_NAME,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: skinIssuePrompt({ language, strictLanguage }) },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    reasoning_format: 'hidden',
    reasoning_effort: GROQ_POLICY.reasoningEffort,
    max_completion_tokens: GROQ_POLICY.maxCompletionTokens,
  };
}

/**
 * Backup skin-guidance provider with the same input and output as gemini.analyseSkinIssue: one
 * bounded attempt, no retries. Every failure (missing key, HTTP error, timeout, network, cut-off or
 * unparseable output) surfaces as GEMINI_UNAVAILABLE so callers treat it like any AI outage.
 */
async function analyseSkinIssue(input) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw geminiUnavailable(new Error('GROQ_API_KEY is not configured.'));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_POLICY.attemptTimeoutMs);
  const startedAt = Date.now();
  let payload;
  try {
    const response = await transport.fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(requestBody(input)),
      signal: controller.signal,
    });
    if (!response.ok) {
      logFailure(`http_${response.status}`, response.status, Date.now() - startedAt);
      throw geminiUnavailable(new Error(`Groq returned HTTP ${response.status}.`));
    }
    payload = await response.json();
  } catch (error) {
    if (error && error.code === 'GEMINI_UNAVAILABLE') {
      throw error;
    }
    logFailure(controller.signal.aborted ? 'timeout' : 'network', null, Date.now() - startedAt);
    throw geminiUnavailable(error);
  } finally {
    clearTimeout(timer);
  }

  try {
    const choice = payload && Array.isArray(payload.choices) ? payload.choices[0] : null;
    if (!choice || choice.finish_reason !== 'stop') {
      throw new Error('Groq did not finish its answer.');
    }
    return parseJsonContent(choice.message && choice.message.content);
  } catch (error) {
    console.warn(`Groq response was unusable (model=${MODEL_NAME}, category=unusable_response)`);
    throw geminiUnavailable(error);
  }
}

module.exports = {
  MODEL_NAME,
  GROQ_POLICY,
  transport,
  isConfigured,
  analyseSkinIssue,
};
