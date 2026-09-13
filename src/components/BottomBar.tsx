import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme/theme';
import { CountBadge } from './ui';
import { Icon } from './Icon';
import { isActive, TAB_ITEMS } from './AppHeader';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

const CREATE_HREF = '/create';

/**
 * Five tabs, with the create action as a raised centre button. Anything else
 * (calculator, security, admin, preferences) lives behind the avatar menu.
 */
export function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { unreadCount, unreadMessages } = useAuth();

  const badgeFor = (href: string) =>
    href === '/notifications' ? unreadCount : href === '/messages' ? unreadMessages : 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
        paddingHorizontal: spacing.xs,
      }}
    >
      {TAB_ITEMS.map((item) => {
        if (item.href === CREATE_HREF) {
          return (
            <View key={item.href} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
                onPress={() => router.push(CREATE_HREF as any)}
                style={({ pressed }) => ({
                  width: 50,
                  height: 50,
                  marginTop: -22,
                  borderRadius: 25,
                  backgroundColor: colors.orange,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 4,
                  borderColor: colors.surface,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  ...(Platform.OS === 'web'
                    ? ({ boxShadow: '0 6px 16px rgba(242, 101, 20, 0.4)' } as any)
                    : {
                        shadowColor: colors.orange,
                        shadowOpacity: 0.45,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 6,
                      }),
                })}
              >
                <Icon name="plus" size={19} color={colors.white} />
              </Pressable>
            </View>
          );
        }

        const active = isActive(pathname, item.href);
        const color = active ? colors.orange : colors.textFaint;
        return (
          <Pressable
            key={item.href}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => router.push(item.href as any)}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 }}
          >
            <View style={{ alignItems: 'center', justifyContent: 'center', height: 20 }}>
              <Icon name={item.icon} size={17} color={color} />
              {badgeFor(item.href) > 0 && (
                <View style={{ position: 'absolute', top: -5, right: -12 }}>
                  <CountBadge count={badgeFor(item.href)} size={15} />
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, fontWeight: active ? '700' : '600', color }} numberOfLines={1}>
              {t(item.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default BottomBar;
