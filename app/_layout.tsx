import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import '../src/i18n/config';

import { SupabaseProvider } from '../src/providers/SupabaseProvider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // Fix white background on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const s = document.documentElement.style;
      s.backgroundColor = '#022c22';
      s.height = '100%';
      s.overflow = 'hidden';
      document.body.style.backgroundColor = '#022c22';
      document.body.style.margin = '0';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      const root = document.getElementById('root') || document.getElementById('main');
      if (root) {
        root.style.height = '100%';
        root.style.overflow = 'auto';
        root.style.backgroundColor = '#022c22';
      }
    }
  }, []);

  return (
    <SupabaseProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="reservations/new" />
        <Stack.Screen name="reservations/options" />
        <Stack.Screen name="reservations/status" />
        <Stack.Screen name="reservations/mine" />
        <Stack.Screen name="experiences/[id]" />
      </Stack>
      <StatusBar style="light" />
    </SupabaseProvider>
  );
}
