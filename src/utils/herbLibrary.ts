import { HERBS } from '../constants/ayurveda';
import { localizeHerb } from '../i18n/content';

export { herbAlternateName, herbDisplayName } from '../i18n/content';

export type HerbRecord = (typeof HERBS)[keyof typeof HERBS];
export type HerbDoshaFilter = 'all' | 'vata' | 'pitta' | 'kapha';

export const listHerbs = (): HerbRecord[] => Object.values(HERBS);

/** Matches English and Sinhala names and text, whichever language the app is showing. */
export const filterHerbs = (
  herbs: readonly HerbRecord[],
  query: string,
  dosha: HerbDoshaFilter,
): HerbRecord[] => {
  const needle = query.trim().toLowerCase();

  return herbs.filter(herb => {
    const doshaMatches = dosha === 'all' || herb.doshas.includes(dosha);
    if (!doshaMatches) {
      return false;
    }
    if (!needle) {
      return true;
    }

    const sinhala = localizeHerb(herb, 'si');
    const haystack = [
      herb.name,
      herb.sinhala ?? '',
      herb.botanical,
      herb.description,
      ...herb.benefits,
      ...herb.skinIssues,
      sinhala.description,
      ...sinhala.benefits,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
};
