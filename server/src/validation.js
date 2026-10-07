const ALLOWED_DOSHAS = [
  'Vata',
  'Pitta',
  'Kapha',
  'Vata-Pitta',
  'Pitta-Kapha',
  'Vata-Kapha',
];

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_REFERENCE_LENGTH = 255;
const MAX_CONDITION_LENGTH = 100;

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const UNSAFE_REFERENCE_CHARS = /[\u0000-\u001f\u007f<>"'`\\]/;
const CONDITION_PATTERN = /^[\p{L}\p{N} ,.'()/&-]+$/u;

const IMAGE_SIGNATURES = [
  { mime: 'image/jpeg', matches: bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  {
    mime: 'image/png',
    matches: bytes =>
      bytes.length >= 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b),
  },
  {
    mime: 'image/webp',
    matches: bytes =>
      bytes.length >= 12 &&
      bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP',
  },
];

const ALLOWED_IMAGE_MIME_TYPES = IMAGE_SIGNATURES.map(item => item.mime);

const fail = message => ({ ok: false, message });

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateDosha(value, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    return required ? fail('A valid dosha is required.') : { ok: true, value: null };
  }
  if (typeof value !== 'string' || !ALLOWED_DOSHAS.includes(value)) {
    return fail(`Dosha must be one of: ${ALLOWED_DOSHAS.join(', ')}.`);
  }
  return { ok: true, value };
}

function validateScanInput(body) {
  if (!isPlainObject(body)) {
    return fail('A JSON object is required.');
  }

  const dosha = validateDosha(body.dosha);
  if (!dosha.ok) {
    return dosha;
  }

  let confidence = null;
  if (body.confidence !== undefined && body.confidence !== null) {
    if (
      typeof body.confidence !== 'number' ||
      !Number.isFinite(body.confidence) ||
      body.confidence < 0 ||
      body.confidence > 100
    ) {
      return fail('Confidence must be a number between 0 and 100.');
    }
    confidence = Math.round(body.confidence);
  }

  let imageReference = null;
  if (body.imageReference !== undefined && body.imageReference !== null) {
    if (
      typeof body.imageReference !== 'string' ||
      body.imageReference.length === 0 ||
      body.imageReference.length > MAX_IMAGE_REFERENCE_LENGTH ||
      UNSAFE_REFERENCE_CHARS.test(body.imageReference)
    ) {
      return fail('Image reference is invalid.');
    }
    imageReference = body.imageReference;
  }

  if (dosha.value === null && confidence === null && imageReference === null) {
    return fail('A scan needs a dosha, confidence, or image reference.');
  }

  return { ok: true, value: { dosha: dosha.value, confidence, imageReference } };
}

const ALLOWED_LANGUAGES = ['en', 'si'];

// Optional guidance language; older clients that do not send it get English.
function validateLanguage(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: 'en' };
  }
  if (typeof value !== 'string' || !ALLOWED_LANGUAGES.includes(value)) {
    return fail(`Language must be one of: ${ALLOWED_LANGUAGES.join(', ')}.`);
  }
  return { ok: true, value };
}

function validateImageUpload(body) {
  if (!isPlainObject(body)) {
    return fail('A JSON object is required.');
  }

  const { imageBase64, mimeType } = body;
  if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
    return fail('A photo is required for analysis.');
  }
  if (mimeType !== undefined && mimeType !== null) {
    if (typeof mimeType !== 'string' || !ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
      return fail('Only JPEG, PNG, or WebP photos are supported.');
    }
  }

  const maxBase64Length = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4;
  if (imageBase64.length > maxBase64Length) {
    return fail('The photo is too large. Please use an image under 6 MB.');
  }
  if (imageBase64.length % 4 !== 0 || !BASE64_PATTERN.test(imageBase64)) {
    return fail('The photo data is not valid base64.');
  }

  const bytes = Buffer.from(imageBase64, 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) {
    return fail('The photo is too large. Please use an image under 6 MB.');
  }

  const detected = IMAGE_SIGNATURES.find(item => item.matches(bytes));
  if (!detected) {
    return fail('Only JPEG, PNG, or WebP photos are supported.');
  }

  const language = validateLanguage(body.language);
  if (!language.ok) {
    return language;
  }

  return { ok: true, value: { imageBase64, mimeType: detected.mime, language: language.value } };
}

function validateRecommendationInput(body) {
  if (!isPlainObject(body)) {
    return fail('A JSON object is required.');
  }

  const { condition } = body;
  if (typeof condition !== 'string') {
    return fail('A condition is required.');
  }
  const trimmed = condition.trim();
  if (!trimmed || trimmed.length > MAX_CONDITION_LENGTH || !CONDITION_PATTERN.test(trimmed)) {
    return fail(
      `Condition must be 1-${MAX_CONDITION_LENGTH} characters of letters, numbers, spaces, or basic punctuation.`,
    );
  }

  const dosha = validateDosha(body.dosha);
  if (!dosha.ok) {
    return dosha;
  }

  const language = validateLanguage(body.language);
  if (!language.ok) {
    return language;
  }

  return { ok: true, value: { condition: trimmed, dosha: dosha.value, language: language.value } };
}

function validateDailyTipInput(body) {
  if (body === undefined || body === null) {
    return { ok: true, value: { dosha: null, language: 'en' } };
  }
  if (!isPlainObject(body)) {
    return fail('A JSON object is required.');
  }
  const dosha = validateDosha(body.dosha);
  if (!dosha.ok) {
    return dosha;
  }
  const language = validateLanguage(body.language);
  if (!language.ok) {
    return language;
  }
  return { ok: true, value: { dosha: dosha.value, language: language.value } };
}

module.exports = {
  ALLOWED_DOSHAS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_LANGUAGES,
  MAX_IMAGE_BYTES,
  validateLanguage,
  validateScanInput,
  validateImageUpload,
  validateRecommendationInput,
  validateDailyTipInput,
};
