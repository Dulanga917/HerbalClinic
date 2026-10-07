import { describe, expect, it } from '@jest/globals';
import { filterHerbs, herbDisplayName, listHerbs } from '../src/utils/herbLibrary';
import { offlineHerbalRecommendations } from '../src/services/offlineFallbacks';

const DEVANAGARI = /[\u0900-\u097F]/;

describe('herb library', () => {
  const herbs = listHerbs();

  it('shows English names with verified Sinhala common names', () => {
    expect(Object.fromEntries(herbs.map(herb => [herb.id, herbDisplayName(herb)]))).toEqual({
      turmeric: 'Turmeric (කහ)',
      neem: 'Neem (කොහොඹ)',
      aloeVera: 'Aloe Vera (කෝමාරිකා)',
      sandalwood: 'Sandalwood (සුදු හඳුන්)',
      manjistha: 'Manjistha (වැල්මදට)',
      licorice: 'Licorice Root (වැල්මී)',
      ashwagandha: 'Ashwagandha (අමුක්කරා)',
      jojoba: 'Jojoba Oil',
    });
  });

  it('contains no Devanagari text in any herb field', () => {
    for (const herb of herbs) {
      expect(JSON.stringify(herb)).not.toMatch(DEVANAGARI);
    }
  });

  it('uses the Sinhala display names in offline recommendations', () => {
    const names = offlineHerbalRecommendations('acne').map(herb => herb.name);
    expect(names).toEqual(['Neem (කොහොඹ)', 'Turmeric (කහ)', 'Sandalwood (සුදු හඳුන්)']);
  });

  it('searches by Sinhala and botanical names', () => {
    expect(filterHerbs(herbs, 'කහ', 'all').map(herb => herb.id)).toEqual(['turmeric']);
    expect(filterHerbs(herbs, 'withania', 'all').map(herb => herb.id)).toEqual(['ashwagandha']);
  });

  it('includes thesis herbs Ashwagandha and Jojoba Oil', () => {
    expect(herbs.some(herb => herb.name === 'Ashwagandha')).toBe(true);
    expect(herbs.some(herb => herb.name === 'Jojoba Oil')).toBe(true);
  });

  it('searches by name and description', () => {
    const byName = filterHerbs(herbs, 'ashwagandha', 'all');
    expect(byName.map(herb => herb.id)).toEqual(['ashwagandha']);

    const byProperty = filterHerbs(herbs, 'moisturising', 'all');
    expect(byProperty.some(herb => herb.id === 'jojoba')).toBe(true);
  });

  it('filters by Dosha', () => {
    const pitta = filterHerbs(herbs, '', 'pitta');
    expect(pitta.every(herb => herb.doshas.includes('pitta'))).toBe(true);
    expect(pitta.some(herb => herb.id === 'jojoba')).toBe(true);
    expect(pitta.some(herb => herb.id === 'ashwagandha')).toBe(false);
  });

  it('describes herbs in neutral educational language', () => {
    for (const herb of herbs) {
      expect(herb.description).not.toMatch(/miracle|nature's pharmacy|powerful|detoxif/i);
    }
    expect(herbs.find(herb => herb.id === 'aloeVera')?.description).toContain('moisturise and soothe');
  });

  it('combines search and Dosha filter', () => {
    const result = filterHerbs(herbs, 'oil', 'vata');
    expect(result.some(herb => herb.id === 'jojoba')).toBe(true);
    expect(result.every(herb => herb.doshas.includes('vata'))).toBe(true);
  });
});
