import { DOSHAS, HERBS, SKIN_ISSUES } from '../constants/ayurveda';
import { API_UNREACHABLE, GEMINI_UNAVAILABLE } from './apiClient';
import type { OfflineSkinGuidance } from '../utils/skinGuidance';
import { herbDisplayName, localizeDosha, localizeHerb } from '../i18n/content';
import { translate } from '../i18n/translate';
import type { Language } from '../i18n/types';

type HerbRecommendation = {
  name: string;
  emoji: string;
  benefit: string;
  usage: string;
};

const herbToRecommendation = (
  herb: (typeof HERBS)[keyof typeof HERBS],
  language: Language,
): HerbRecommendation => {
  const localized = localizeHerb(herb, language);
  return {
    name: herbDisplayName(herb, language),
    emoji: herb.emoji,
    benefit: localized.benefits[0] || localized.description,
    usage: localized.usage,
  };
};

const herbsForCondition = (
  condition: string,
  dosha: string | undefined,
  language: Language,
): HerbRecommendation[] => {
  const needle = condition.toLowerCase();
  const issue = Object.values(SKIN_ISSUES).find(
    item => item.id === needle || item.name.toLowerCase().includes(needle) || needle.includes(item.id),
  );
  const toRecommendation = (herb: (typeof HERBS)[keyof typeof HERBS]) =>
    herbToRecommendation(herb, language);

  if (issue) {
    return issue.herbs
      .map(id => HERBS[id as keyof typeof HERBS])
      .filter(Boolean)
      .map(toRecommendation);
  }

  const doshaKey = String(dosha || '').toLowerCase().split('-')[0];
  const matched = Object.values(HERBS).filter(herb =>
    doshaKey ? herb.doshas.includes(doshaKey) : true,
  );
  return (matched.length ? matched : Object.values(HERBS)).slice(0, 5).map(toRecommendation);
};

export const offlineSkinGuidance = (language: Language = 'en'): OfflineSkinGuidance => ({
  kind: 'offline',
  summary: translate(language, 'offline.skin.summary'),
  tips: [
    translate(language, 'offline.skin.cleanser'),
    translate(language, 'offline.skin.sun'),
    localizeDosha(DOSHAS.vata, language).lifestyle[0],
    localizeDosha(DOSHAS.pitta, language).lifestyle[0],
    localizeDosha(DOSHAS.kapha, language).lifestyle[0],
  ],
  herbs: [HERBS.aloeVera, HERBS.turmeric, HERBS.neem].map(herb =>
    herbToRecommendation(herb, language),
  ),
});

export const offlineHerbalRecommendations = (
  condition: string,
  dosha?: string,
  language: Language = 'en',
): HerbRecommendation[] => herbsForCondition(condition, dosha, language);

export const offlineDailyTip = (dosha?: string, language: Language = 'en'): string => {
  const key = String(dosha || '').toLowerCase().split('-')[0];
  if (key === 'vata') {
    return translate(language, 'offline.tip.vata');
  }
  if (key === 'pitta') {
    return translate(language, 'offline.tip.pitta');
  }
  if (key === 'kapha') {
    return translate(language, 'offline.tip.kapha');
  }
  return translate(language, 'offline.tip.general');
};

export const isGeminiUnavailable = (error: unknown): boolean => {
  const code =
    typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  return code === GEMINI_UNAVAILABLE || code === API_UNREACHABLE;
};
