import React from 'react';
import { RefreshControl, ScrollView, View, ViewStyle } from 'react-native';
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
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
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
