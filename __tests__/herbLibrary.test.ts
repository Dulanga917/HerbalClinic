import { describe, expect, it } from '@jest/globals';
import {
  filterHerbs,
  herbAlternateName,
  herbDisplayName,
  listHerbs,
} from '../src/utils/herbLibrary';
import { offlineHerbalRecommendations } from '../src/services/offlineFallbacks';

const DEVANAGARI = /[\u0900-\u097F]/;

describe('herb library', () => {
  const herbs = listHerbs();

  it('shows English herb names in English mode', () => {
    expect(Object.fromEntries(herbs.map(herb => [herb.id, herbDisplayName(herb, 'en')]))).toEqual({
      turmeric: 'Turmeric',
      neem: 'Neem',
      aloeVera: 'Aloe Vera',
      sandalwood: 'Sandalwood',
      manjistha: 'Manjistha',
      licorice: 'Licorice Root',
      ashwagandha: 'Ashwagandha',
      jojoba: 'Jojoba Oil',
    });
    expect(herbDisplayName(herbs[0])).toBe(herbDisplayName(herbs[0], 'en'));
  });

  it('shows verified Sinhala common names in Sinhala mode and never invents one for Jojoba Oil', () => {
    expect(Object.fromEntries(herbs.map(herb => [herb.id, herbDisplayName(herb, 'si')]))).toEqual({
      turmeric: 'කහ',
      neem: 'කොහොඹ',
      aloeVera: 'කෝමාරිකා',
      sandalwood: 'සුදු හඳුන්',
      manjistha: 'වැල්මදට',
      licorice: 'වැල්මී',
      ashwagandha: 'අමුක්කරා',
      jojoba: 'Jojoba Oil',
    });
  });

  it('offers the other-language name as a secondary label, and none for Jojoba Oil', () => {
    const turmeric = herbs.find(herb => herb.id === 'turmeric')!;
    const jojoba = herbs.find(herb => herb.id === 'jojoba')!;
    expect(herbAlternateName(turmeric, 'en')).toBe('කහ');
    expect(herbAlternateName(turmeric, 'si')).toBe('Turmeric');
    expect(herbAlternateName(jojoba, 'en')).toBeNull();
    expect(herbAlternateName(jojoba, 'si')).toBeNull();
    expect(turmeric.botanical).toBe('Curcuma longa');
  });

  it('contains no Devanagari text in any herb field', () => {
    for (const herb of herbs) {
      expect(JSON.stringify(herb)).not.toMatch(DEVANAGARI);
    }
  });

  it('uses the active-language herb names in offline recommendations', () => {
    expect(offlineHerbalRecommendations('acne').map(herb => herb.name)).toEqual([
      'Neem',
      'Turmeric',
      'Sandalwood',
    ]);
    expect(offlineHerbalRecommendations('acne', undefined, 'si').map(herb => herb.name)).toEqual([
      'කොහොඹ',
      'කහ',
      'සුදු හඳුන්',
    ]);
  });

  it('searches by English, Sinhala and botanical names in either language', () => {
    expect(filterHerbs(herbs, 'කහ', 'all').map(herb => herb.id)).toEqual(['turmeric']);
    expect(filterHerbs(herbs, 'turmeric', 'all').map(herb => herb.id)).toEqual(['turmeric']);
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
