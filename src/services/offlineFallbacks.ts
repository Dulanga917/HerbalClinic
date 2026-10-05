import { DOSHAS, HERBS, SKIN_ISSUES } from '../constants/ayurveda';

type HerbRecommendation = {
  name: string;
  emoji: string;
  benefit: string;
  usage: string;
};

type SkinIssueResult = {
  issue: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  confidence: number;
  description: string;
  causes: string[];
  herbs: HerbRecommendation[];
  lifestyle: string[];
  disclaimer: string;
};

const herbToRecommendation = (herb: (typeof HERBS)[keyof typeof HERBS]): HerbRecommendation => ({
  name: herb.name,
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

export const offlineSkinIssue = (): SkinIssueResult => ({
  issue: 'General skin-care guidance',
  severity: 'Mild',
  confidence: 0,
  description:
    'Gemini is not available on the server, so this is static Ayurvedic guidance. It is not an analysis of your photo.',
  causes: [
    'Dosha imbalance from diet, sleep, or climate',
    'Harsh products or too much sun',
    'Dehydration and stress',
  ],
  herbs: [HERBS.aloeVera, HERBS.turmeric, HERBS.neem].map(herbToRecommendation),
  lifestyle: [
    DOSHAS.vata.lifestyle[0],
    DOSHAS.pitta.lifestyle[0],
    DOSHAS.kapha.lifestyle[0],
  ],
  disclaimer:
    'Offline herbal guidance only. This is not a medical diagnosis. Consult a qualified clinician for skin conditions.',
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
  const message = error instanceof Error ? error.message : String(error);
  return /Gemini is not configured|API_KEY_INVALID|API key not valid|Could not reach the HerbalClinic API|unavailable|502|503/i.test(
    message,
  );
};
