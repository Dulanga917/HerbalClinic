const GEMINI_UNAVAILABLE = 'GEMINI_UNAVAILABLE';
const GEMINI_UNAVAILABLE_MESSAGE = 'AI guidance is temporarily unavailable.';

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

module.exports = {
  GEMINI_UNAVAILABLE,
  GEMINI_UNAVAILABLE_MESSAGE,
  geminiUnavailable,
  normaliseSkinGuidance,
};
