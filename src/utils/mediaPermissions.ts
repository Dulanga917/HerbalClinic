import { Alert, Linking, Platform } from 'react-native';
import {
  PERMISSIONS,
  Permission,
  RESULTS,
  check,
  request,
} from 'react-native-permissions';
import { TranslationKey, translateCurrent } from '../i18n/translate';

export type MediaPermissionResult = 'granted' | 'denied' | 'blocked';

const openAppSettings = () => {
  Linking.openSettings().catch(() => {
    Alert.alert(
      translateCurrent('permission.requiredTitle'),
      translateCurrent('permission.openSettingsFailed'),
    );
  });
};

const showDeniedAlert = (message: string, blocked: boolean) => {
  const title = translateCurrent('permission.neededTitle');
  if (blocked) {
    Alert.alert(title, message, [
      { text: translateCurrent('permission.notNow'), style: 'cancel' },
      { text: translateCurrent('permission.openSettings'), onPress: openAppSettings },
    ]);
    return;
  }

  Alert.alert(title, message);
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
  rationaleKey: TranslationKey,
): Promise<MediaPermissionResult> => {
  const current = toResult(await check(permission));
  if (current === 'granted') {
    return current;
  }

  const next = toResult(await request(permission));
  if (next === 'granted') {
    return next;
  }

  showDeniedAlert(translateCurrent(rationaleKey), next === 'blocked');
  return next;
};

export const ensureCameraPermission = async (): Promise<boolean> => {
  const permission =
    Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
  const result = await ensurePermission(permission, 'permission.cameraRationale');
  return result === 'granted';
};

export const ensureGalleryPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return true;
  }

  const permission =
    Platform.OS === 'ios'
      ? PERMISSIONS.IOS.PHOTO_LIBRARY
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;
  const result = await ensurePermission(permission, 'permission.galleryRationale');
  return result === 'granted';
};
