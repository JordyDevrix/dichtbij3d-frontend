import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { colors, layout, radius, spacing, typography } from '../theme/theme';
import { Icon, IconName } from './Icon';
import { Avatar, Button, CountBadge, Divider, MenuItem, Muted, Row, Sheet } from './ui';
import { PreferencesSheet } from './PreferencesSheet';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { absoluteUrl } from '../api/client';
import { useHeaderScroll } from '../context/HeaderScrollContext';

export const HEADER_HEIGHT = 58;

export interface NavItem {
  href: string;
  labelKey: string;
  icon: IconName;
}

/** Desktop top navigation — browsing destinations only. */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/', labelKey: 'nav.marketplace', icon: 'layers' },
  { href: '/models', labelKey: 'nav.models', icon: 'cubes' },
  { href: '/calculator', labelKey: 'nav.calculator', icon: 'calculator' },
];

/**
 * Phone tab bar — exactly five slots with "create" in the middle, so the primary
 * action sits under the thumb and the bar stays symmetrical.
 */
export const TAB_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.marketplace', icon: 'layers' },
  { href: '/models', labelKey: 'nav.models', icon: 'cubes' },
  { href: '/create', labelKey: 'nav.create', icon: 'plus' },
  { href: '/notifications', labelKey: 'nav.notifications', icon: 'bell' },
  { href: '/profile', labelKey: 'nav.profile', icon: 'user' },
];

export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname === '/index';
  return pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(item.href as any)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: radius.md,
        backgroundColor: active || hovered ? colors.surfaceAlt : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: active ? '600' : '500',
          color: active ? colors.ink : colors.textMuted,
        }}
      >
        {t(item.labelKey)}
      </Text>
      {active && (
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: -11,
            height: 2,
            borderRadius: 2,
            backgroundColor: colors.orange,
          }}
        />
      )}
    </Pressable>
  );
}

export function Logo({ onPress, compact }: { onPress?: () => void; compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          backgroundColor: colors.orange,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="cube" size={15} color={colors.white} />
      </View>
      {!compact && (
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 }}>
          Dichtbij<Text style={{ color: colors.orange }}>3D</Text>
        </Text>
      )}
    </Pressable>
  );
}

/** Small circular icon button used for the header actions. */
function HeaderAction({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{
        width: 34,
        height: 34,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: hovered ? colors.surfaceAlt : 'transparent',
      }}
    >
      <Icon name={icon} size={15} color={colors.textMuted} />
      {!!badge && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 1,
            right: badge > 9 ? -4 : 0,
            borderWidth: 2,
            borderColor: colors.surface,
            borderRadius: radius.pill,
          }}
        >
          <CountBadge count={badge} size={16} />
        </View>
      )}
    </Pressable>
  );
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user, isAdmin, unreadCount, unreadMessages, logout } = useAuth();
  const { isWide } = useBreakpoint();
  const { scheme } = useTheme();
  const { isScrolled } = useHeaderScroll();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href as any);
  };

  return (
    <BlurView
      intensity={isScrolled ? 80 : 0}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          backgroundColor: isScrolled ? colors.surface : 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: isScrolled ? colors.border : 'transparent',
          paddingTop: insets.top,
          ...(Platform.OS === 'web'
            ? ({
                backdropFilter: isScrolled ? 'saturate(180%) blur(16px)' : 'none',
                WebkitBackdropFilter: isScrolled ? 'saturate(180%) blur(16px)' : 'none',
                transitionProperty:
                  'background-color, border-color, backdrop-filter, -webkit-backdrop-filter, box-shadow',
                transitionDuration: '240ms',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isScrolled
                  ? scheme === 'dark'
                    ? '0 4px 20px rgba(0, 0, 0, 0.35)'
                    : '0 4px 20px rgba(0, 0, 0, 0.04)'
                  : 'none',
              } as any)
            : null),
        },
      ]}
    >
      <View
        style={{
          width: '100%',
          maxWidth: layout.maxWidth,
          alignSelf: 'center',
          paddingHorizontal: spacing.lg,
          height: 58,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Logo onPress={() => router.push('/')} />

        {isWide ? (
          <Row gap={2} style={{ flex: 1, marginLeft: spacing.xl }}>
            {PRIMARY_NAV.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
            {isAdmin && (
              <NavLink
                item={{ href: '/admin', labelKey: 'nav.admin', icon: 'userShield' }}
                active={isActive(pathname, '/admin')}
              />
            )}
          </Row>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {isWide && user && (
          <Button
            title={t('nav.create')}
            icon="plus"
            size="sm"
            style={{ alignSelf: 'center' }}
            onPress={() => router.push('/create')}
          />
        )}

        {user ? (
          <>
            <HeaderAction
              icon="envelope"
              label={t('chat.title')}
              badge={unreadMessages}
              onPress={() => router.push('/messages')}
            />
            {isWide && (
              <HeaderAction
                icon="bell"
                label={t('nav.notifications')}
                badge={unreadCount}
                onPress={() => router.push('/notifications')}
              />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={user.displayName}
              onPress={() => setMenuOpen(true)}
              style={{ marginLeft: 2 }}
            >
              <Avatar name={user.displayName} uri={absoluteUrl(user.avatarUrl)} size={32} />
            </Pressable>
          </>
        ) : (
          <Row gap={spacing.xs}>
            <HeaderAction icon="gear" label={t('prefs.title')} onPress={() => setPrefsOpen(true)} />
            {isWide && (
              <Button title={t('nav.login')} variant="ghost" size="sm" onPress={() => router.push('/auth/login')} />
            )}
            <Button title={t('nav.register')} size="sm" onPress={() => router.push('/auth/register')} />
          </Row>
        )}
      </View>

      <PreferencesSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={user?.displayName} width={360}>
        <Muted style={{ marginTop: -spacing.sm }}>{user?.email}</Muted>
        <View style={{ gap: 2, marginTop: spacing.sm }}>
          <MenuItem icon="user" label={t('nav.profile')} onPress={() => go('/profile')} />
          <MenuItem icon="layers" label={t('profile.myAdverts')} onPress={() => go('/my-adverts')} />
          <MenuItem
            icon="envelope"
            label={t('chat.title')}
            badge={unreadMessages}
            onPress={() => go('/messages')}
          />
          <MenuItem icon="cubes" label={t('models.mine')} onPress={() => go('/models')} />
          <MenuItem icon="star" label={t('nav.favourites')} onPress={() => go('/favourites')} />
          <MenuItem icon="calculator" label={t('nav.calculator')} onPress={() => go('/calculator')} />
          <MenuItem icon="shield" label={t('nav.security')} onPress={() => go('/settings/security')} />
          <MenuItem icon="bell" label={t('notifications.settingsTitle')} onPress={() => go('/settings/notifications')} />
          {isAdmin && <MenuItem icon="userShield" label={t('nav.admin')} onPress={() => go('/admin')} />}
          <Divider style={{ marginVertical: spacing.sm }} />
          <MenuItem
            icon="gear"
            label={t('prefs.title')}
            onPress={() => {
              setMenuOpen(false);
              setPrefsOpen(true);
            }}
          />
          <MenuItem
            icon="logout"
            label={t('nav.logout')}
            tone="danger"
            onPress={() => {
              setMenuOpen(false);
              void logout();
            }}
          />
        </View>
      </Sheet>
    </BlurView>
  );
}

export default AppHeader;
