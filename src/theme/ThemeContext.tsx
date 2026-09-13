import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import { applyTheme, currentMode, ThemeMode } from './theme';
import { getItem, setItem, StorageKeys } from '../api/storage';

/** What the user picked. `system` follows the OS / browser preference. */
export type ThemePreference = ThemeMode | 'system';

interface ThemeContextValue {
  /** The user's choice, including `system`. */
  preference: ThemePreference;
  /** The palette actually in use. */
  scheme: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
  /** Convenience toggle between light and dark (drops `system`). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  scheme: 'light',
  setPreference: () => {},
  toggle: () => {},
});

function systemScheme(): ThemeMode {
  try {
    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/**
 * On the web the preference is readable synchronously, so the very first paint
 * already uses the right palette instead of flashing white.
 */
function initialPreference(): ThemePreference {
  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem(StorageKeys.theme);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {
      /* private mode */
    }
  }
  return 'system';
}

function resolve(preference: ThemePreference): ThemeMode {
  return preference === 'system' ? systemScheme() : preference;
}

const bootPreference = initialPreference();
applyTheme(resolve(bootPreference));

/** Keeps the browser chrome (address bar, scrollbars) in step with the palette. */
function syncDocument(scheme: ThemeMode) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.colorScheme = scheme;
  root.setAttribute('data-theme', scheme);
  const background = scheme === 'dark' ? '#0B0E13' : '#F7F8FA';
  if (document.body) document.body.style.backgroundColor = background;
  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = scheme === 'dark' ? '#12161D' : '#F26514';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(bootPreference);
  const [scheme, setScheme] = useState<ThemeMode>(() => resolve(bootPreference));

  // Native cannot read storage synchronously, so adopt the stored value once.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void (async () => {
      const stored = (await getItem(StorageKeys.theme)) as ThemePreference | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
        setScheme(resolve(stored));
      }
    })();
  }, []);

  // Follow the OS while the preference is `system`.
  useEffect(() => {
    if (preference !== 'system') return;
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setScheme(colorScheme === 'dark' ? 'dark' : 'light'),
    );
    return () => sub.remove();
  }, [preference]);

  if (currentMode() !== scheme) applyTheme(scheme);

  useEffect(() => syncDocument(scheme), [scheme]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setScheme(resolve(next));
    void setItem(StorageKeys.theme, next);
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolve(preference) === 'dark' ? 'light' : 'dark');
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({ preference, scheme, setPreference, toggle }),
    [preference, scheme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
