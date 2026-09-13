import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, spacing, typography } from '../theme/theme';
import { Icon, IconName } from './Icon';
import { Avatar, Button, Muted, Row, Sheet } from './ui';
import { useAuth } from '../context/AuthContext';
import { useI18n, LOCALES, LOCALE_LABELS, LOCALE_SHORT, Locale } from '../i18n';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { absoluteUrl } from '../api/client';

interface NavItem {
  href: string;
  labelKey: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.marketplace', icon: 'layers' },
  { href: '/models', labelKey: 'nav.models', icon: 'cubes' },
  { href: '/create', labelKey: 'nav.create', icon: 'plus' },
  { href: '/calculator', labelKey: 'nav.calculator', icon: 'calculator' },
  { href: '/notifications', labelKey: 'nav.notifications', icon: 'bell' },
  { href: '/profile', labelKey: 'nav.profile', icon: 'user' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname === '/index';
  return pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={() => router.push(item.href as any)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.orangeSoft : hovered ? colors.surfaceAlt : 'transparent',
      }}
    >
      <Icon name={item.icon} size={13} color={active ? colors.orangeDarker : colors.textMuted} />
      <Text
        style={{
          fontSize: 14,
          fontWeight: active ? '700' : '600',
          color: active ? colors.orangeDarker : colors.textMuted,
        }}
      >
        {t(item.labelKey)}
      </Text>
    </Pressable>
  );
}

export function Logo({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: colors.orange,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="cube" size={17} color={colors.white} />
      </View>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }}>
        Dichtbij<Text style={{ color: colors.orange }}>3D</Text>
      </Text>
    </Pressable>
  );
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useI18n();
  const { user, isAdmin, unreadCount, logout } = useAuth();
  const { isWide } = useBreakpoint();
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingTop: insets.top,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Logo onPress={() => router.push('/')} />

        {isWide && (
          <Row gap={2} style={{ flex: 1, marginLeft: spacing.lg }}>
            {NAV_ITEMS.filter((item) => item.href !== '/notifications' && item.href !== '/profile').map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
            {isAdmin && (
              <NavLink
                item={{ href: '/admin', labelKey: 'nav.admin', icon: 'userShield' }}
                active={isActive(pathname, '/admin')}
              />
            )}
          </Row>
        )}
        {!isWide && <View style={{ flex: 1 }} />}

        <Pressable
          onPress={() => setLangOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 7,
            paddingHorizontal: 11,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Icon name="globe" size={12} color={colors.textMuted} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>{LOCALE_SHORT[locale]}</Text>
        </Pressable>

        {user ? (
          <>
            <Pressable onPress={() => router.push('/notifications')} style={{ padding: 8 }}>
              <Icon name="bell" size={17} color={colors.textMuted} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 0,
                    minWidth: 17,
                    height: 17,
                    borderRadius: 9,
                    paddingHorizontal: 4,
                    backgroundColor: colors.orange,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 10, fontWeight: '800' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => setMenuOpen(true)}>
              <Avatar name={user.displayName} uri={absoluteUrl(user.avatarUrl)} size={34} />
            </Pressable>
          </>
        ) : (
          <Row gap={spacing.sm}>
            <Button title={t('nav.login')} variant="ghost" size="sm" onPress={() => router.push('/auth/login')} />
            <Button title={t('nav.register')} size="sm" onPress={() => router.push('/auth/register')} />
          </Row>
        )}
      </View>

      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={t('common.language')} width={360}>
        {LOCALES.map((code: Locale) => (
          <Pressable
            key={code}
            onPress={() => {
              setLocale(code);
              setLangOpen(false);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: code === locale ? colors.orangeSofter : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.orange, width: 26 }}>
              {LOCALE_SHORT[code]}
            </Text>
            <Text style={{ ...typography.bodyStrong, flex: 1 }}>{LOCALE_LABELS[code]}</Text>
            {code === locale && <Icon name="check" size={14} color={colors.orange} />}
          </Pressable>
        ))}
      </Sheet>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={user?.displayName} width={380}>
        <Muted>{user?.email}</Muted>
        <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
          {[
            { href: '/profile', label: t('nav.profile'), icon: 'user' as IconName },
            { href: '/settings/security', label: t('nav.security'), icon: 'shield' as IconName },
            { href: '/models', label: t('models.mine'), icon: 'cubes' as IconName },
            ...(isAdmin ? [{ href: '/admin', label: t('nav.admin'), icon: 'userShield' as IconName }] : []),
          ].map((entry) => (
            <Pressable
              key={entry.href}
              onPress={() => {
                setMenuOpen(false);
                router.push(entry.href as any);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
              }}
            >
              <Icon name={entry.icon} size={14} color={colors.textMuted} />
              <Text style={typography.bodyStrong}>{entry.label}</Text>
            </Pressable>
          ))}
          <Button
            title={t('nav.logout')}
            icon="logout"
            variant="outline"
            full
            style={{ marginTop: spacing.sm }}
            onPress={() => {
              setMenuOpen(false);
              void logout();
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

export default AppHeader;
