import type { TranslateFn } from '../i18n';

const LOCALE_TAGS: Record<string, string> = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };

export function money(cents?: number | null, locale = 'nl', currency = 'EUR'): string {
  if (cents === null || cents === undefined) return '—';
  try {
    return new Intl.NumberFormat(LOCALE_TAGS[locale] ?? 'nl-NL', {
      style: 'currency',
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `€ ${(cents / 100).toFixed(2)}`;
  }
}

export function numberFmt(value: number, locale = 'nl'): string {
  try {
    return new Intl.NumberFormat(LOCALE_TAGS[locale] ?? 'nl-NL').format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(iso?: string | null, locale = 'nl'): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? 'nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatDateTime(iso?: string | null, locale = 'nl'): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(LOCALE_TAGS[locale] ?? 'nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function timeAgo(iso: string | null | undefined, t: TranslateFn, locale = 'nl'): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('common.justNow');
  if (minutes < 60) return t('common.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('common.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 14) return t('common.daysAgo', { n: days });
  return formatDate(iso, locale);
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** Deterministic colour for avatars without a picture. */
export function avatarColor(seed: string): string {
  const palette = ['#FF6A00', '#E35A00', '#2B6CB0', '#1B8A5A', '#5B3FBF', '#B7791F', '#C0392B'];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function toCents(input: string): number | undefined {
  const normalised = input.replace(/\s/g, '').replace(',', '.');
  if (!normalised) return undefined;
  const value = Number(normalised);
  if (Number.isNaN(value)) return undefined;
  return Math.round(value * 100);
}

export function fromCents(cents?: number | null): string {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toFixed(2);
}

export function toNumber(input: string): number | undefined {
  const normalised = input.replace(/\s/g, '').replace(',', '.');
  if (!normalised) return undefined;
  const value = Number(normalised);
  return Number.isNaN(value) ? undefined : value;
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
