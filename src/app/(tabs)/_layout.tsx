import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../context/StoreContext';
import { colors } from '../../theme/tokens';
import { computeAppStatus } from '../../utils/format';

export default function TabsLayout() {
  const { catalog, installedMap } = useStore();

  const pendingUpdatesCount = useMemo(() => {
    if (!catalog) return 0;
    return catalog.apps.filter(
      (app) => computeAppStatus(app, installedMap[app.packageId]) === 'update_available'
    ).length;
  }, [catalog, installedMap]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.emerald,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explorar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Ajustes',
          tabBarBadge: pendingUpdatesCount > 0 ? pendingUpdatesCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.gold,
            color: '#141002',
            fontSize: 11,
            fontWeight: '800',
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-download-outline" size={size} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
