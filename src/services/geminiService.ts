import RNFS from 'react-native-fs';
import {
  analyseSkinIssueRemote,
  fetchDailyTip,
  fetchHerbalRecommendations,
} from './apiClient';
import { getSessionToken } from './sessionStorage';

export type SkinAnalysisType = 'type' | 'issue';

export interface SkinTypeResult {
  skinType: 'Oily' | 'Dry' | 'Combination' | 'Normal' | 'Unknown';
  confidence: number;
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

const requireToken = async (): Promise<string> => {
  const token = await getSessionToken();
  if (!token) {
    throw new Error('Please sign in again to run this analysis.');
  }
  return token;
};

const imageUriToBase64 = async (imageUri: string): Promise<string> => {
  const filePath = imageUri.replace('file://', '');
  return RNFS.readFile(filePath, 'base64');
};

class GeminiService {
  async analyseSkinIssue(imageUri: string): Promise<SkinIssueResult> {
    const token = await requireToken();
    const imageBase64 = await imageUriToBase64(imageUri);
    const { analysis } = await analyseSkinIssueRemote(token, imageBase64);
    return analysis as SkinIssueResult;
  }

  async getHerbalRecommendations(
    condition: string,
    dosha?: string,
  ): Promise<HerbRecommendation[]> {
    const token = await requireToken();
    const { herbs } = await fetchHerbalRecommendations(token, condition, dosha);
    return herbs as HerbRecommendation[];
  }

  async getDailyTip(dosha?: string): Promise<string> {
    const token = await requireToken();
    const { tip } = await fetchDailyTip(token, dosha);
    return tip;
  }
}

export const geminiService = new GeminiService();
export default geminiService;
