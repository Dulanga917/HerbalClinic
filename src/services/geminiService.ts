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
import type { Language } from '../i18n/types';

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
  async analyseSkinIssue(imageUri: string, language: Language = 'en'): Promise<SkinGuidanceResult> {
    let analysis: unknown;
    try {
      const token = await requireToken();
      const imageBase64 = await imageUriToBase64(imageUri);
      ({ analysis } = await analyseSkinIssueRemote(token, imageBase64, undefined, language));
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        return offlineSkinGuidance(language);
      }
      throw error;
    }
    return parseSkinGuidance(analysis) ?? offlineSkinGuidance(language);
  }

  async getHerbalRecommendations(
    condition: string,
    dosha?: string,
    language: Language = 'en',
  ): Promise<HerbalRecommendationResult> {
    const offline = () => ({
      herbs: offlineHerbalRecommendations(condition, dosha, language),
      offline: true,
    });
    try {
      const token = await requireToken();
      const { herbs } = await fetchHerbalRecommendations(token, condition, dosha, language);
      const valid = Array.isArray(herbs) ? herbs.filter(isHerbRecommendation) : [];
      if (valid.length === 0) {
        return offline();
      }
      return { herbs: valid, offline: false };
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        return offline();
      }
      throw error;
    }
  }

  async getDailyTip(dosha?: string, language: Language = 'en'): Promise<DailyTipResult> {
    try {
      const token = await requireToken();
      const { tip } = await fetchDailyTip(token, dosha, language);
      if (typeof tip !== 'string' || !tip.trim()) {
        return { tip: offlineDailyTip(dosha, language), offline: true };
      }
      return { tip, offline: false };
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        return { tip: offlineDailyTip(dosha, language), offline: true };
      }
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
