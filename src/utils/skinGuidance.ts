import { HERBS } from '../constants/ayurveda';
import type { Language } from '../i18n/types';

export const SKIN_GUIDANCE_DISCLAIMER =
  'This information is for general educational and self-care purposes and is not a medical diagnosis. Consult a qualified healthcare professional for medical concerns.';

export type SkinGuidanceStatus = 'possible_concern' | 'no_clear_concern' | 'unable_to_assess';

/** The AI service that wrote live guidance: Gemini, or Groq as the consented backup. */
export type AiProvider = 'gemini' | 'groq';

export const parseAiProvider = (value: unknown): AiProvider => (value === 'groq' ? 'groq' : 'gemini');

export interface SkinGuidanceHerb {
  name: string;
  emoji: string;
  benefit: string;
  usage: string;
}

export interface LiveSkinGuidance {
  kind: 'live';
  status: SkinGuidanceStatus;
  concern: string | null;
  observations: string;
  factors: string[];
  herbs: SkinGuidanceHerb[];
  selfCare: string[];
  /** Language the guidance text was generated in; unset only for payloads not yet language-checked. */
  language?: Language;
  /** Set once the server response is read; servers without a fallback only ever used Gemini. */
  provider?: AiProvider;
}

export interface OfflineSkinGuidance {
  kind: 'offline';
  summary: string;
  tips: string[];
  herbs: SkinGuidanceHerb[];
}

export type SkinGuidanceResult = LiveSkinGuidance | OfflineSkinGuidance;

const STATUSES: SkinGuidanceStatus[] = ['possible_concern', 'no_clear_concern', 'unable_to_assess'];
const MAX_TEXT_LENGTH = 400;
const MAX_ITEM_LENGTH = 200;
const MAX_LIST_ITEMS = 5;
const MAX_HERBS = 4;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';

const cleanList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(item => cleanText(item, MAX_ITEM_LENGTH))
        .filter(Boolean)
        .slice(0, MAX_LIST_ITEMS)
    : [];

const cleanHerbs = (value: unknown): SkinGuidanceHerb[] =>
  Array.isArray(value)
    ? value
        .filter(isRecord)
        .map(herb => ({
          name: cleanText(herb.name, 60),
          emoji: cleanText(herb.emoji, 16) || '🌿',
          benefit: cleanText(herb.benefit, MAX_ITEM_LENGTH),
          usage: cleanText(herb.usage, MAX_ITEM_LENGTH),
        }))
        .filter(herb => herb.name)
        .slice(0, MAX_HERBS)
    : [];

/**
 * Validates the server's skin guidance payload. Unknown fields (including any severity or
 * confidence a model might still emit) are ignored. Returns null when nothing usable remains.
 */
export const parseSkinGuidance = (raw: unknown): LiveSkinGuidance | null => {
  if (!isRecord(raw)) {
    return null;
  }
  let status: SkinGuidanceStatus = STATUSES.includes(raw.status as SkinGuidanceStatus)
    ? (raw.status as SkinGuidanceStatus)
    : 'unable_to_assess';
  const concern = status === 'possible_concern' ? cleanText(raw.concern, 80) : '';
  if (status === 'possible_concern' && !concern) {
    status = 'unable_to_assess';
  }
  const guidance: LiveSkinGuidance = {
    kind: 'live',
    status,
    concern: concern || null,
    observations: cleanText(raw.observations, MAX_TEXT_LENGTH),
    factors: cleanList(raw.factors),
    herbs: cleanHerbs(raw.herbs),
    selfCare: cleanList(raw.selfCare),
  };
  const hasContent =
    guidance.concern ||
    guidance.observations ||
    guidance.factors.length > 0 ||
    guidance.herbs.length > 0 ||
    guidance.selfCare.length > 0;
  return hasContent ? guidance : null;
};

const SINHALA_LETTERS = /[\u0D80-\u0DFF]/g;
const LATIN_LETTERS = /[A-Za-z]/g;
// Four or more English words in a row is untranslated prose, not a kept herb or technical name.
const ENGLISH_PHRASE = /[A-Za-z]+(?:[\s,'-]+[A-Za-z]+){3,}/;
const countMatches = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

const textMatchesLanguage = (text: string, language: Language): boolean => {
  if (!text) {
    return true;
  }
  const unbracketed = text.replace(/\([^)]*\)/g, ' ');
  if (language === 'si') {
    // Short Latin terms (herb, botanical, or technical names such as "UV") may stay as long as
    // Sinhala letters are the majority; bracketed terms are not counted at all.
    const sinhala = countMatches(text, SINHALA_LETTERS);
    const latin = countMatches(unbracketed, LATIN_LETTERS);
    return sinhala > latin && !ENGLISH_PHRASE.test(unbracketed);
  }
  return countMatches(unbracketed, SINHALA_LETTERS) === 0;
};

/**
 * User-facing fields that are not written in the requested language (mirrors the server check).
 * Herb names are exempt: an English or botanical name is kept when no verified Sinhala name exists.
 */
export const fieldsNotInLanguage = (guidance: LiveSkinGuidance, language: Language): string[] => {
  const fields: [string, string][] = [
    ['concern', guidance.concern ?? ''],
    ['observations', guidance.observations],
    ...guidance.factors.map((item, i): [string, string] => [`factors[${i}]`, item]),
    ...guidance.selfCare.map((item, i): [string, string] => [`selfCare[${i}]`, item]),
    ...guidance.herbs.flatMap((herb, i): [string, string][] => [
      [`herbs[${i}].benefit`, herb.benefit],
      [`herbs[${i}].usage`, herb.usage],
    ]),
  ];
  return fields.filter(([, text]) => !textMatchesLanguage(text, language)).map(([name]) => name);
};

const normaliseName = (name: string) => name.trim().toLowerCase();

const KNOWN_HERBS = Object.values(HERBS).map(herb => ({
  names: [herb.name, herb.botanical, herb.sinhala].filter(Boolean).map(name => normaliseName(String(name))),
  en: herb.name,
  si: herb.sinhala ?? herb.name,
}));

/** Replaces herb names the app already knows with its verified name for the language; others are kept. */
export const withVerifiedHerbNames = (guidance: LiveSkinGuidance, language: Language): LiveSkinGuidance => ({
  ...guidance,
  herbs: guidance.herbs.map(herb => {
    const known = KNOWN_HERBS.find(entry => entry.names.includes(normaliseName(herb.name)));
    return known ? { ...herb, name: known[language] } : herb;
  }),
});
