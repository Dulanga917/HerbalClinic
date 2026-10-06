import { describe, expect, it } from '@jest/globals';
import { parseSkinGuidance, SKIN_GUIDANCE_DISCLAIMER } from '../src/utils/skinGuidance';

describe('parseSkinGuidance', () => {
  it('keeps the allowed fields and ignores severity, confidence, and model disclaimers', () => {
    const result = parseSkinGuidance({
      status: 'possible_concern',
      concern: 'Visible dryness',
      observations: 'The skin looks a little dry.',
      factors: ['Dry weather'],
      herbs: [{ name: 'Aloe Vera', emoji: '🌵', benefit: 'Soothing', usage: 'Apply gel' }],
      selfCare: ['Moisturise daily'],
      severity: 'Severe',
      confidence: 97,
      disclaimer: 'model text',
    });
    expect(result).toEqual({
      kind: 'live',
      status: 'possible_concern',
      concern: 'Visible dryness',
      observations: 'The skin looks a little dry.',
      factors: ['Dry weather'],
      herbs: [{ name: 'Aloe Vera', emoji: '🌵', benefit: 'Soothing', usage: 'Apply gel' }],
      selfCare: ['Moisturise daily'],
    });
  });

  it('defaults missing or wrongly typed arrays to empty arrays', () => {
    const result = parseSkinGuidance({
      status: 'no_clear_concern',
      observations: 'Even tone.',
      factors: 'not-an-array',
      herbs: { name: 'Neem' },
    });
    expect(result?.factors).toEqual([]);
    expect(result?.herbs).toEqual([]);
    expect(result?.selfCare).toEqual([]);
  });

  it('drops invalid list items and herbs without a name, and fills a default emoji', () => {
    const result = parseSkinGuidance({
      status: 'no_clear_concern',
      factors: ['Sun', 42, null, '   ', { text: 'x' }],
      herbs: [{ name: 'Neem', benefit: 7 }, { emoji: '🌵' }, 'Aloe', null],
    });
    expect(result?.factors).toEqual(['Sun']);
    expect(result?.herbs).toEqual([{ name: 'Neem', emoji: '🌿', benefit: '', usage: '' }]);
  });

  it('never produces "undefined" text for missing strings', () => {
    const result = parseSkinGuidance({ status: 'no_clear_concern', selfCare: ['Keep hydrated'] });
    expect(result?.observations).toBe('');
    expect(result?.concern).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/undefined/);
  });

  it('downgrades an unknown status or a concern without text to "unable_to_assess"', () => {
    expect(parseSkinGuidance({ status: 'diagnosed', observations: 'x' })?.status).toBe('unable_to_assess');
    const blankConcern = parseSkinGuidance({ status: 'possible_concern', concern: '  ', observations: 'x' });
    expect(blankConcern?.status).toBe('unable_to_assess');
    expect(blankConcern?.concern).toBeNull();
  });

  it('returns null for unusable payloads', () => {
    for (const raw of [undefined, null, 'text', 7, [], {}, { issue: 'Eczema', severity: 'Severe', confidence: 99 }]) {
      expect(parseSkinGuidance(raw)).toBeNull();
    }
  });

  it('exposes a fixed app-controlled medical disclaimer', () => {
    expect(SKIN_GUIDANCE_DISCLAIMER).toMatch(/not a medical diagnosis/);
    expect(SKIN_GUIDANCE_DISCLAIMER).toMatch(/qualified healthcare professional/);
  });
});
