import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { JourneyProvider } from '@/features/journey/JourneyProvider';

export default function AppLayout() {
  return (
    <JourneyProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#090d17' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="compare" />
          <Stack.Screen name="navigation" />
          <Stack.Screen name="explore" />
        </Stack>
      </ThemeProvider>
    </JourneyProvider>
  );
}
