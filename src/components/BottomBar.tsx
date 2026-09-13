import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/theme';
import { Icon } from './Icon';
import { NAV_ITEMS } from './AppHeader';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

export function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { unreadCount } = useAuth();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingTop: spacing.sm,
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        const color = active ? colors.orange : colors.textFaint;
        const isCreate = item.href === '/create';
        return (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as any)}
            style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 }}
          >
            <View
              style={
                isCreate
                  ? {
                      backgroundColor: colors.orange,
                      width: 34,
                      height: 26,
                      borderRadius: 13,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }
                  : undefined
              }
            >
              <Icon name={item.icon} size={17} color={isCreate ? colors.white : color} />
              {item.href === '/notifications' && unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -8,
                    minWidth: 15,
                    height: 15,
                    paddingHorizontal: 3,
                    borderRadius: 8,
                    backgroundColor: colors.orange,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 9, fontWeight: '800' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, fontWeight: '700', color }}>{t(item.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default BottomBar;
