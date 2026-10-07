import { resolveSupportedDoshaKey } from './doshaGuidance';
import { doshaLabel } from '../i18n/content';
import { translate } from '../i18n/translate';
import type { Language } from '../i18n/types';

type HomeUser = {
  name?: string | null;
  dosha?: string | null;
} | null;

export const homeDoshaState = (user: HomeUser, language: Language = 'en') => {
  const firstName = user?.name?.trim().split(/\s+/)[0] || '';
  const supportedKey = resolveSupportedDoshaKey(user?.dosha);
  const rawDosha = user?.dosha?.trim() || '';
  const hasDosha = Boolean(supportedKey || rawDosha);

  let label = rawDosha || translate(language, 'home.notAssessed');
  if (supportedKey) {
    label = language === 'en' ? rawDosha.toUpperCase() : doshaLabel(rawDosha, language);
  }

  return {
    greeting: firstName
      ? translate(language, 'home.welcomeName', { name: firstName })
      : translate(language, 'home.welcome'),
    hasDosha,
    doshaLabel: label,
    subtitle: translate(language, hasDosha ? 'home.doshaSubtitleHas' : 'home.doshaSubtitleNone'),
  };
};
