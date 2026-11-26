import React, { useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { useStore } from '../../context/StoreContext';
import { colors, radii, spacing } from '../../theme/tokens';
import { computeAppStatus, formatShortDate } from '../../utils/format';

export default function ExploreScreen() {
  const router = useRouter();
  const {
    catalog,
    installedMap,
    downloads,
    isRefreshing,
    isOfflineFallback,
    lastSyncedAt,
    refreshAll,
    triggerAppAction,
  } = useStore();

  const { pendingUpdates, otherApps } = useMemo(() => {
    const apps = catalog?.apps ?? [];
    const updates = [];
    const rest = [];

    for (const app of apps) {
      const status = computeAppStatus(app, installedMap[app.packageId]);
      if (status === 'update_available') {
        updates.push(app);
      } else {
        rest.push(app);
      }
    }
    return { pendingUpdates: updates, otherApps: rest };
  }, [catalog, installedMap]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshAll()}
            tintColor={colors.emerald}
            colors={[colors.emerald]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.kicker}>DISTRIBUIÇÃO PESSOAL</Text>
            <View
              style={[
                styles.statusPill,
                isOfflineFallback ? styles.statusOffline : styles.statusOnline,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isOfflineFallback ? styles.statusOfflineText : styles.statusOnlineText,
                ]}
              >
                {isOfflineFallback ? 'Cache local' : 'Sincronizado'}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>Savano Store</Text>
          <Text style={styles.subtitle}>
            Builds assinados com verificação SHA-256 antes de cada instalação.
          </Text>
        </View>

        {pendingUpdates.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleGold}>
                Atualizações Disponíveis ({pendingUpdates.length})
              </Text>
            </View>
            <View style={styles.list}>
              {pendingUpdates.map((app) => (
                <AppCard
                  key={app.packageId}
                  app={app}
                  installed={installedMap[app.packageId]}
                  download={downloads[app.packageId]}
                  onPressCard={() => router.push(`/app/${encodeURIComponent(app.packageId)}`)}
                  onPressAction={() => void triggerAppAction(app)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Catálogo</Text>
            {lastSyncedAt ? (
              <Text style={styles.syncMeta}>Atualizado em {formatShortDate(lastSyncedAt)}</Text>
            ) : null}
          </View>

          {otherApps.length === 0 && pendingUpdates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Nenhum aplicativo no catálogo</Text>
              <Text style={styles.emptySub}>
                Puxe para atualizar ou configure a URL do catalog.json na aba Atualizações.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {otherApps.map((app) => (
                <AppCard
                  key={app.packageId}
                  app={app}
                  installed={installedMap[app.packageId]}
                  download={downloads[app.packageId]}
                  onPressCard={() => router.push(`/app/${encodeURIComponent(app.packageId)}`)}
                  onPressAction={() => void triggerAppAction(app)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emeraldDeep,
  },
  statusOffline: {
    backgroundColor: colors.goldMuted,
    borderColor: colors.gold,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusOnlineText: {
    color: colors.emerald,
  },
  statusOfflineText: {
    color: colors.goldSoft,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitleGold: {
    color: colors.goldSoft,
    fontSize: 16,
    fontWeight: '700',
  },
  syncMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  list: {
    gap: spacing.md,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
