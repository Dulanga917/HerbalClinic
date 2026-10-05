import { Alert, Linking, Platform } from 'react-native';
import {
  PERMISSIONS,
  Permission,
  RESULTS,
  check,
  request,
} from 'react-native-permissions';

export type MediaPermissionResult = 'granted' | 'denied' | 'blocked';

const openAppSettings = () => {
  Linking.openSettings().catch(() => {
    Alert.alert(
      'Permission required',
      'Open the system settings app and allow Camera or Photos for HerbalClinic.',
    );
  });
};

const showDeniedAlert = (message: string, blocked: boolean) => {
  if (blocked) {
    Alert.alert('Permission needed', message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: openAppSettings },
    ]);
    return;
  }

  Alert.alert('Permission needed', message);
};

const toResult = (status: string): MediaPermissionResult => {
  if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
    return 'granted';
  }
  if (status === RESULTS.BLOCKED) {
    return 'blocked';
  }
  return 'denied';
};

const ensurePermission = async (
  permission: Permission,
  rationale: string,
): Promise<MediaPermissionResult> => {
  const current = toResult(await check(permission));
  if (current === 'granted') {
    return current;
  }

  const next = toResult(await request(permission));
  if (next === 'granted') {
    return next;
  }

  showDeniedAlert(rationale, next === 'blocked');
  return next;
};

export const ensureCameraPermission = async (): Promise<boolean> => {
  const rationale =
    'HerbalClinic needs camera access to take a photo for analysis. You can enable it in Settings.';
  const permission =
    Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
  const result = await ensurePermission(permission, rationale);
  return result === 'granted';
};

export const ensureGalleryPermission = async (): Promise<boolean> => {
  const rationale =
    'HerbalClinic needs photo access to analyze an image from your gallery. You can enable it in Settings.';

  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return true;
  }

  const permission =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.PHOTO_LIBRARY
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
  const result = await ensurePermission(permission, rationale);
  return result === 'granted';
};
