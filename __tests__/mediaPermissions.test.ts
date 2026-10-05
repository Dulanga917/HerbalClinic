import { beforeEach, it, expect, jest } from '@jest/globals';
import { Alert, Platform } from 'react-native';
import { PERMISSIONS, RESULTS, check, request } from 'react-native-permissions';
import {
  ensureCameraPermission,
  ensureGalleryPermission,
} from '../src/utils/mediaPermissions';

const mockedCheck = check as unknown as {
  mockResolvedValue: (value: string) => void;
};
const mockedRequest = request as unknown as {
  mockResolvedValue: (value: string) => void;
};

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 34 });
  mockedCheck.mockResolvedValue(RESULTS.DENIED);
  mockedRequest.mockResolvedValue(RESULTS.GRANTED);
});

it('requests the Android camera permission and reports denial', async () => {
  mockedRequest.mockResolvedValue(RESULTS.DENIED);

  const allowed = await ensureCameraPermission();
  expect(allowed).toBe(false);
  expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.CAMERA);
  expect(Alert.alert).toHaveBeenCalled();
});

it('skips gallery storage permission on Android 13+ photo picker', async () => {
  const allowed = await ensureGalleryPermission();
  expect(allowed).toBe(true);
  expect(check).not.toHaveBeenCalled();
});

it('requests gallery permission on older Android versions', async () => {
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 32 });

  const allowed = await ensureGalleryPermission();
  expect(allowed).toBe(true);
  expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
});

it('offers Settings when camera permission is permanently denied', async () => {
  mockedRequest.mockResolvedValue(RESULTS.BLOCKED);

  const allowed = await ensureCameraPermission();
  expect(allowed).toBe(false);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Permission needed',
    expect.any(String),
    expect.arrayContaining([expect.objectContaining({ text: 'Open Settings' })]),
  );
});
