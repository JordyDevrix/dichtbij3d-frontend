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

// Pre-populate memory cache on web synchronously if available
if (Platform.OS === 'web') {
  const ls = webStorage();
  if (ls) {
    try {
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && key.startsWith('d3d.')) {
          const val = ls.getItem(key);
          if (val !== null) memory.set(key, val);
        }
      }
    } catch {
      // ignore
    }
  }
}

export function getItemSync(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  if (Platform.OS === 'web') {
    const ls = webStorage();
    const val = ls ? ls.getItem(key) : null;
    if (val !== null) memory.set(key, val);
    return val;
  }
  return memory.get(key) ?? null;
}

export async function getItem(key: string): Promise<string | null> {
  const cached = getItemSync(key);
  if (cached !== null) return cached;
  if (Platform.OS === 'web') {
    return cached;
  }
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) memory.set(key, val);
    return val;
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
  user: 'd3d.user',
  maintenance: 'd3d.maintenance',
  locale: 'd3d.locale',
  theme: 'd3d.theme',
};

