import { HERBS } from '../constants/ayurveda';

export type HerbRecord = (typeof HERBS)[keyof typeof HERBS];
export type HerbDoshaFilter = 'all' | 'vata' | 'pitta' | 'kapha';

export const listHerbs = (): HerbRecord[] => Object.values(HERBS);

/** English name with the Sinhala common name in parentheses, e.g. "Turmeric (කහ)". */
export const herbDisplayName = (herb: Pick<HerbRecord, 'name' | 'sinhala'>): string =>
  herb.sinhala ? `${herb.name} (${herb.sinhala})` : herb.name;

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
      herb.sinhala ?? '',
      herb.botanical,
      herb.description,
      ...herb.benefits,
      ...herb.skinIssues,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(needle);
  });
};
