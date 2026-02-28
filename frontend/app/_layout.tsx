import '@/global.css';

import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider, useTheme } from '@/lib/themeContext';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { ErrorBoundary } from './error-boundary';
import { AppSplash } from '@/components/AppSplash';
import * as React from 'react';
import { View } from 'react-native';

function AppShell() {
  const { colorScheme } = useColorScheme();
  const [splashDone, setSplashDone] = React.useState(false);

  return (
    <NavThemeProvider value={NAV_THEME[colorScheme ?? 'dark']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
        {!splashDone && <AppSplash onReady={() => setSplashDone(true)} />}
      </View>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
