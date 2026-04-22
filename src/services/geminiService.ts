// src/services/geminiService.ts
// Updated with working Gemini models as of March 2026
import { getFallbackChat, getFallbackHerbs, getFallbackTreatment, getFallbackSkinAnalysis } from './offlineFallbacks';

const API_KEY = 'AIzaSyDYMSxKuAp2vQroH255Qe9cIDqQiR-7dk0';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// Primary model: gemini-2.0-flash (best free-tier model as of 2026)
// Fallback model: gemini-2.0-flash-lite (lighter, higher quota)
const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];

async function callGeminiWithModel(prompt: string, model: string): Promise<string> {
  const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const status = res.status;
    if (status === 429) throw Object.assign(new Error('QUOTA'), { code: 429 });
    if (status === 401 || status === 403) throw new Error('Invalid API key. Please get a new key at aistudio.google.com');
    if (status === 404) throw Object.assign(new Error('MODEL_NOT_FOUND'), { code: 404 });
    throw new Error(`API error ${status}: ${JSON.stringify(errorData)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.';
}

async function callGemini(prompt: string): Promise<string> {
  let lastError: any;
  for (const model of MODELS) {
    try {
      console.log(`🔄 Trying model: ${model}`);
      const result = await callGeminiWithModel(prompt, model);
      console.log(`✅ Success with model: ${model}`);
      return result;
    } catch (err: any) {
      console.warn(`⚠️ Model ${model} failed:`, err.message);
      lastError = err;
      // Only retry next model on quota/not-found errors
      if (err.code !== 429 && err.code !== 404) break;
    }
  }
  // Provide clearer error messages
  if (lastError?.code === 429) {
    throw new Error('API quota exceeded. The free-tier daily limit has been reached. Please wait a few minutes and try again, or use a new API key from aistudio.google.com');
  }
  throw lastError;
}

async function callGeminiVision(prompt: string, base64Image: string, mimeType = 'image/jpeg'): Promise<string> {
  let lastError: any;
  for (const model of MODELS) {
    try {
      const url  = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
      const body = {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
      };
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const status = res.status;
        if (status === 429) throw Object.assign(new Error('QUOTA'), { code: 429 });
        if (status === 404) throw Object.assign(new Error('MODEL_NOT_FOUND'), { code: 404 });
        throw new Error(`Vision API error: ${status}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.';
    } catch (err: any) {
      lastError = err;
      if (err.code !== 429 && err.code !== 404) break;
    }
  }
  throw lastError;
}



export async function analyzeSkinFromPhoto(base64Image: string): Promise<{
  conditions: string;
  dosha: string;
  severity: string;
  herbs: string;
  routine: string;
}> {
  const prompt = `You are an expert Ayurvedic dermatologist. Analyze this facial photo and provide:

1. SKIN CONDITIONS: List visible skin conditions (acne, dryness, oiliness, redness, pigmentation, etc.)
2. AYURVEDIC DOSHA: Based on skin appearance, identify the dominant dosha (Vata/Pitta/Kapha) and explain why
3. SEVERITY: Rate overall skin concern as Mild / Moderate / Severe
4. HERBAL REMEDIES: Recommend 3 specific Ayurvedic herbs with how to use them
5. DAILY ROUTINE: Give a simple 3-step Ayurvedic skincare routine

Format your response EXACTLY like this:
CONDITIONS: [your answer]
DOSHA: [your answer]
SEVERITY: [your answer]
HERBS: [your answer]
ROUTINE: [your answer]

Be concise, specific, and helpful. Focus on natural Ayurvedic solutions.`;

  try {
    const raw = await callGeminiVision(prompt, base64Image);
    const get = (key: string) => {
      const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z]+:|$)`));
      return match?.[1]?.trim() ?? 'Analysis not available';
    };
    return {
      conditions: get('CONDITIONS'),
      dosha: get('DOSHA'),
      severity: get('SEVERITY'),
      herbs: get('HERBS'),
      routine: get('ROUTINE'),
    };
  } catch (e) {
    console.warn('⚠️ API failed, using offline skin analysis fallback');
    return getFallbackSkinAnalysis();
  }
}


export async function getHerbRecommendations(params: {
  dosha: string;
  skinConcerns: string[];
  stressLevel: number;
}): Promise<string> {
  const { dosha, skinConcerns, stressLevel } = params;
  const prompt = `You are an expert Ayurvedic herbalist. A patient has:
- Ayurvedic Dosha: ${dosha || 'Unknown'}
- Skin Concerns: ${skinConcerns.join(', ') || 'General skin health'}
- Stress Level: ${stressLevel}/10

Recommend exactly 4 Ayurvedic herbs personalized for this patient. For each herb provide:
- Name and Sanskrit name
- Why it specifically helps this patient's dosha and concerns
- Simple preparation method (face pack, tea, oil, etc.)
- Best time to use

Keep each herb recommendation to 3-4 sentences. Be practical and specific.`;

  try {
    return await callGemini(prompt);
  } catch (e) {
    console.warn('⚠️ API failed, using offline herb recommendations');
    return getFallbackHerbs(dosha || 'Pitta', skinConcerns);
  }
}


export async function chatWithHerbalAI(
  userMessage: string,
  chatHistory: { role: 'user' | 'ai'; text: string }[],
  userDosha?: string,
): Promise<string> {

  const historyText = chatHistory
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Patient' : 'HerbalClinic AI'}: ${m.text}`)
    .join('\n');

  const prompt = `You are HerbalClinic AI, a friendly expert in Ayurvedic skin care and herbal medicine. 
You help users understand their skin concerns and recommend natural herbal solutions.
${userDosha ? `The patient's Ayurvedic dosha is ${userDosha}.` : ''}

