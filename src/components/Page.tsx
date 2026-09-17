import React from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { colors, layout, spacing } from '../theme/theme';
import { HEADER_HEIGHT } from './AppHeader';
import { Footer } from './Footer';
import { MaintenanceScreen } from './MaintenanceScreen';
import { useHeaderScroll } from '../context/HeaderScrollContext';
import { useMaintenance } from '../context/MaintenanceContext';
import { useAuth } from '../context/AuthContext';

export function Page({
  children,
  hero,
  maxWidth = layout.maxWidth,
  refreshing,
  onRefresh,
  contentStyle,
  onScroll,
  hideFooter = false,
  fullBleed = false,
}: {
  children: React.ReactNode;
  hero?: React.ReactNode;
  maxWidth?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  hideFooter?: boolean;
  fullBleed?: boolean;
}) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { isMaintenanceActive } = useMaintenance();
  const { onScrollY, headerHeight: contextHeaderHeight } = useHeaderScroll();
  const gutter = width >= 900 ? spacing.xl : spacing.lg;
  const headerHeight = contextHeaderHeight > 0 ? contextHeaderHeight : HEADER_HEIGHT + insets.top;

  const isAuthRoute = pathname?.startsWith('/auth/');
  if (isMaintenanceActive && !isAdmin && !isAuthRoute) {
    return <MaintenanceScreen />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: headerHeight,
        paddingBottom: fullBleed ? 0 : spacing.xl,
        flexGrow: 1,
        justifyContent: fullBleed ? 'flex-start' : 'space-between',
      }}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(e) => {
        onScrollY(e.nativeEvent.contentOffset.y);
        onScroll?.(e);
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.orange}
            progressViewOffset={headerHeight}
          />
        ) : undefined
      }
    >
      <View style={{ width: '100%', flexGrow: 1 }}>
        {hero}
        <View
          style={[
            fullBleed
              ? {
                  width: '100%',
                  flexGrow: 1,
                }
              : {
                  width: '100%',
                  maxWidth,
                  alignSelf: 'center',
                  paddingHorizontal: gutter,
                  paddingTop: hero ? spacing.xl : gutter,
                  gap: spacing.lg,
                  flexGrow: 1,
                },
            contentStyle,
          ]}
        >
          {children}
        </View>
      </View>
      {!hideFooter && <Footer />}
    </ScrollView>
  );
}

export default Page;
