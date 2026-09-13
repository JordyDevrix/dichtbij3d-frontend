import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';
import { Icon } from './Icon';
import { Muted, Segmented, Sheet } from './ui';
import { useI18n, LOCALES, LOCALE_LABELS, LOCALE_SHORT, Locale } from '../i18n';
import { useTheme, ThemePreference } from '../theme/ThemeContext';

/**
 * One place for the "quiet" settings: appearance and language. Keeping them out
 * of the main navigation is what stops the header from turning into a toolbar.
 */
export function PreferencesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference } = useTheme();

  const themeOptions: { value: ThemePreference; label: string; icon: 'sun' | 'moon' | 'laptop' }[] = [
    { value: 'light', label: t('prefs.light'), icon: 'sun' },
    { value: 'dark', label: t('prefs.dark'), icon: 'moon' },
    { value: 'system', label: t('prefs.system'), icon: 'laptop' },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t('prefs.title')} width={400}>
      <View style={{ gap: spacing.sm }}>
        <Text style={typography.label}>{t('prefs.appearance')}</Text>
        <Segmented value={preference} options={themeOptions} onChange={setPreference} />
        <Muted>{t('prefs.themeHint')}</Muted>
      </View>

      <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
        <Text style={typography.label}>{t('prefs.language')}</Text>
        {LOCALES.map((code: Locale) => {
          const active = code === locale;
          return (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setLocale(code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: 10,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                backgroundColor: active ? colors.orangeSoft : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: active ? colors.orangeDarker : colors.textFaint,
                  width: 24,
                }}
              >
                {LOCALE_SHORT[code]}
              </Text>
              <Text
                style={{
                  ...typography.bodyStrong,
                  flex: 1,
                  color: active ? colors.orangeDarker : colors.text,
                }}
              >
                {LOCALE_LABELS[code]}
              </Text>
              {active && <Icon name="check" size={13} color={colors.orange} />}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

export default PreferencesSheet;