Previous conversation:
${historyText}

Patient's new message: "${userMessage}"

Respond as HerbalClinic AI. Be:
- Warm and supportive
- Specific with herbal recommendations  
- Brief (2-4 sentences max)
- Always suggest consulting a doctor for serious conditions
- Focus on Ayurvedic and natural solutions`;

  try {
    return await callGemini(prompt);
  } catch (e) {
    console.warn('⚠️ API failed, using offline chat fallback');
    return getFallbackChat(userMessage);
  }
}


export async function detectDoshaWithAI(answers: {
  question: string;
  answer: string;
}[]): Promise<{
  dosha: string;
  score: { vata: number; pitta: number; kapha: number };
  explanation: string;
  skinCare: string;
  meditation: string;
}> {
  const answerText = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nAnswer: ${a.answer}`)
    .join('\n\n');

  const prompt = `You are an expert Ayurvedic practitioner. Based on these answers, determine the patient's Ayurvedic dosha for skin health:

${answerText}

Analyze and respond EXACTLY in this format:
DOSHA: [Vata OR Pitta OR Kapha]
VATA_SCORE: [0-100]
PITTA_SCORE: [0-100]
KAPHA_SCORE: [0-100]
EXPLANATION: [2-3 sentences explaining why this dosha was identified based on the answers]
SKIN_CARE: [2-3 specific Ayurvedic skincare tips for this dosha]
MEDITATION: [1 specific meditation or breathing practice for this dosha]`;

  const raw = await callGemini(prompt);

  const get = (key: string) => raw.match(new RegExp(`${key}:\\s*([^\\n]+)`))?.[1]?.trim() ?? '';
  const getNum = (key: string) => parseInt(get(key)) || 0;
  const getLong = (key: string) => {
    const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
    return match?.[1]?.trim() ?? '';
  };

  return {
    dosha: get('DOSHA') as string || 'Vata',
    score: {
      vata: getNum('VATA_SCORE'),
      pitta: getNum('PITTA_SCORE'),
      kapha: getNum('KAPHA_SCORE'),
    },
    explanation: getLong('EXPLANATION'),
    skinCare: getLong('SKIN_CARE'),
    meditation: getLong('MEDITATION'),
  };
}


export async function getSriLankanAyurvedicTreatment(params: {
  category: string;
  answers: { question: string; answer: string }[];
  symptoms: string;
  language: 'en' | 'si';
}): Promise<{
  diagnosis: string;
  herbs: string;
  preparation: string;
  lifestyle: string;
  diet: string;
  warning: string;
}> {
  const { category, answers, symptoms, language } = params;

  const answerText = answers
    .map(a => `- ${a.question}: ${a.answer}`)
    .join('\n');

  const isSinhala = language === 'si';

  const prompt = `You are an expert Sri Lankan Ayurvedic physician (Ayurveda Vaidya) with deep knowledge of traditional Sri Lankan herbal medicine (Deshiya Chikitsa).

Patient category: ${category}
Patient answers:
${answerText}
Additional symptoms: ${symptoms || 'None mentioned'}

${isSinhala
      ? `Please provide a complete Sri Lankan Ayurvedic treatment plan in SINHALA language. Use traditional Sri Lankan herb names (both Sinhala and scientific names).`
      : `Please provide a complete Sri Lankan Ayurvedic treatment plan in ENGLISH. Include traditional Sri Lankan herb names with their Sinhala names in brackets.`
    }

Focus ONLY on:
- Traditional Sri Lankan Ayurvedic herbs (like Kohomba, Ranawara, Iramusu, Beli, Neem, Turmeric/Kaha, Gotukola, Polpala, Hathawariya etc.)
- Traditional Sri Lankan remedies passed down through generations
- Natural preparations that can be made at home in Sri Lanka
- Sri Lankan dietary advice based on local foods

Respond EXACTLY in this format:
DIAGNOSIS: [2-3 sentences about the condition based on Sri Lankan Ayurveda]
HERBS: [List 3-4 specific Sri Lankan herbs with Sinhala names and why they help]
PREPARATION: [Step by step how to prepare the herbal remedy at home]
LIFESTYLE: [3-4 daily lifestyle tips based on Sri Lankan Ayurvedic tradition]
DIET: [Specific Sri Lankan foods to eat and avoid]
WARNING: [When to see a doctor - important safety note]`;

  try {
    const raw = await callGemini(prompt);
    const getLong = (key: string) => {
      const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z]+:|$)`));
      return match?.[1]?.trim() ?? '';
    };
    return {
      diagnosis: getLong('DIAGNOSIS'),
      herbs: getLong('HERBS'),
      preparation: getLong('PREPARATION'),
      lifestyle: getLong('LIFESTYLE'),
      diet: getLong('DIET'),
      warning: getLong('WARNING'),
    };
  } catch (e) {
    console.warn('⚠️ API failed, using offline Ayurvedic treatment fallback');
    return getFallbackTreatment(category, language);
  }
}