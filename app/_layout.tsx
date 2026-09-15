import React from 'react';
import { Platform, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nProvider } from '../src/i18n';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ListsProvider } from '../src/context/ListsContext';
import { ToastProvider } from '../src/context/ToastContext';
import { MaintenanceProvider, useMaintenance } from '../src/context/MaintenanceContext';
import { MaintenanceScreen } from '../src/components/MaintenanceScreen';
import { AppHeader } from '../src/components/AppHeader';
import { BottomBar } from '../src/components/BottomBar';
import { useBreakpoint } from '../src/hooks/useBreakpoint';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { HeaderScrollProvider } from '../src/context/HeaderScrollContext';
import { colors } from '../src/theme/theme';

function Shell() {
  const { isWide } = useBreakpoint();
  const { scheme } = useTheme();
  const pathname = usePathname();
  const { isAdmin, booting: authBooting } = useAuth();
  const { isMaintenanceActive, loading: maintenanceLoading } = useMaintenance();

  // If maintenance mode is active and user is not an administrator,
  // show the maintenance screen, unless they are on an authentication screen (/auth/login etc.)
  const isAuthRoute = pathname?.startsWith('/auth/');
  const showMaintenanceBlock = !authBooting && !maintenanceLoading && isMaintenanceActive && !isAdmin && !isAuthRoute;

  return (
    // Remounting on a palette swap is what makes every inline style pick up the
    // new token values without threading a theme object through the whole app.
    <View key={scheme} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {showMaintenanceBlock ? (
        <MaintenanceScreen />
      ) : (
        <>
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
        </>
      )}
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
                <MaintenanceProvider>
                  <ListsProvider>
                    <HeaderScrollProvider>
                      <Shell />
                    </HeaderScrollProvider>
                  </ListsProvider>
                </MaintenanceProvider>
              </AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

