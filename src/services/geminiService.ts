/**
 * GeminiService — HerbalClinic AI Engine
 * Uses @google/generative-ai to analyse skin images and provide
 * Ayurvedic herbal treatment recommendations.
 *
 * ⚠️  Add your Gemini API key to src/constants/config.ts before use.
 */

import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import RNFS from 'react-native-fs';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkinAnalysisType = 'type' | 'issue';

export interface SkinTypeResult {
  skinType: 'Oily' | 'Dry' | 'Combination' | 'Normal' | 'Unknown';
  confidence: number; // 0–100
  dosha: 'Vata' | 'Pitta' | 'Kapha' | 'Vata-Pitta' | 'Pitta-Kapha' | 'Vata-Kapha';
  description: string;
  characteristics: string[];
  recommendations: string[];
  herbs: HerbRecommendation[];
}

export interface SkinIssueResult {
  issue: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  confidence: number;
  description: string;
  causes: string[];
  herbs: HerbRecommendation[];
  lifestyle: string[];
  disclaimer: string;
}

export interface HerbRecommendation {
  name: string;
  emoji: string;
  benefit: string;
  usage: string;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SKIN_TYPE_PROMPT = `
You are an expert Ayurvedic skin analyst and dermatologist AI.
Analyze the skin in this image and provide a detailed JSON response.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "skinType": "Oily|Dry|Combination|Normal|Unknown",
  "confidence": <number 0-100>,
  "dosha": "Vata|Pitta|Kapha|Vata-Pitta|Pitta-Kapha|Vata-Kapha",
  "description": "<2-3 sentences about the skin type>",
  "characteristics": ["<trait1>", "<trait2>", "<trait3>"],
  "recommendations": ["<daily tip1>", "<daily tip2>", "<daily tip3>"],
  "herbs": [
    { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to use>" },
    { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to use>" },
    { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to use>" }
  ]
}
`;

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

// ─── Service Class ─────────────────────────────────────────────────────────────

class GeminiService {
  private client: GoogleGenerativeAI | null = null;
  private modelName = 'gemini-1.5-flash';

  /**
   * Initialize with your Gemini API key.
   */
  init(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  private getModel() {
    if (!this.client) {
      throw new Error(
        'GeminiService not initialized. Call geminiService.init(API_KEY) in App.tsx.',
      );
    }
    return this.client.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Convert a local file URI to a base64 data part for Gemini.
   */
  private async imageUriToPart(imageUri: string): Promise<Part> {
    // Strip file:// prefix if present
    const filePath = imageUri.replace('file://', '');
    const base64 = await RNFS.readFile(filePath, 'base64');
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64,
      },
    };
  }

  /**
   * Analyse skin type from an image URI.
   */
  async analyseSkinType(imageUri: string): Promise<SkinTypeResult> {
    const model = this.getModel();
    const imagePart = await this.imageUriToPart(imageUri);

    const result = await model.generateContent([SKIN_TYPE_PROMPT, imagePart]);
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps it
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as SkinTypeResult;
  }

  /**
   * Analyse skin issues from an image URI.
   */
  async analyseSkinIssue(imageUri: string): Promise<SkinIssueResult> {
    const model = this.getModel();
    const imagePart = await this.imageUriToPart(imageUri);

    const result = await model.generateContent([SKIN_ISSUE_PROMPT, imagePart]);
    const text = result.response.text().trim();

    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as SkinIssueResult;
  }

  /**
   * Get herbal treatment recommendations from a text description.
   */
  async getHerbalRecommendations(condition: string, dosha?: string): Promise<HerbRecommendation[]> {
    const model = this.getModel();
    const prompt = `
You are an Ayurvedic herbalist AI.
Provide 5 herbal remedies for "${condition}"${dosha ? ` for ${dosha} dosha` : ''}.

Return ONLY valid JSON array:
[
  { "name": "<herb>", "emoji": "<emoji>", "benefit": "<benefit>", "usage": "<how to prepare and use>" }
]
`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as HerbRecommendation[];
  }

  /**
   * Get a daily Ayurvedic wellness tip.
   */
  async getDailyTip(dosha?: string): Promise<string> {
    const model = this.getModel();
    const prompt = `Give one short, practical Ayurvedic wellness tip${dosha ? ` for ${dosha} dosha` : ''}. Return only the tip text, no quotes, no markdown, max 2 sentences.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}

// Singleton export
export const geminiService = new GeminiService();
export default geminiService;
