import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Dichtbij3D design tokens. The brand colour is Dutch orange.
 */
export const colors = {
  // Brand
  orange: '#FF6A00',
  orangeDark: '#E35A00',
  orangeDarker: '#B84A00',
  orangeSoft: '#FFF1E6',
  orangeSofter: '#FFF8F3',
  orangeBorder: '#FFD4B3',

  // Neutrals
  ink: '#171412',
  text: '#2B2724',
  textMuted: '#6E655E',
  textFaint: '#9A918A',
  border: '#E7E1DC',
  borderStrong: '#D5CCC5',
  surface: '#FFFFFF',
  surfaceAlt: '#FAF7F5',
  background: '#F6F2EF',

  // Semantic
  success: '#1B8A5A',
  successSoft: '#E4F5EC',
  warning: '#B7791F',
  warningSoft: '#FDF3E0',
  danger: '#C0392B',
  dangerSoft: '#FBEAE8',
  info: '#2B6CB0',
  infoSoft: '#E8F0FA',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(23, 20, 18, 0.55)',
};

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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const shadow = {
  card: Platform.select<ViewStyle>({
    web: { boxShadow: '0 1px 3px rgba(23,20,18,0.07), 0 6px 18px rgba(23,20,18,0.05)' } as ViewStyle,
    default: {
      shadowColor: '#171412',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
  })!,
  raised: Platform.select<ViewStyle>({
    web: { boxShadow: '0 8px 30px rgba(23,20,18,0.14)' } as ViewStyle,
    default: {
      shadowColor: '#171412',
      shadowOpacity: 0.16,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  })!,
};

export const typography: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, fontWeight: '400', color: colors.text, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 13, fontWeight: '400', color: colors.textMuted, lineHeight: 19 },
  tiny: { fontSize: 11, fontWeight: '600', color: colors.textFaint, letterSpacing: 0.3 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
};

export const layout = {
  maxWidth: 1180,
  narrowWidth: 720,
};

/** Colour used for each advert type chip. */
export const advertTypeColor: Record<string, { bg: string; fg: string }> = {
  PRINT_REQUEST: { bg: '#FFF1E6', fg: '#B84A00' },
  MODEL_REQUEST: { bg: '#E8F0FA', fg: '#2B6CB0' },
  MODEL_FOR_SALE: { bg: '#EDE7FB', fg: '#5B3FBF' },
  PRINT_FOR_SALE: { bg: '#E4F5EC', fg: '#1B8A5A' },
};

export const statusColor: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: colors.successSoft, fg: colors.success },
  ACCEPTED: { bg: colors.infoSoft, fg: colors.info },
  COMPLETED: { bg: colors.surfaceAlt, fg: colors.textMuted },
  SOLD: { bg: colors.surfaceAlt, fg: colors.textMuted },
  CANCELLED: { bg: colors.dangerSoft, fg: colors.danger },
  REMOVED: { bg: colors.dangerSoft, fg: colors.danger },
};
