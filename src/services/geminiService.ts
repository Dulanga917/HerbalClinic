import RNFS from 'react-native-fs';
import {
  analyseSkinIssueRemote,
  ApiError,
  checkSkinImageRemote,
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
import {
  fieldsNotInLanguage,
  parseSkinGuidance,
  SkinGuidanceResult,
  withVerifiedHerbNames,
} from '../utils/skinGuidance';
import {
  IMAGE_REJECTED,
  ImageCheck,
  ImageCheckUnavailableError,
  ImageRejectedError,
  parseImageCheck,
  rejectionFromResponse,
} from '../utils/imageCheck';
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

const isImageRejection = (error: unknown): error is ApiError =>
  error instanceof ApiError && error.code === IMAGE_REJECTED;

class GeminiService {
  /**
   * Server-side content check for Skin Type Assessment. Resolves only for a valid photo; throws
   * `ImageRejectedError` for an unsuitable one and `ImageCheckUnavailableError` when it cannot be checked.
   */
  async checkSkinTypePhoto(imageUri: string): Promise<ImageCheck> {
    const token = await requireToken();
    const imageBase64 = await imageUriToBase64(imageUri);
    let response: { imageCheck: unknown };
    try {
      response = await checkSkinImageRemote(token, imageBase64);
    } catch (error) {
      if (isGeminiUnavailable(error)) {
        throw new ImageCheckUnavailableError();
      }
      throw error;
    }
    const imageCheck = parseImageCheck(response.imageCheck);
    if (!imageCheck) {
      throw new ImageCheckUnavailableError();
    }
    if (!imageCheck.isValid) {
      throw new ImageRejectedError(imageCheck);
    }
    return imageCheck;
  }

  async analyseSkinIssue(imageUri: string, language: Language = 'en'): Promise<SkinGuidanceResult> {
    let analysis: unknown;
    let rawCheck: unknown;
    try {
      const token = await requireToken();
      const imageBase64 = await imageUriToBase64(imageUri);
      ({ analysis, imageCheck: rawCheck } = await analyseSkinIssueRemote(token, imageBase64, undefined, language));
    } catch (error) {
      if (isImageRejection(error)) {
        throw rejectionFromResponse(error.imageCheck);
      }
      if (isGeminiUnavailable(error)) {
        return offlineSkinGuidance(language);
      }
      throw error;
    }
    // Live guidance is shown only for a photo the server confirmed shows human skin.
    const imageCheck = parseImageCheck(rawCheck);
    if (!imageCheck) {
      return offlineSkinGuidance(language);
    }
    if (!imageCheck.isValid) {
      throw new ImageRejectedError(imageCheck);
    }
    const guidance = parseSkinGuidance(analysis);
    // Text in the wrong language is never shown as localized live guidance.
    if (!guidance || fieldsNotInLanguage(guidance, language).length > 0) {
      return offlineSkinGuidance(language);
    }
    return { ...withVerifiedHerbNames(guidance, language), language };
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
