const { imageRejected, logImageRejection, normaliseImageCheck } = require('./imageCheck');

const GEMINI_UNAVAILABLE = 'GEMINI_UNAVAILABLE';
const GEMINI_UNAVAILABLE_MESSAGE = 'AI guidance is temporarily unavailable.';
// Set on a GEMINI_UNAVAILABLE error when Gemini refused the call because a usage quota is used up.
const QUOTA_EXCEEDED = 'quota_exceeded';

const SKIN_GUIDANCE_STATUSES = ['possible_concern', 'no_clear_concern', 'unable_to_assess'];
const MAX_TEXT_LENGTH = 400;
const MAX_ITEM_LENGTH = 200;
const MAX_LIST_ITEMS = 5;
const MAX_HERBS = 4;

// The cause is kept on the error for server-side debugging only; handleError never serialises it.
function geminiUnavailable(cause) {
  const error = new Error(GEMINI_UNAVAILABLE_MESSAGE);
  error.status = 503;
  error.code = GEMINI_UNAVAILABLE;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(item => cleanText(item, MAX_ITEM_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
}

function cleanEmoji(value) {
  const text = cleanText(value, 16);
  return text ? Array.from(text).slice(0, 4).join('') : '🌿';
}

function cleanHerbs(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(herb => herb && typeof herb === 'object' && !Array.isArray(herb))
    .map(herb => ({
      name: cleanText(herb.name, 60),
      emoji: cleanEmoji(herb.emoji),
      benefit: cleanText(herb.benefit, MAX_ITEM_LENGTH),
      usage: cleanText(herb.usage, MAX_ITEM_LENGTH),
    }))
    .filter(herb => herb.name)
    .slice(0, MAX_HERBS);
}

/**
 * Reduces raw model output to the fields the app is allowed to show. Severity, confidence,
 * and any model-written disclaimer are dropped on purpose. Returns null when nothing usable remains.
 */
function normaliseSkinGuidance(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  let status = SKIN_GUIDANCE_STATUSES.includes(raw.status) ? raw.status : 'unable_to_assess';
  const concern = status === 'possible_concern' ? cleanText(raw.concern, 80) : '';
  if (status === 'possible_concern' && !concern) {
    status = 'unable_to_assess';
  }
  const guidance = {
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
    guidance.factors.length ||
    guidance.herbs.length ||
    guidance.selfCare.length;
  return hasContent ? guidance : null;
}

const SINHALA_LETTERS = /[\u0D80-\u0DFF]/g;
const LATIN_LETTERS = /[A-Za-z]/g;
// Four or more English words in a row is untranslated prose, not a kept herb or technical name.
const ENGLISH_PHRASE = /[A-Za-z]+(?:[\s,'-]+[A-Za-z]+){3,}/;
function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function textMatchesLanguage(text, language) {
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
}

/**
 * Names of the user-facing fields of normalised guidance that are not written in the requested
 * language. Herb names are exempt: an English or botanical name is kept when no verified
 * Sinhala name exists.
 */
function fieldsNotInLanguage(guidance, language) {
  const fields = [
    ['concern', guidance.concern],
    ['observations', guidance.observations],
    ...guidance.factors.map((item, i) => [`factors[${i}]`, item]),
    ...guidance.selfCare.map((item, i) => [`selfCare[${i}]`, item]),
    ...guidance.herbs.flatMap((herb, i) => [
      [`herbs[${i}].benefit`, herb.benefit],
      [`herbs[${i}].usage`, herb.usage],
    ]),
  ];
  return fields.filter(([, text]) => !textMatchesLanguage(text || '', language)).map(([name]) => name);
}

// A regeneration only starts if the first answer came back within this window, so the total
// stays inside the app's 100 s request timeout (one more 45 s attempt at most).
const LANGUAGE_RETRY_WINDOW_MS = 45000;

/**
 * Guidance is only read from an answer whose own image check passed. A failed check throws
 * IMAGE_REJECTED (no guidance is produced); a missing or malformed check makes the answer unusable.
 */
function readCheckedGuidance(raw) {
  const imageCheck = normaliseImageCheck(raw && raw.imageCheck, 'skin');
  if (!imageCheck) {
    return null;
  }
  if (!imageCheck.isValid) {
    logImageRejection('skin', raw.imageCheck, imageCheck);
    throw imageRejected(imageCheck);
  }
  const guidance = normaliseSkinGuidance(raw);
  return guidance ? { imageCheck, guidance } : null;
}

/**
 * Runs skin guidance and only returns { imageCheck, guidance } when the photo passed the image
 * check and every user-facing field is in the requested language. One bounded, stricter
 * regeneration is tried; otherwise null (offline fallback).
 */
async function analyseSkinGuidanceInLanguage(gemini, input, { now = Date.now } = {}) {
  const startedAt = now();
  const first = readCheckedGuidance(await gemini.analyseSkinIssue(input));
  if (!first) {
    return null;
  }
  const mismatched = fieldsNotInLanguage(first.guidance, input.language);
  if (mismatched.length === 0) {
    return first;
  }
  const willRegenerate = now() - startedAt <= LANGUAGE_RETRY_WINDOW_MS;
  console.warn(
    `Skin guidance language check failed (language=${input.language}, attempt=1, ` +
      `fields=${mismatched.join('|')}, willRegenerate=${willRegenerate})`,
  );
  if (!willRegenerate) {
    return null;
  }
  const second = readCheckedGuidance(
    await gemini.analyseSkinIssue({ ...input, strictLanguage: true }, { maxAttempts: 1 }),
  );
  if (!second) {
    return null;
  }
  const stillMismatched = fieldsNotInLanguage(second.guidance, input.language);
  if (stillMismatched.length > 0) {
    console.warn(
      `Skin guidance language check failed (language=${input.language}, attempt=2, ` +
        `fields=${stillMismatched.join('|')}, willRegenerate=false)`,
    );
    return null;
  }
  return second;
}

module.exports = {
  GEMINI_UNAVAILABLE,
  GEMINI_UNAVAILABLE_MESSAGE,
  LANGUAGE_RETRY_WINDOW_MS,
  QUOTA_EXCEEDED,
  analyseSkinGuidanceInLanguage,
  fieldsNotInLanguage,
  geminiUnavailable,
  normaliseSkinGuidance,
};
