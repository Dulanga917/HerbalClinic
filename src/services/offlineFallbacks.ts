import { DOSHAS, HERBS, SKIN_ISSUES } from '../constants/ayurveda';
import { API_UNREACHABLE, GEMINI_UNAVAILABLE } from './apiClient';
import type { OfflineSkinGuidance } from '../utils/skinGuidance';
import { herbDisplayName } from '../utils/herbLibrary';

type HerbRecommendation = {
  name: string;
  emoji: string;
  benefit: string;
  usage: string;
};

const herbToRecommendation = (herb: (typeof HERBS)[keyof typeof HERBS]): HerbRecommendation => ({
  name: herbDisplayName(herb),
  emoji: herb.emoji,
  benefit: herb.benefits[0] || herb.description,
  usage: herb.usage,
});

const herbsForCondition = (condition: string, dosha?: string): HerbRecommendation[] => {
  const needle = condition.toLowerCase();
  const issue = Object.values(SKIN_ISSUES).find(
    item => item.id === needle || item.name.toLowerCase().includes(needle) || needle.includes(item.id),
  );

  if (issue) {
    return issue.herbs
      .map(id => HERBS[id as keyof typeof HERBS])
      .filter(Boolean)
      .map(herbToRecommendation);
  }

  const doshaKey = String(dosha || '').toLowerCase().split('-')[0];
  const matched = Object.values(HERBS).filter(herb =>
    doshaKey ? herb.doshas.includes(doshaKey) : true,
  );
  return (matched.length ? matched : Object.values(HERBS)).slice(0, 5).map(herbToRecommendation);
};

export const offlineSkinGuidance = (): OfflineSkinGuidance => ({
  kind: 'offline',
  summary:
    'AI guidance is unavailable right now, so your photo was not analysed. The tips below are general Ayurvedic skincare guidance and are the same for everyone.',
  tips: [
    'Use a gentle cleanser and lukewarm water; avoid harsh scrubs.',
    'Protect your skin from strong sun and stay well hydrated.',
    DOSHAS.vata.lifestyle[0],
    DOSHAS.pitta.lifestyle[0],
    DOSHAS.kapha.lifestyle[0],
  ],
  herbs: [HERBS.aloeVera, HERBS.turmeric, HERBS.neem].map(herbToRecommendation),
});

export const offlineHerbalRecommendations = (
  condition: string,
  dosha?: string,
): HerbRecommendation[] => herbsForCondition(condition, dosha);

export const offlineDailyTip = (dosha?: string): string => {
  const key = String(dosha || '').toLowerCase().split('-')[0];
  if (key === 'vata') {
    return `${DOSHAS.vata.lifestyle[2]}. Sip warm water and choose ${DOSHAS.vata.diet[0].toLowerCase()}.`;
  }
  if (key === 'pitta') {
    return `${DOSHAS.pitta.lifestyle[2]}. Favor ${DOSHAS.pitta.diet[0].toLowerCase()} and avoid excess heat.`;
  }
  if (key === 'kapha') {
    return `${DOSHAS.kapha.lifestyle[0]}. Keep meals light and warm.`;
  }
  return 'Start the day with warm water and a simple herbal routine. This tip is local guidance, not a Gemini response.';
};

export const isGeminiUnavailable = (error: unknown): boolean => {
  const code =
    typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  return code === GEMINI_UNAVAILABLE || code === API_UNREACHABLE;
};
