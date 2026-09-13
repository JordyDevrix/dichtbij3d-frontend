import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Tiny key/value store that uses SecureStore on native and localStorage on web.
 * SecureStore is unavailable in the browser, and localStorage is unavailable in RN.
 */
const memory = new Map<string, string>();

function webStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    const ls = webStorage();
    return ls ? ls.getItem(key) : memory.get(key) ?? null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
  if (Platform.OS === 'web') {
    webStorage()?.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* keep the in-memory copy */
  }
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key);
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
}

export const StorageKeys = {
  accessToken: 'd3d.accessToken',
  refreshToken: 'd3d.refreshToken',
  locale: 'd3d.locale',
  theme: 'd3d.theme',
};
