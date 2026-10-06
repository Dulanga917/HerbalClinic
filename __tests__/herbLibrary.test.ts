import { describe, expect, it } from '@jest/globals';
import { filterHerbs, listHerbs } from '../src/utils/herbLibrary';

describe('herb library', () => {
  const herbs = listHerbs();

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
