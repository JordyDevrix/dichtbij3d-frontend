import React from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nProvider } from '../src/i18n';
import { AuthProvider } from '../src/context/AuthContext';
import { ListsProvider } from '../src/context/ListsContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AppHeader } from '../src/components/AppHeader';
import { BottomBar } from '../src/components/BottomBar';
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { HeaderScrollProvider } from '../src/context/HeaderScrollContext';
import { colors } from '../src/theme/theme';

function Shell() {
  const { isWide } = useBreakpoint();
  const { scheme } = useTheme();
  return (
    // Remounting on a palette swap is what makes every inline style pick up the
    // new token values without threading a theme object through the whole app.
    <View key={scheme} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'web' ? 'none' : 'fade',
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </View>
      <AppHeader />
      {!isWide && <BottomBar />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <AuthProvider>
                <ListsProvider>
                  <HeaderScrollProvider>
                    <Shell />
                  </HeaderScrollProvider>
                </ListsProvider>
              </AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
