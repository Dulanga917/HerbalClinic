import { resolveSupportedDoshaKey } from './doshaGuidance';

type HomeUser = {
  name?: string | null;
  dosha?: string | null;
} | null;

export const homeDoshaState = (user: HomeUser) => {
  const firstName = user?.name?.trim().split(/\s+/)[0] || '';
  const supportedKey = resolveSupportedDoshaKey(user?.dosha);
  const rawDosha = user?.dosha?.trim() || '';

  return {
    greeting: firstName ? `Welcome, ${firstName}` : 'Welcome',
    hasDosha: Boolean(supportedKey || rawDosha),
    doshaLabel: supportedKey ? rawDosha.toUpperCase() : rawDosha || 'Not assessed yet',
    subtitle: supportedKey || rawDosha
      ? 'Personalized care based on your latest assessment'
      : 'Complete a Skin Type Assessment to see your Dosha',
  };
};
