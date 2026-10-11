import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { detectSingleFace, FaceCheckFailedError } from '../src/services/faceDetectionService';
import { ImageRejectedError } from '../src/utils/imageCheck';

const mockDetect = FaceDetection.detect as jest.Mock<typeof FaceDetection.detect>;

const face = (left: number) => ({
  frame: { width: 300, height: 300, top: 100, left },
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
});

describe('detectSingleFace (on-device ML Kit check)', () => {
  beforeEach(() => {
    mockDetect.mockReset();
    mockDetect.mockResolvedValue([face(100)]);
  });

  it('resolves with the face when exactly one face is detected', async () => {
    await expect(detectSingleFace('file:///cache/photo.jpg')).resolves.toEqual(face(100));
    expect(mockDetect).toHaveBeenCalledWith(
      'file:///cache/photo.jpg',
      expect.objectContaining({ performanceMode: 'accurate', minFaceSize: 0.1 }),
    );
  });

  it('adds a file scheme to a bare path and keeps content URIs unchanged', async () => {
    await detectSingleFace('/data/user/0/com.herbalclinic/cache/photo.jpg');
    await detectSingleFace('content://media/external/images/media/42');
    expect(mockDetect.mock.calls.map(call => call[0])).toEqual([
      'file:///data/user/0/com.herbalclinic/cache/photo.jpg',
      'content://media/external/images/media/42',
    ]);
  });

  it('rejects a photo with no face as face_not_visible', async () => {
    mockDetect.mockResolvedValue([]);
    const error = await detectSingleFace('file:///cache/table.jpg').catch(e => e);
    expect(error).toBeInstanceOf(ImageRejectedError);
    expect(error.imageCheck).toEqual({ isValid: false, reason: 'face_not_visible', imageCategory: 'unclear' });
  });

  it('rejects a photo with several faces as multiple_faces', async () => {
    mockDetect.mockResolvedValue([face(0), face(400)]);
    const error = await detectSingleFace('file:///cache/group.jpg').catch(e => e);
    expect(error).toBeInstanceOf(ImageRejectedError);
    expect(error.imageCheck).toEqual({ isValid: false, reason: 'multiple_faces', imageCategory: 'human_face' });
  });

  it('reports an unreadable file or detector error as a face-check failure, never a pass', async () => {
    mockDetect.mockRejectedValue(new Error('Face detection failed'));
    await expect(detectSingleFace('file:///cache/broken.jpg')).rejects.toBeInstanceOf(FaceCheckFailedError);
  });

  it('treats a malformed detector result as a failure', async () => {
    for (const value of [null, undefined, 'faces', { length: 1 }]) {
      mockDetect.mockResolvedValue(value as never);
      await expect(detectSingleFace('file:///cache/photo.jpg')).rejects.toBeInstanceOf(FaceCheckFailedError);
    }
  });

  it('fails without calling ML Kit when no image was given', async () => {
    await expect(detectSingleFace('')).rejects.toBeInstanceOf(FaceCheckFailedError);
    expect(mockDetect).not.toHaveBeenCalled();
  });
});
