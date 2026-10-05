/**
 * Image Utilities — HerbalClinic
 * Helpers for handling image URIs from react-native-image-picker.
 */

import { Alert } from 'react-native';
import {
  ImagePickerResponse,
  launchCamera,
  launchImageLibrary,
  MediaType,
} from 'react-native-image-picker';
import { ensureCameraPermission, ensureGalleryPermission } from './mediaPermissions';

export interface PickedImage {
  uri: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
}

const mapAsset = (response: ImagePickerResponse): PickedImage | null => {
  if (response.didCancel) {
    return null;
  }
  if (response.errorCode === 'permission') {
    Alert.alert(
      'Permission needed',
      'Camera or photo access was denied. You can enable it in Settings if you want to try again.',
    );
    return null;
  }
  if (response.errorCode || !response.assets?.length) {
    return null;
  }
  const asset = response.assets[0];
  const uri = asset.uri ?? '';
  if (!uri) {
    return null;
  }
  return {
    uri,
    fileName: asset.fileName ?? 'photo.jpg',
    fileSize: asset.fileSize ?? 0,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
  };
};

export const openCamera = async (): Promise<PickedImage | null> => {
  const allowed = await ensureCameraPermission();
  if (!allowed) {
    return null;
  }

  return new Promise(resolve => {
    launchCamera(
      {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
        saveToPhotos: false,
        includeBase64: false,
        cameraType: 'front',
      },
      (response: ImagePickerResponse) => {
        resolve(mapAsset(response));
      },
    );
  });
};

export const openGallery = async (): Promise<PickedImage | null> => {
  const allowed = await ensureGalleryPermission();
  if (!allowed) {
    return null;
  }

  return new Promise(resolve => {
    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
        includeBase64: false,
        selectionLimit: 1,
      },
      (response: ImagePickerResponse) => {
        resolve(mapAsset(response));
      },
    );
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
