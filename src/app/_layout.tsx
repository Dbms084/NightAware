import '../global.css';

import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { DarkTheme, ThemeProvider, Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/features/auth/providers/AuthProvider';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = segments[0] === '(auth)';
    const isAppRoute = segments[0] === '(app)';
    if (user && !isAppRoute) {
      router.replace('/(app)');
    } else if (!user && !isAuthRoute) {
      router.replace('/(auth)/sign-in');
    }
  }, [isLoading, router, segments, user]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0b1011]">
        <ActivityIndicator color="#80d6bf" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
