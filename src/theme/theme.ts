import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Dichtbij3D design tokens.
 *
 * The brand colour is Dutch orange; everything around it is a neutral, slightly
 * cool grey scale so the orange is the only thing that shouts.
 *
 * The palette is a *mutable* object: `applyTheme()` swaps its contents and the
 * app remounts, so every inline style picks up the new values. That keeps the
 * ~30 call sites free of `useTheme()` boilerplate.
 */

export type ThemeMode = 'light' | 'dark';

export interface Palette {
  orange: string;
  orangeDark: string;
  orangeDarker: string;
  orangeSoft: string;
  orangeSofter: string;
  orangeBorder: string;

  ink: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  background: string;
  elevated: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;

  violet: string;
  violetSoft: string;

  white: string;
  black: string;
  overlay: string;
  skeleton: string;
}

const light: Palette = {
  orange: '#F26514',
  orangeDark: '#D9540B',
  orangeDarker: '#A8400A',
  orangeSoft: '#FFF0E6',
  orangeSofter: '#FFF7F2',
  orangeBorder: '#FFD2B5',

  ink: '#0B0F16',
  text: '#1F2733',
  textMuted: '#5B6573',
  textFaint: '#8A929E',
  border: '#E3E7EC',
  borderStrong: '#CDD3DB',
  surface: 'rgba(255, 255, 255, 0.75)',
  surfaceAlt: 'rgba(242, 244, 247, 0.75)',
  surfaceSunken: '#EDEFF3',
  background: '#F7F8FA',
  elevated: 'rgba(255, 255, 255, 0.85)',

  success: '#137A47',
  successSoft: '#E6F5EE',
  warning: '#9A6400',
  warningSoft: '#FBF1DD',
  danger: '#C62B1F',
  dangerSoft: '#FCEBE9',
  info: '#1B62C9',
  infoSoft: '#E8F1FD',

  violet: '#6236C9',
  violetSoft: '#EFE9FC',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(11, 15, 22, 0.45)',
  skeleton: '#E8EBEF',
};

const dark: Palette = {
  orange: '#FF7A29',
  orangeDark: '#FF8F4D',
  orangeDarker: '#FFB184',
  orangeSoft: '#3A1E0C',
  orangeSofter: '#241408',
  orangeBorder: '#5E3212',

  ink: '#F3F6FA',
  text: '#DDE3EA',
  textMuted: '#98A2B0',
  textFaint: '#717C8A',
  border: '#242B35',
  borderStrong: '#343D49',
  surface: 'rgba(18, 22, 29, 0.75)',
  surfaceAlt: 'rgba(26, 32, 42, 0.75)',
  surfaceSunken: '#0B0E13',
  background: '#0B0E13',
  elevated: 'rgba(23, 29, 38, 0.85)',

  success: '#3DD68C',
  successSoft: '#10291E',
  warning: '#E3B341',
  warningSoft: '#2C2312',
  danger: '#FF6B5E',
  dangerSoft: '#331816',
  info: '#5CA8FF',
  infoSoft: '#122437',

  violet: '#B196FF',
  violetSoft: '#1F1938',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(1, 3, 6, 0.7)',
  skeleton: '#1C232D',
};

export const palettes: Record<ThemeMode, Palette> = { light, dark };

/** Live palette. Never destructure at module scope — read `colors.x` in render. */
export const colors: Palette = { ...light };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

/** Native system UI stack — sharper and more familiar than the RN default. */
const fontFamily = Platform.select({
  web: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

export const shadow: { card: ViewStyle; raised: ViewStyle; header: ViewStyle } = {
  card: {},
  raised: {},
  header: {},
};

export const typography: Record<string, TextStyle> = {
  display: { fontFamily, fontSize: 36, fontWeight: '800', letterSpacing: -1, lineHeight: 42 },
  h1: { fontFamily, fontSize: 26, fontWeight: '700', letterSpacing: -0.6, lineHeight: 32 },
  h2: { fontFamily, fontSize: 19, fontWeight: '700', letterSpacing: -0.3, lineHeight: 25 },
  h3: { fontFamily, fontSize: 16, fontWeight: '600', letterSpacing: -0.1, lineHeight: 22 },
  body: { fontFamily, fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontFamily, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  small: { fontFamily, fontSize: 13, fontWeight: '400', lineHeight: 19 },
  tiny: { fontFamily, fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  label: { fontFamily, fontSize: 13, fontWeight: '600', lineHeight: 18 },
};

export const layout = {
  maxWidth: 1200,
  narrowWidth: 680,
};

/** Colour used for each advert type chip. Filled in by `applyTheme`. */
export const advertTypeColor: Record<string, { bg: string; fg: string }> = {
  PRINT_REQUEST: { bg: '', fg: '' },
  MODEL_REQUEST: { bg: '', fg: '' },
  MODEL_FOR_SALE: { bg: '', fg: '' },
  PRINT_FOR_SALE: { bg: '', fg: '' },
};

export const statusColor: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: '', fg: '' },
  ACCEPTED: { bg: '', fg: '' },
  COMPLETED: { bg: '', fg: '' },
  SOLD: { bg: '', fg: '' },
  CANCELLED: { bg: '', fg: '' },
  REMOVED: { bg: '', fg: '' },
};

let activeMode: ThemeMode = 'light';

export function currentMode(): ThemeMode {
  return activeMode;
}

/** Swap every derived token to match the active palette. */
export function applyTheme(next: ThemeMode) {
  activeMode = next;
  Object.assign(colors, palettes[next]);

  const web = Platform.OS === 'web';
  const isDark = next === 'dark';

  shadow.card = web
    ? ({ boxShadow: isDark ? 'none' : '0 1px 2px rgba(16, 24, 40, 0.05)' } as ViewStyle)
    : {
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.4 : 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      };
  shadow.raised = web
    ? ({
        boxShadow: isDark
          ? '0 16px 48px rgba(0, 0, 0, 0.6)'
          : '0 12px 32px rgba(16, 24, 40, 0.14), 0 2px 6px rgba(16, 24, 40, 0.06)',
      } as ViewStyle)
    : {
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.55 : 0.16,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      };
  shadow.header = web
    ? ({ boxShadow: isDark ? 'none' : '0 1px 0 rgba(16, 24, 40, 0.04)' } as ViewStyle)
    : { elevation: 0 };

  typography.display.color = colors.ink;
  typography.h1.color = colors.ink;
  typography.h2.color = colors.ink;
  typography.h3.color = colors.ink;
  typography.body.color = colors.text;
  typography.bodyStrong.color = colors.text;
  typography.small.color = colors.textMuted;
  typography.tiny.color = colors.textFaint;
  typography.label.color = colors.text;

  Object.assign(advertTypeColor, {
    PRINT_REQUEST: { bg: colors.orangeSoft, fg: colors.orangeDarker },
    MODEL_REQUEST: { bg: colors.infoSoft, fg: colors.info },
    MODEL_FOR_SALE: { bg: colors.violetSoft, fg: colors.violet },
    PRINT_FOR_SALE: { bg: colors.successSoft, fg: colors.success },
  });

  Object.assign(statusColor, {
    OPEN: { bg: colors.successSoft, fg: colors.success },
    ACCEPTED: { bg: colors.infoSoft, fg: colors.info },
    COMPLETED: { bg: colors.surfaceAlt, fg: colors.textMuted },
    SOLD: { bg: colors.surfaceAlt, fg: colors.textMuted },
    CANCELLED: { bg: colors.dangerSoft, fg: colors.danger },
    REMOVED: { bg: colors.dangerSoft, fg: colors.danger },
  });
}

applyTheme('light');
