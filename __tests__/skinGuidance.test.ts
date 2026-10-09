import { describe, expect, it } from '@jest/globals';
import {
  fieldsNotInLanguage,
  LiveSkinGuidance,
  parseSkinGuidance,
  SKIN_GUIDANCE_DISCLAIMER,
  withVerifiedHerbNames,
} from '../src/utils/skinGuidance';

const SINHALA: LiveSkinGuidance = {
  kind: 'live',
  status: 'possible_concern',
  concern: 'පෙනෙන වියළි බව',
  observations: 'සම මඳක් වියළි ලෙස පෙනේ.',
  factors: ['වියළි කාලගුණය'],
  herbs: [
    {
      name: 'Aloe Vera',
      emoji: '🌵',
      benefit: 'කහ (Curcuma longa) සමඟ සමට සිසිලසක් ලබා දෙයි',
      usage: 'Aloe Vera ජෙල් ස්වල්පයක් සමේ මෘදු ලෙස ආලේප කරන්න',
    },
  ],
  selfCare: ['දිනපතා සම තෙත් කරන්න'],
};

describe('fieldsNotInLanguage', () => {
  it('accepts complete Sinhala guidance with English herb names and bracketed botanical terms', () => {
    expect(fieldsNotInLanguage(SINHALA, 'si')).toEqual([]);
  });

  it('flags every English field, including nested herb text, in Sinhala mode', () => {
    const english = parseSkinGuidance({
      status: 'possible_concern',
      concern: 'Visible dryness',
      observations: 'The skin looks a little dry.',
      factors: ['Dry weather'],
      herbs: [{ name: 'Neem', emoji: '🌿', benefit: 'Cleansing', usage: 'Use as a gentle wash' }],
      selfCare: ['Moisturise daily'],
    })!;
    expect(fieldsNotInLanguage(english, 'si')).toEqual([
      'concern',
      'observations',
      'factors[0]',
      'selfCare[0]',
      'herbs[0].benefit',
      'herbs[0].usage',
    ]);
    expect(fieldsNotInLanguage(english, 'en')).toEqual([]);
  });

  it('flags only the mixed fields of an otherwise Sinhala answer', () => {
    const mixed: LiveSkinGuidance = {
      ...SINHALA,
      factors: ['වියළි කාලගුණය', 'Long hot showers can dry the skin'],
      herbs: [{ ...SINHALA.herbs[0], benefit: 'Soothing and cooling for dry skin' }],
    };
    expect(fieldsNotInLanguage(mixed, 'si')).toEqual(['factors[1]', 'herbs[0].benefit']);
  });

  it('flags Sinhala prose in English mode', () => {
    expect(fieldsNotInLanguage({ ...SINHALA, concern: 'Visible dryness' }, 'en')).toContain('observations');
  });
});

describe('withVerifiedHerbNames', () => {
  const herbs = (names: string[]) => ({
    ...SINHALA,
    herbs: names.map(name => ({ name, emoji: '🌿', benefit: '', usage: '' })),
  });

  it('uses the verified Sinhala name for herbs the app knows, by English or botanical name', () => {
    const result = withVerifiedHerbNames(herbs(['Aloe Vera', 'curcuma longa', 'Neem']), 'si');
    expect(result.herbs.map(h => h.name)).toEqual(['කෝමාරිකා', 'කහ', 'කොහොඹ']);
  });

  it('keeps unknown herb names unchanged instead of inventing a translation', () => {
    const result = withVerifiedHerbNames(herbs(['Gotu Kola', 'ඉඟුරු']), 'si');
    expect(result.herbs.map(h => h.name)).toEqual(['Gotu Kola', 'ඉඟුරු']);
  });

  it('shows the English name in English mode even if the model used the Sinhala one', () => {
    const result = withVerifiedHerbNames(herbs(['කහ', 'Aloe Vera']), 'en');
    expect(result.herbs.map(h => h.name)).toEqual(['Turmeric', 'Aloe Vera']);
  });
});

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
