import { HERBS } from '../constants/ayurveda';

export type HerbRecord = (typeof HERBS)[keyof typeof HERBS];
export type HerbDoshaFilter = 'all' | 'vata' | 'pitta' | 'kapha';

export const listHerbs = (): HerbRecord[] => Object.values(HERBS);

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

    const haystack = [
      herb.name,
      herb.sanskrit,
      herb.description,
      ...herb.benefits,
      ...herb.skinIssues,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
};
