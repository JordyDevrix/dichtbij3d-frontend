import React, { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Logo } from './AppHeader';
import { Icon } from './Icon';
import { useI18n } from '../i18n';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { colors, layout, radius, spacing, typography } from '../theme/theme';

export function Footer() {
  const router = useRouter();
  const { t } = useI18n();
  const { isWide } = useBreakpoint();
  const year = new Date().getFullYear();

  const handleEmail = () => {
    void Linking.openURL('mailto:contact@jordyevrix.com');
  };

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        marginTop: spacing.xxl,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.xl,
          gap: spacing.xl,
        }}
      >
        {/* Main columns */}
        <View
          style={{
            flexDirection: isWide ? 'row' : 'column',
            justifyContent: 'space-between',
            gap: spacing.xl,
          }}
        >
          {/* Brand & info */}
          <View style={{ flex: isWide ? 2 : undefined, maxWidth: isWide ? 380 : undefined, gap: spacing.md }}>
            <Logo onPress={() => router.push('/')} />
            <Text style={[typography.body, { color: colors.textMuted, lineHeight: 20 }]}>
              {t('footer.aboutText')}
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={handleEmail}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                alignSelf: 'flex-start',
                paddingVertical: 4,
              }}
            >
              <Icon name="envelope" size={14} color={colors.orange} />
              <Text style={[typography.body, { color: colors.orange, fontWeight: '600' }]}>
                contact@jordyevrix.com
              </Text>
            </Pressable>
          </View>

          {/* Links: Marketplace */}
          <View style={{ gap: spacing.sm, minWidth: 160 }}>
            <Text style={[typography.label, { color: colors.ink, fontWeight: '700' }]}>
              {t('footer.marketplace')}
            </Text>
            <FooterLink label={t('footer.marketplace')} onPress={() => router.push('/')} />
            <FooterLink label={t('footer.calculator')} onPress={() => router.push('/calculator')} />
            <FooterLink label={t('footer.createAdvert')} onPress={() => router.push('/create')} />
          </View>

          {/* Links: Legal */}
          <View style={{ gap: spacing.sm, minWidth: 160 }}>
            <Text style={[typography.label, { color: colors.ink, fontWeight: '700' }]}>
              {t('footer.legal')}
            </Text>
            <FooterLink label={t('footer.privacy')} onPress={() => router.push('/privacy' as any)} />
            <FooterLink label={t('footer.terms')} onPress={() => router.push('/terms' as any)} />
            <FooterLink label={t('footer.disclaimer')} onPress={() => router.push('/disclaimer' as any)} />
            <FooterLink label={t('footer.security')} onPress={() => router.push('/settings/security')} />
          </View>
        </View>

        {/* Bottom copyright bar */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: spacing.lg,
            flexDirection: isWide ? 'row' : 'column',
            justifyContent: 'space-between',
            alignItems: isWide ? 'center' : 'flex-start',
            gap: spacing.sm,
          }}
        >
          <Text style={[typography.small, { color: colors.textMuted }]}>
            © {year} Dichtbij3D. {t('footer.copyright')}
          </Text>
          <Text style={[typography.small, { color: colors.textFaint }]}>
            Made with <Text style={{ color: colors.orange }}>♥</Text> for 3D printing makers in NL & BE
          </Text>
        </View>
      </View>
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{ paddingVertical: 4 }}
    >
      <Text
        style={[
          typography.body,
          {
            color: hovered ? colors.orange : colors.textMuted,
            ...(Platform.OS === 'web' ? ({ transition: 'color 150ms ease' } as any) : null),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
