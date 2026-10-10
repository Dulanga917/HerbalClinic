import type { TranslationKey } from '../i18n/translations/en';

/** Mirrors `server/src/imageCheck.js`; the server decides, the app only re-checks the shape. */
export const IMAGE_REJECTED = 'IMAGE_REJECTED';
export const IMAGE_CHECK_UNAVAILABLE = 'IMAGE_CHECK_UNAVAILABLE';

const CATEGORIES = [
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
] as const;

const REJECTION_KEYS = {
  no_human_skin: 'imageCheck.noHumanSkin',
  face_not_visible: 'imageCheck.faceNotVisible',
  non_facial_skin: 'imageCheck.nonFacialSkin',
  multiple_faces: 'imageCheck.multipleFaces',
  poor_lighting: 'imageCheck.poorLighting',
  blurry: 'imageCheck.blurry',
  heavily_filtered: 'imageCheck.heavilyFiltered',
  unclear: 'imageCheck.unclear',
} as const satisfies Record<string, TranslationKey>;

export type ImageCategory = (typeof CATEGORIES)[number];
export type ImageRejectionReason = keyof typeof REJECTION_KEYS;

export type ImageCheck =
  | { isValid: true; reason: 'ok'; imageCategory: 'human_face' | 'human_skin' }
  | { isValid: false; reason: ImageRejectionReason; imageCategory: ImageCategory };

const isCategory = (value: unknown): value is ImageCategory =>
  typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);

const isRejectionReason = (value: unknown): value is ImageRejectionReason =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(REJECTION_KEYS, value);

/**
 * Accepts only a well-formed, self-consistent verdict. Anything else returns null so the caller
 * treats the check as unavailable instead of assuming the photo is valid.
 */
export const parseImageCheck = (value: unknown): ImageCheck | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const { isValid, reason, imageCategory } = value as Record<string, unknown>;
  if (!isCategory(imageCategory)) {
    return null;
  }
  if (isValid === true) {
    return reason === 'ok' && (imageCategory === 'human_face' || imageCategory === 'human_skin')
      ? { isValid: true, reason: 'ok', imageCategory }
      : null;
  }
  if (isValid === false && isRejectionReason(reason)) {
    return { isValid: false, reason, imageCategory };
  }
  return null;
};

export const imageRejectionKey = (reason: ImageRejectionReason): TranslationKey => REJECTION_KEYS[reason];

export type ImageRejection = Extract<ImageCheck, { isValid: false }>;

/** The photo was checked and is not suitable; no assessment was made. */
export class ImageRejectedError extends Error {
  readonly code = IMAGE_REJECTED;
  readonly imageCheck: ImageRejection;

  constructor(imageCheck: ImageRejection) {
    super('This photo cannot be assessed. Please retake it.');
    this.name = 'ImageRejectedError';
    this.imageCheck = imageCheck;
  }
}

/** The photo could not be checked (provider down, or an unusable verdict); nothing was assessed. */
export class ImageCheckUnavailableError extends Error {
  readonly code = IMAGE_CHECK_UNAVAILABLE;
  /** True when Gemini refused the check because its usage quota is used up. */
  readonly quotaExceeded: boolean;

  constructor(quotaExceeded = false) {
    super('The photo could not be checked right now.');
    this.name = 'ImageCheckUnavailableError';
    this.quotaExceeded = quotaExceeded;
  }
}

/** A rejection carried by a 422 response; an unreadable verdict is still a rejection, never a pass. */
export const rejectionFromResponse = (imageCheck: unknown): ImageRejectedError => {
  const parsed = parseImageCheck(imageCheck);
  return new ImageRejectedError(
    parsed && !parsed.isValid ? parsed : { isValid: false, reason: 'unclear', imageCategory: 'unclear' },
  );
};
