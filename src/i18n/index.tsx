import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Localization from 'expo-localization';
import nl, { Translations } from './nl';
import en from './en';
import de from './de';
import fr from './fr';
import { getItem, setItem, StorageKeys } from '../api/storage';
import { setApiLocale } from '../api/client';

export const LOCALES = ['nl', 'en', 'de', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
};

export const LOCALE_SHORT: Record<Locale, string> = { nl: 'NL', en: 'EN', de: 'DE', fr: 'FR' };

const DICTIONARIES: Record<Locale, Translations> = { nl, en, de, fr };

function detectLocale(): Locale {
  try {
    const tags = Localization.getLocales?.() ?? [];
    for (const tag of tags) {
      const code = (tag.languageCode ?? '').toLowerCase();
      if ((LOCALES as readonly string[]).includes(code)) return code as Locale;
    }
  } catch {
    /* fall through */
  }
  return 'nl';
}

function lookup(dict: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), dict);
  return typeof value === 'string' ? value : undefined;
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  ready: boolean;
}

const I18nContext = createContext<I18nValue>({
  locale: 'nl',
  setLocale: () => undefined,
  t: (key) => key,
  ready: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('nl');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = (await getItem(StorageKeys.locale)) as Locale | null;
      const next = stored && (LOCALES as readonly string[]).includes(stored) ? stored : detectLocale();
      setLocaleState(next);
      setApiLocale(next);
      setReady(true);
    })();
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setApiLocale(next);
    void setItem(StorageKeys.locale, next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const raw = lookup(DICTIONARIES[locale], key) ?? lookup(nl, key) ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (acc, [name, value]) => acc.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
        raw,
      );
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, ready }), [locale, setLocale, t, ready]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Convenience hook when only the translate function is needed. */
export function useT(): TranslateFn {
  return useContext(I18nContext).t;
}
