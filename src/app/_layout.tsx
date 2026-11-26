import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeErrorBoundary } from '../components/SafeErrorBoundary';
import { StoreProvider } from '../context/StoreContext';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeErrorBoundary>
        <StoreProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.textPrimary,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="app/[packageId]"
              options={{
                title: 'Detalhes do App',
                headerBackTitle: 'Voltar',
              }}
            />
          </Stack>
        </StoreProvider>
      </SafeErrorBoundary>
    </SafeAreaProvider>
  );
}
