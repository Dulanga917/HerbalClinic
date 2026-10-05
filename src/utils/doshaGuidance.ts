import { DOSHAS, HERBS, MEDITATION_SESSIONS } from '../constants/ayurveda';

export type SupportedDoshaKey = 'vata' | 'pitta' | 'kapha';

const MEDITATION_BY_DOSHA: Record<SupportedDoshaKey, string> = {
  vata: 'vata_grounding',
  pitta: 'pranayama_basic',
  kapha: 'body_scan',
};

export const resolveSupportedDoshaKey = (dosha?: string | null): SupportedDoshaKey | null => {
  const key = String(dosha || '')
    .trim()
    .toLowerCase()
    .split('-')[0];

  if (key === 'vata' || key === 'pitta' || key === 'kapha') {
    return key;
  }

  return null;
};

export const getDoshaGuidance = (dosha?: string | null) => {
  const key = resolveSupportedDoshaKey(dosha);
  if (!key) {
    return null;
  }

  const profile = DOSHAS[key];
  const herbs = Object.values(HERBS).filter(herb => herb.doshas.includes(key));
  const meditation =
    MEDITATION_SESSIONS.find(session => session.id === MEDITATION_BY_DOSHA[key]) ||
    MEDITATION_SESSIONS[0];

  return {
    key,
    name: profile.name,
    emoji: profile.emoji,
    explanation: `${profile.skinType}. ${profile.characteristics.slice(0, 2).join('. ')}.`,
    skincare: profile.balancedSigns,
    herbs,
    lifestyle: [...profile.lifestyle, ...profile.diet.slice(0, 2)],
    meditation,
  };
};
