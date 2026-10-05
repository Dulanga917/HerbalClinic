const { GoogleGenerativeAI } = require('@google/generative-ai');
const { geminiUnavailable } = require('./aiGuidance');

const MODEL_NAME = 'gemini-2.5-flash';

const SKIN_ISSUE_PROMPT = `
You support an academic Ayurvedic wellness app. You are not a doctor or dermatologist and you must not diagnose.
Look at the photo and give general, informational Ayurvedic skincare guidance only.

Rules:
- Do not name a disease and do not give a diagnosis. Describe at most one possible visible skin concern in plain everyday words (for example "visible dryness" or "uneven tone").
- Do not give severity ratings, grades, percentages, probabilities, or confidence scores.
- If the photo is unclear, does not show skin, or you cannot tell, use "unable_to_assess".
- If no clear concern is visible, use "no_clear_concern".
- Keep suggestions gentle and general. No prescription medicines and no dosages.
- If something could need professional care (pain, bleeding, spreading, or lasting changes), say in selfCare that a qualified healthcare professional should be consulted.

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
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

// Any provider-side failure (bad or revoked key, quota, outage, network, blocked or
// unparseable output) means the photo was not analysed, so the client should fall back.
async function callGemini(request, readResponse) {
  const apiKey = getApiKey();
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(request);
    return readResponse(result.response.text());
  } catch (error) {
    throw geminiUnavailable(error);
  }
}

async function analyseSkinIssue({ imageBase64, mimeType = 'image/jpeg' }) {
  return callGemini(
    [
      SKIN_ISSUE_PROMPT,
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ],
    parseJsonContent,
  );
}

async function getHerbalRecommendations(condition, dosha) {
  const prompt = `
You are an Ayurvedic herbalist AI.
Provide 5 herbal remedies for "${condition}"${dosha ? ` for ${dosha} dosha` : ''}.

Return ONLY valid JSON array:
[
  { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to prepare and use>" }
]
`;
  return callGemini(prompt, parseJsonContent);
}

async function getDailyTip(dosha) {
  const prompt = `Give one short, practical Ayurvedic wellness tip${
    dosha ? ` for ${dosha} dosha` : ''
  }. Return only the tip text, no quotes, no markdown, max 2 sentences.`;
  return callGemini(prompt, text => String(text || '').trim());
}

module.exports = {
  SKIN_ISSUE_PROMPT,
  analyseSkinIssue,
  getHerbalRecommendations,
  getDailyTip,
};
