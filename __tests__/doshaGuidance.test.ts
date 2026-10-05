import { describe, expect, it } from '@jest/globals';
import { getDoshaGuidance } from '../src/utils/doshaGuidance';

describe('getDoshaGuidance', () => {
  it('returns library content for Vata, Pitta, and Kapha', () => {
    const vata = getDoshaGuidance('Vata');
    expect(vata?.name).toBe('Vata');
    expect(vata?.herbs.length).toBeGreaterThan(0);
    expect(vata?.meditation?.id).toBe('vata_grounding');
    expect(getDoshaGuidance('Pitta')?.meditation?.id).toBe('pranayama_basic');
    expect(getDoshaGuidance('Kapha')?.meditation?.id).toBe('body_scan');
  });

  it('does not invent Balanced guidance', () => {
    expect(getDoshaGuidance('Balanced')).toBeNull();
    expect(getDoshaGuidance('unknown')).toBeNull();
  });
});
