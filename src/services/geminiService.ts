import RNFS from 'react-native-fs';
import {
  analyseSkinIssueRemote,
  fetchDailyTip,
  fetchHerbalRecommendations,
} from './apiClient';
import {
  isGeminiUnavailable,
  offlineDailyTip,
  offlineHerbalRecommendations,
  offlineSkinIssue,
} from './offlineFallbacks';
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
  offline?: boolean;
}

export interface HerbRecommendation {
  name: string;
  emoji: string;
  benefit: string;
  usage: string;
}

export interface HerbalRecommendationResult {
  herbs: HerbRecommendation[];
  offline: boolean;
}

export interface DailyTipResult {
  tip: string;
  offline: boolean;
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
    try {
      const token = await requireToken();
      const imageBase64 = await imageUriToBase64(imageUri);
      const { analysis } = await analyseSkinIssueRemote(token, imageBase64);
      return { ...(analysis as SkinIssueResult), offline: false };
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        return { ...offlineSkinIssue(), offline: true };
      }
      throw error;
    }
  }

  async getHerbalRecommendations(
    condition: string,
    dosha?: string,
  ): Promise<HerbalRecommendationResult> {
    try {
      const token = await requireToken();
      const { herbs } = await fetchHerbalRecommendations(token, condition, dosha);
      return { herbs: herbs as HerbRecommendation[], offline: false };
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        return { herbs: offlineHerbalRecommendations(condition, dosha), offline: true };
      }
      throw error;
    }
  }

  async getDailyTip(dosha?: string): Promise<DailyTipResult> {
    try {
      const token = await requireToken();
      const { tip } = await fetchDailyTip(token, dosha);
      return { tip, offline: false };
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        return { tip: offlineDailyTip(dosha), offline: true };
      }
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
