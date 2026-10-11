import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  useFonts as usePlusJakartaFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep native splash visible while fonts are preparing
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [spaceGroteskLoaded] = useFonts({
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
  });

  const [plusJakartaLoaded] = usePlusJakartaFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
  });

  const fontsLoaded = spaceGroteskLoaded && plusJakartaLoaded;
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
      setReady(true);
    }
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
      setReady(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (!fontsLoaded && !ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#0F172A' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="role-select" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
