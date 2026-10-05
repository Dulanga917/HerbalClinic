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
  offlineSkinGuidance,
} from './offlineFallbacks';
import { getSessionToken } from './sessionStorage';
import { parseSkinGuidance, SkinGuidanceResult } from '../utils/skinGuidance';

export type { SkinGuidanceResult } from '../utils/skinGuidance';

export type SkinAnalysisType = 'type' | 'issue';

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

const isHerbRecommendation = (value: unknown): value is HerbRecommendation => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const herb = value as Record<string, unknown>;
  return (
    typeof herb.name === 'string' &&
    herb.name.trim().length > 0 &&
    typeof herb.emoji === 'string' &&
    typeof herb.benefit === 'string' &&
    typeof herb.usage === 'string'
  );
};

class GeminiService {
  async analyseSkinIssue(imageUri: string): Promise<SkinGuidanceResult> {
    let analysis: unknown;
    try {
      const token = await requireToken();
      const imageBase64 = await imageUriToBase64(imageUri);
      ({ analysis } = await analyseSkinIssueRemote(token, imageBase64));
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        return offlineSkinGuidance();
      }
      throw error;
    }
    return parseSkinGuidance(analysis) ?? offlineSkinGuidance();
  }

  async getHerbalRecommendations(
    condition: string,
    dosha?: string,
  ): Promise<HerbalRecommendationResult> {
    try {
      const token = await requireToken();
      const { herbs } = await fetchHerbalRecommendations(token, condition, dosha);
      const valid = Array.isArray(herbs) ? herbs.filter(isHerbRecommendation) : [];
      if (valid.length === 0) {
        return { herbs: offlineHerbalRecommendations(condition, dosha), offline: true };
      }
      return { herbs: valid, offline: false };
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
      if (typeof tip !== 'string' || !tip.trim()) {
        return { tip: offlineDailyTip(dosha), offline: true };
      }
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
