const { GoogleGenerativeAI } = require('@google/generative-ai');

const SKIN_ISSUE_PROMPT = `
You are an expert Ayurvedic dermatology AI assistant for an academic project.
Analyze the visible skin condition in this image and provide helpful information.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "issue": "<condition name e.g. Acne, Hyperpigmentation, Dryness, Rash, Eczema>",
  "severity": "Mild|Moderate|Severe",
  "confidence": <number 0-100>,
  "description": "<2-3 sentences describing the condition>",
  "causes": ["<cause1>", "<cause2>", "<cause3>"],
  "herbs": [
    { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to use>" },
    { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to use>" },
    { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to use>" }
  ],
  "lifestyle": ["<lifestyle tip1>", "<lifestyle tip2>", "<lifestyle tip3>"],
  "disclaimer": "This is an AI-powered analysis for educational purposes only. Please consult a dermatologist for medical advice."
}
`;

function getApiKey() {
  const key = String(process.env.GEMINI_API_KEY || '').trim();
  if (!key || key === 'your_gemini_api_key_here') {
    const error = new Error(
      'Gemini is not configured on the server. Set GEMINI_API_KEY in the server environment, then restart the API.',
    );
    error.status = 503;
    throw error;
  }
  return key;
}

function parseJsonContent(text) {
  const clean = String(text || '')
    .replace(/```json|```/g, '')
    .trim();
  return JSON.parse(clean);
}

async function analyseSkinIssue({ imageBase64, mimeType = 'image/jpeg' }) {
  const client = new GoogleGenerativeAI(getApiKey());
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    SKIN_ISSUE_PROMPT,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);
  return parseJsonContent(result.response.text());
}

async function getHerbalRecommendations(condition, dosha) {
  const client = new GoogleGenerativeAI(getApiKey());
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `
You are an Ayurvedic herbalist AI.
Provide 5 herbal remedies for "${condition}"${dosha ? ` for ${dosha} dosha` : ''}.

Return ONLY valid JSON array:
[
  { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to prepare and use>" }
]
`;
  const result = await model.generateContent(prompt);
  return parseJsonContent(result.response.text());
}

async function getDailyTip(dosha) {
  const client = new GoogleGenerativeAI(getApiKey());
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Give one short, practical Ayurvedic wellness tip${
    dosha ? ` for ${dosha} dosha` : ''
  }. Return only the tip text, no quotes, no markdown, max 2 sentences.`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = {
  analyseSkinIssue,
  getHerbalRecommendations,
  getDailyTip,
};
