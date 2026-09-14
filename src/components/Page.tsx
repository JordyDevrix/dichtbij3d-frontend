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
import { colors, layout, spacing } from '../theme/theme';
import { HEADER_HEIGHT } from './AppHeader';
import { useHeaderScroll } from '../context/HeaderScrollContext';

export function Page({
  children,
  maxWidth = layout.maxWidth,
  refreshing,
  onRefresh,
  contentStyle,
  onScroll,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { onScrollY } = useHeaderScroll();
  const gutter = width >= 900 ? spacing.xl : spacing.lg;
  const headerHeight = HEADER_HEIGHT + insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: spacing.xxxl }}
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
      <View
        style={[
          {
            width: '100%',
            maxWidth,
            alignSelf: 'center',
            paddingHorizontal: gutter,
            paddingTop: gutter,
            gap: spacing.lg,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </ScrollView>
  );
}

export default Page;
