import React from 'react';
import { RefreshControl, ScrollView, useWindowDimensions, View, ViewStyle } from 'react-native';
import { colors, layout, spacing } from '../theme/theme';

export function Page({
  children,
  maxWidth = layout.maxWidth,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}) {
  const { width } = useWindowDimensions();
  const gutter = width >= 900 ? spacing.xl : spacing.lg;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.orange} /> : undefined
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
