import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, ApiError } from '../api';
import type { UploadResponse } from '../api/types';

async function normalizeImageOnWeb(
  blob: Blob,
  fileName: string,
  mime: string,
): Promise<{ blob: Blob; fileName: string; type: string }> {
  // SVG or non-image should not be processed via canvas
  if (mime === 'image/svg+xml' || fileName.toLowerCase().endsWith('.svg')) {
    return { blob, fileName, type: 'image/svg+xml' };
  }

  // Ensure DOM and Canvas are available
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { blob, fileName, type: blob.type || mime };
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = new (window as any).Image();
    img.src = url;

    if ('decode' in img) {
      await img.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image decode failed'));
      });
    }

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      return { blob, fileName, type: blob.type || mime };
    }

    // Limit maximum dimension to 2560px for performance and memory
    const maxDim = 2560;
    let targetWidth = width;
    let targetHeight = height;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        targetWidth = maxDim;
        targetHeight = Math.round((height * maxDim) / width);
      } else {
        targetHeight = maxDim;
        targetWidth = Math.round((width * maxDim) / height);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { blob, fileName, type: blob.type || mime };
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.88);
    });

    if (jpegBlob) {
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      return {
        blob: jpegBlob,
        fileName: `${baseName || 'image'}.jpg`,
        type: 'image/jpeg',
      };
    }
  } catch {
    // If canvas decoding or conversion fails, fall back to original blob
  } finally {
    URL.revokeObjectURL(url);
  }

  return { blob, fileName, type: blob.type || mime };
}

async function toUploadable(uri: string, name: string, mime: string, isImage = false) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    let blob = await response.blob();
    let fileName = name;
    let fileType = blob.type || mime;

    if (isImage) {
      const normalized = await normalizeImageOnWeb(blob, fileName, fileType);
      blob = normalized.blob;
      fileName = normalized.fileName;
      fileType = normalized.type;
    }

    return new File([blob], fileName, { type: fileType });
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
  const file = await toUploadable(asset.uri, name, asset.mimeType || 'image/jpeg', true);
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
  const file = await toUploadable(asset.uri, name, asset.mimeType || 'image/jpeg', true);
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
