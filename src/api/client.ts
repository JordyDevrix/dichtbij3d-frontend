import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getItem, removeItem, setItem, StorageKeys } from './storage';
import type { AuthResponse } from './types';

/* ------------------------------------------------------------------ base URL */

function configuredUrl(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromExtra = typeof extra.apiUrl === 'string' ? extra.apiUrl : undefined;
  return (process.env.EXPO_PUBLIC_API_URL || fromExtra || 'http://localhost:8080').replace(/\/$/, '');
}

/**
 * `localhost` means something different on every platform:
 * - web: the browser host, which is correct
 * - Android emulator: 10.0.2.2 maps to the host machine
 * - real device / Expo Go: the LAN IP that Metro is served from
 */
function resolveBaseUrl(): string {
  const url = configuredUrl();
  if (Platform.OS === 'web') return url;

  const isLoopback = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/.test(url);
  if (!isLoopback) return url;

  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any)?.expoGoConfig?.debuggerHost;
  const lanHost = typeof hostUri === 'string' ? hostUri.split(':')[0] : undefined;
  if (lanHost && lanHost !== 'localhost' && lanHost !== '127.0.0.1') {
    return url.replace(/(localhost|127\.0\.0\.1)/, lanHost);
  }
  if (Platform.OS === 'android') return url.replace(/(localhost|127\.0\.0\.1)/, '10.0.2.2');
  return url;
}

export const API_BASE_URL = resolveBaseUrl();

/** Turns a backend-relative path such as `/api/files/x.png` into a full URL. */
export function absoluteUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/* ------------------------------------------------------------------ errors */

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

/* ------------------------------------------------------------------ tokens */

let accessToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export async function loadTokens() {
  accessToken = await getItem(StorageKeys.accessToken);
  refreshToken = await getItem(StorageKeys.refreshToken);
  return { accessToken, refreshToken };
}

export async function saveTokens(auth: AuthResponse) {
  accessToken = auth.accessToken ?? null;
  refreshToken = auth.refreshToken ?? null;
  if (accessToken) await setItem(StorageKeys.accessToken, accessToken);
  if (refreshToken) await setItem(StorageKeys.refreshToken, refreshToken);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await removeItem(StorageKeys.accessToken);
  await removeItem(StorageKeys.refreshToken);
}

export function currentRefreshToken() {
  return refreshToken;
}

export function hasSession() {
  return !!accessToken;
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/* ------------------------------------------------------------------ locale */

let activeLocale = 'nl';
export function setApiLocale(locale: string) {
  activeLocale = locale;
}

/* ------------------------------------------------------------------ request */

type Query = Record<string, string | number | boolean | undefined | null | (string | number)[]>;

export function buildQuery(params?: Query): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.append(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
  auth?: boolean;
  raw?: boolean;
  /** Internal: prevents infinite refresh loops. */
  _retried?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) {
          await clearTokens();
          return false;
        }
        const auth = (await response.json()) as AuthResponse;
        await saveTokens(auth);
        return !!auth.accessToken;
      } catch {
        return false;
      } finally {
        // allow a new refresh on the next 401
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }
  return refreshPromise;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, raw = false } = options;
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Locale': activeLocale };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error: any) {
    throw new ApiError(0, error?.message || 'Network request failed', 'NETWORK');
  }

  if (response.status === 401 && auth && !options._retried && refreshToken) {
    const refreshed = await performRefresh();
    if (refreshed) return request<T>(path, { ...options, _retried: true });
    await clearTokens();
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let code: string | undefined;
    let fields: Record<string, string> | undefined;
    try {
      const payload = await response.json();
      message = payload.message || payload.error || message;
      code = payload.code;
      fields = payload.fields;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message, code, fields);
  }

  if (raw) return response as unknown as T;
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
