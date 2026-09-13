import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, ApiError } from '../api';
import type { UploadResponse } from '../api/types';

async function toUploadable(uri: string, name: string, mime: string) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new File([blob], name, { type: blob.type || mime });
  }
  return { uri, name, type: mime };
}

/** Opens the gallery and uploads the chosen image; returns null when cancelled. */
export async function pickAndUploadImage(folder = 'adverts'): Promise<UploadResponse | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const name = asset.fileName || `image-${Date.now()}.jpg`;
  const file = await toUploadable(asset.uri, name, asset.mimeType || 'image/jpeg');
  return api.upload(file as any, folder);
}

/** Opens the gallery and uploads the chosen image as the current user's avatar. */
export async function pickAndUploadAvatar() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const name = asset.fileName || `avatar-${Date.now()}.jpg`;
  const file = await toUploadable(asset.uri, name, asset.mimeType || 'image/jpeg');
  return api.uploadAvatar(file as any);
}

/** Opens the document picker and uploads the chosen files (3D model files). */
export async function pickAndUploadFiles(folder = 'models'): Promise<UploadResponse[]> {
  const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) return [];
  
  const allowedExtensions = ['.3mf', '.obj', '.stl'];
  for (const asset of result.assets) {
    const lowerName = asset.name.toLowerCase();
    const isValid = allowedExtensions.some(ext => lowerName.endsWith(ext));
    if (!isValid) {
      throw new ApiError(400, `Invalid file type: ${asset.name}. Only .3mf, .obj, and .stl files are allowed.`);
    }
  }

  const uploads: UploadResponse[] = [];
  for (const asset of result.assets) {
    const file = await toUploadable(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
    uploads.push(await api.upload(file as any, folder));
  }
  return uploads;
}
