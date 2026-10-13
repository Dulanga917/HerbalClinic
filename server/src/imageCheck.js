const IMAGE_REJECTED = 'IMAGE_REJECTED';
const IMAGE_REJECTED_MESSAGE = 'This photo cannot be assessed. Please retake it.';

/** "face": Skin Type Assessment (one clear human face). "skin": AI Skin Guidance (any visible human skin). */
const IMAGE_CHECK_PURPOSES = ['face', 'skin'];

const IMAGE_CATEGORIES = [
  'human_face',
  'human_skin',
  'furniture',
  'landscape',
  'animal',
  'food',
  'document',
  'screenshot',
  'other_object',
  'unclear',
];
const IMAGE_QUALITIES = ['good', 'too_dark', 'too_bright', 'blurry', 'heavily_filtered', 'obstructed'];
const REJECTION_REASONS = [
  'no_human_skin',
  'face_not_visible',
  'non_facial_skin',
  'multiple_faces',
  'poor_lighting',
  'blurry',
  'heavily_filtered',
  'unclear',
];
const FACE_ONLY_REASONS = ['face_not_visible', 'non_facial_skin', 'multiple_faces'];
const MODEL_REASONS = ['ok', ...REJECTION_REASONS];
const MAX_FACE_COUNT = 50;

const QUALITY_REASONS = {
  too_dark: 'poor_lighting',
  too_bright: 'poor_lighting',
  blurry: 'blurry',
  heavily_filtered: 'heavily_filtered',
  obstructed: 'unclear',
};

const quoted = values => values.map(value => `"${value}"`).join(', ');

function imageCheckFields(purpose) {
  const isFace = purpose === 'face';
  const subject = isFace
    ? 'exactly one real human face, front-facing, with most of the face clearly visible'
    : 'real human skin';
  // Skin guidance accepts any body part, so face-specific reasons must not be offered for it.
  const reasons = isFace ? REJECTION_REASONS : REJECTION_REASONS.filter(reason => !FACE_ONLY_REASONS.includes(reason));
  const anyBodyPart = isFace
    ? ''
    : '\nSkin from any part of the body (for example the face, hands, arms or legs) is valid; a face is not required.';
  return `It is valid only if it is a real camera photo that clearly shows ${subject}, is in focus, is evenly lit (not too dark or too bright), and is not heavily filtered, edited, a drawing, or a screenshot.${anyBodyPart}
Photos of furniture, rooms, landscapes, animals, food, documents, text, screens, or other objects are never valid. If you are not sure, it is not valid.
Fields:
  "isValid": true or false,
  "imageCategory": one of ${quoted(IMAGE_CATEGORIES)} ("human_skin" means human skin is visible but no face),
  "humanSkinVisible": true or false,
  "faceCount": the number of human faces clearly visible (0 if none),
  "quality": one of ${quoted(IMAGE_QUALITIES)},
  "reason": "ok" when isValid is true, otherwise the main problem, one of ${quoted(reasons)}`;
}

/** Standalone prompt for Skin Type Assessment: the whole answer is the image check. */
function imageCheckPrompt(purpose) {
  return `
You check photos for an Ayurvedic wellness app before any assessment is made. Do not assess the skin and do not diagnose.
Decide whether this photo is suitable for a ${purpose === 'face' ? 'facial skin' : 'skin'} assessment.
${imageCheckFields(purpose)}

Return ONLY valid JSON (no markdown, no explanation) with exactly these fields.
`;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Turns the model's image check into { isValid, reason, imageCategory }. A photo is valid only
 * when the model says so AND every structured field agrees; any contradiction is a rejection.
 * Returns null when the answer does not match the schema, so callers treat it as unavailable.
 */
function normaliseImageCheck(raw, purpose) {
  if (!isPlainObject(raw) || !IMAGE_CHECK_PURPOSES.includes(purpose)) {
    return null;
  }
  const { isValid, imageCategory, humanSkinVisible, faceCount, quality, reason } = raw;
  if (
    typeof isValid !== 'boolean' ||
    typeof humanSkinVisible !== 'boolean' ||
    !IMAGE_CATEGORIES.includes(imageCategory) ||
    !IMAGE_QUALITIES.includes(quality) ||
    !MODEL_REASONS.includes(reason) ||
    !Number.isInteger(faceCount) ||
    faceCount < 0 ||
    faceCount > MAX_FACE_COUNT
  ) {
    return null;
  }

  const problems = [];
  const humanCategory = imageCategory === 'human_face' || imageCategory === 'human_skin';
  if (!humanSkinVisible) {
    problems.push('no_human_skin');
  } else if (!humanCategory || (imageCategory === 'human_face' && faceCount === 0)) {
    problems.push('unclear');
  } else if (purpose === 'face') {
    if (faceCount > 1) {
      problems.push('multiple_faces');
    } else if (imageCategory === 'human_skin') {
      problems.push(faceCount === 0 ? 'non_facial_skin' : 'unclear');
    }
  }
  if (quality !== 'good') {
    problems.push(QUALITY_REASONS[quality]);
  }

  if (problems.length === 0 && isValid && reason === 'ok') {
    return { isValid: true, reason: 'ok', imageCategory };
  }
  const rejection = problems[0] || (reason !== 'ok' ? reason : 'unclear');
  return { isValid: false, reason: rejection, imageCategory };
}

function imageRejected(imageCheck) {
  const error = new Error(IMAGE_REJECTED_MESSAGE);
  error.status = 422;
  error.code = IMAGE_REJECTED;
  error.imageCheck = imageCheck;
  return error;
}

// Metadata only: never the image, the prompt, or provider text.
function logImageRejection(purpose, raw, imageCheck) {
  console.warn(
    `Image check rejected photo (purpose=${purpose}, reason=${imageCheck.reason}, ` +
      `category=${imageCheck.imageCategory}, modelSaidValid=${raw && raw.isValid === true})`,
  );
}

module.exports = {
  IMAGE_CATEGORIES,
  IMAGE_CHECK_PURPOSES,
  IMAGE_QUALITIES,
  IMAGE_REJECTED,
  IMAGE_REJECTED_MESSAGE,
  REJECTION_REASONS,
  imageCheckFields,
  imageCheckPrompt,
  imageRejected,
  logImageRejection,
  normaliseImageCheck,
};
