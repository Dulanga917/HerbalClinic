import FaceDetection, { Face, FaceDetectionOptions } from '@react-native-ml-kit/face-detection';
import { ImageRejectedError } from '../utils/imageCheck';

export const FACE_CHECK_FAILED = 'FACE_CHECK_FAILED';

// Faces narrower than this share of the image width (for example people far in the background)
// are ignored, so they neither count as the subject nor as a second face.
const MIN_FACE_SIZE = 0.1;

const DETECTION_OPTIONS: FaceDetectionOptions = {
  performanceMode: 'accurate',
  landmarkMode: 'none',
  contourMode: 'none',
  classificationMode: 'none',
  minFaceSize: MIN_FACE_SIZE,
};

/** The photo could not be read or ML Kit failed, so nothing was checked or classified. */
export class FaceCheckFailedError extends Error {
  readonly code = FACE_CHECK_FAILED;

  constructor() {
    super('The photo could not be checked on this phone.');
    this.name = 'FaceCheckFailedError';
  }
}

// ML Kit resolves the image through Android's content resolver, which needs a URI scheme.
const toImageUrl = (imageUri: string): string => (imageUri.startsWith('/') ? `file://${imageUri}` : imageUri);

/**
 * On-device Google ML Kit check for Skin Type Assessment. Resolves with the face only when the
 * photo contains exactly one detectable face; otherwise throws `ImageRejectedError` (no face or
 * several faces) or `FaceCheckFailedError` (unreadable file or detector error).
 */
export const detectSingleFace = async (imageUri: string): Promise<Face> => {
  if (!imageUri) {
    throw new FaceCheckFailedError();
  }
  let faces: unknown;
  try {
    faces = await FaceDetection.detect(toImageUrl(imageUri), DETECTION_OPTIONS);
  } catch {
    throw new FaceCheckFailedError();
  }
  if (!Array.isArray(faces)) {
    throw new FaceCheckFailedError();
  }
  if (faces.length === 0) {
    throw new ImageRejectedError({ isValid: false, reason: 'face_not_visible', imageCategory: 'unclear' });
  }
  if (faces.length > 1) {
    throw new ImageRejectedError({ isValid: false, reason: 'multiple_faces', imageCategory: 'human_face' });
  }
  return faces[0] as Face;
};
