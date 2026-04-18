// src/services/geminiService.ts
// Updated with working Gemini models as of March 2026

const API_KEY  = 'AIzaSyBauwHZgPrOVPGz5rd5_2iTQhvFGAzs1n0';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';


const MODEL = 'gemini-pro';
async function callGemini(prompt: string): Promise<string> {
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };

  try {
    console.log('🔄 Calling Gemini API...', { model: MODEL });

    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('❌ Gemini API Error:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData,
        url: url.replace(API_KEY, 'API_KEY_HIDDEN'),
      });

      if (res.status === 429) {
        throw new Error('❌ API quota exceeded (1,500 requests/day limit). Get your own key at: aistudio.google.com');
      } else if (res.status === 401 || res.status === 403) {
        throw new Error('❌ Invalid API key. Check your key at: aistudio.google.com');
      } else if (res.status === 404) {
        throw new Error('❌ Model not found. Try changing MODEL to "gemini-pro" in geminiService.ts line 10');
      } else if (res.status === 400) {
        throw new Error(`❌ Bad request: ${JSON.stringify(errorData)}`);
      } else {
        throw new Error(`❌ API error ${res.status}: ${res.statusText}`);
      }
    }
    
    const data = await res.json();
    console.log(' Gemini response received');
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.';
  } catch (error: any) {
    console.error('❌ Gemini API Call Failed:', error.message || error);
    throw error;
  }
}

async function callGeminiVision(prompt: string, base64Image: string, mimeType = 'image/jpeg'): Promise<string> {
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Image } },
      ],
    }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
  };

  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Gemini Vision API error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.';
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

  const raw = await callGeminiVision(prompt, base64Image);


  const get = (key: string) => {
    const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z]+:|$)`));
    return match?.[1]?.trim() ?? 'Analysis not available';
  };

  return {
    conditions: get('CONDITIONS'),
    dosha:      get('DOSHA'),
    severity:   get('SEVERITY'),
    herbs:      get('HERBS'),
    routine:    get('ROUTINE'),
  };
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

  return callGemini(prompt);
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

  return callGemini(prompt);
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
    .map((a, i) => `Q${i+1}: ${a.question}\nAnswer: ${a.answer}`)
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

  const get     = (key: string) => raw.match(new RegExp(`${key}:\\s*([^\\n]+)`))?.[1]?.trim() ?? '';
  const getNum  = (key: string) => parseInt(get(key)) || 0;
  const getLong = (key: string) => {
    const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`));
    return match?.[1]?.trim() ?? '';
  };

  return {
    dosha:       get('DOSHA') as string || 'Vata',
    score: {
      vata:  getNum('VATA_SCORE'),
      pitta: getNum('PITTA_SCORE'),
      kapha: getNum('KAPHA_SCORE'),
    },
    explanation: getLong('EXPLANATION'),
    skinCare:    getLong('SKIN_CARE'),
    meditation:  getLong('MEDITATION'),
  };
}


export async function getSriLankanAyurvedicTreatment(params: {
  category:    string;
  answers:     { question: string; answer: string }[];
  symptoms:    string;
  language:    'en' | 'si';
}): Promise<{
  diagnosis:   string;
  herbs:       string;
  preparation: string;
  lifestyle:   string;
  diet:        string;
  warning:     string;
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

  const raw = await callGemini(prompt);

  const getLong = (key: string) => {
    const match = raw.match(new RegExp(`${key}:\\s*([\\s\\S]*?)(?=\\n[A-Z]+:|$)`));
    return match?.[1]?.trim() ?? '';
  };

  return {
    diagnosis:   getLong('DIAGNOSIS'),
    herbs:       getLong('HERBS'),
    preparation: getLong('PREPARATION'),
    lifestyle:   getLong('LIFESTYLE'),
    diet:        getLong('DIET'),
    warning:     getLong('WARNING'),
  };
}