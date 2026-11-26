import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppCard } from '../../components/AppCard';
import { SavanoLogoAnimated } from '../../components/SavanoLogoAnimated';
import { useStore } from '../../context/StoreContext';
import { colors, radii, spacing } from '../../theme/tokens';
import { computeAppStatus, formatShortDate } from '../../utils/format';

type FilterMode = 'all' | 'updates' | 'installed';

const STORE_PACKAGE_ID = 'com.savanostore.app';
const STORE_RELEASES_URL = 'https://github.com/SAVANOo/savano-store/releases/latest';

export default function ExploreScreen() {
  const router = useRouter();
  const {
    catalog,
    installedMap,
    downloads,
    isRefreshing,
    isOfflineFallback,
    syncError,
    lastSyncedAt,
    lastInstallBanner,
    dismissInstallBanner,
    refreshAll,
    triggerAppAction,
  } = useStore();

  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const storeSelfUpdate = useMemo(() => {
    const entry = catalog?.apps.find((a) => a.packageId === STORE_PACKAGE_ID);
    if (!entry) return null;
    const currentVersionCode = Constants.expoConfig?.android?.versionCode ?? 1;
    return entry.versionCode > currentVersionCode ? entry : null;
  }, [catalog]);

  const filteredApps = useMemo(() => {
    const apps = (catalog?.apps ?? []).filter((a) => a.packageId !== STORE_PACKAGE_ID);
    const q = query.trim().toLowerCase();

    return apps.filter((app) => {
      const status = computeAppStatus(app, installedMap[app.packageId]);
      if (filterMode === 'updates' && status !== 'update_available') return false;
      if (filterMode === 'installed' && status === 'not_installed') return false;
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.packageId.toLowerCase().includes(q) ||
        (app.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [catalog, filterMode, installedMap, query]);

  const { pendingUpdates, otherApps } = useMemo(() => {
    const updates = [];
    const rest = [];
    for (const app of filteredApps) {
      const status = computeAppStatus(app, installedMap[app.packageId]);
      if (status === 'update_available') {
        updates.push(app);
      } else {
        rest.push(app);
      }
    }
    return { pendingUpdates: updates, otherApps: rest };
  }, [filteredApps, installedMap]);

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
            <View style={styles.brandLeft}>
              <SavanoLogoAnimated size={40} spinning={isRefreshing} />
              <View>
                <Text style={styles.kicker}>SAVANO</Text>
                <Text style={styles.title}>Savano Store</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isOfflineFallback ? colors.gold : colors.emerald },
                ]}
              />
              <Pressable
                onPress={() => void refreshAll()}
                disabled={isRefreshing}
                accessibilityRole="button"
                accessibilityLabel="Verificar atualizações do catálogo"
                style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.emerald} />
                ) : (
                  <Ionicons name="refresh" size={18} color={colors.textPrimary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {storeSelfUpdate ? (
          <View style={styles.storeUpdateCard}>
            <Text style={styles.storeUpdateTitle}>
              Nova Savano Store v{storeSelfUpdate.versionName} disponível
            </Text>
            {storeSelfUpdate.changelog[0] ? (
              <Text style={styles.storeUpdateDesc}>• {storeSelfUpdate.changelog[0]}</Text>
            ) : null}
            <View style={styles.storeUpdateActions}>
              <Pressable
                onPress={() => void triggerAppAction(storeSelfUpdate)}
                style={styles.storeUpdateBtn}
              >
                <Text style={styles.storeUpdateBtnText}>Atualizar agora</Text>
              </Pressable>
              <Pressable
                onPress={() => void Linking.openURL(STORE_RELEASES_URL)}
                style={styles.storeUpdateLink}
              >
                <Text style={styles.storeUpdateLinkText}>Ver no GitHub</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {lastInstallBanner ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{lastInstallBanner}</Text>
            <Pressable
              onPress={dismissInstallBanner}
              accessibilityRole="button"
              accessibilityLabel="Fechar aviso de instalação"
            >
              <Text style={styles.dismissText}>OK</Text>
            </Pressable>
          </View>
        ) : null}

        {syncError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText} numberOfLines={2}>
              Usando cache local ({syncError})
            </Text>
            <Pressable
              onPress={() => void refreshAll()}
              accessibilityRole="button"
              accessibilityLabel="Tentar sincronizar catálogo novamente"
            >
              <Text style={styles.retryText}>Tentar</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.controlsWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar aplicativo ou categoria..."
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Buscar aplicativos no catálogo"
            style={styles.searchInput}
          />
          <View style={styles.chipsRow}>
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'updates', label: 'Atualizações' },
                { id: 'installed', label: 'Instalados' },
              ] as const
            ).map((chip) => {
              const active = filterMode === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setFilterMode(chip.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
              <Text style={styles.syncMeta}>{formatShortDate(lastSyncedAt)}</Text>
            ) : null}
          </View>

          {otherApps.length === 0 && pendingUpdates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Nenhum aplicativo encontrado</Text>
              <Text style={styles.emptySub}>
                Ajuste o filtro/busca ou toque em atualizar no topo.
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
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  kicker: {
    color: colors.emerald,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  storeUpdateCard: {
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 6,
  },
  storeUpdateTitle: {
    color: colors.goldSoft,
    fontSize: 14,
    fontWeight: '700',
  },
  storeUpdateDesc: {
    color: colors.textPrimary,
    fontSize: 12,
  },
  storeUpdateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  storeUpdateBtn: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  storeUpdateBtnText: {
    color: '#141002',
    fontSize: 12,
    fontWeight: '700',
  },
  storeUpdateLink: {
    paddingVertical: 6,
  },
  storeUpdateLinkText: {
    color: colors.textSecondary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  successBanner: {
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldDeep,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  successBannerText: {
    color: colors.emerald,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  dismissText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  errorBannerText: {
    color: colors.textPrimary,
    fontSize: 12,
    flex: 1,
  },
  retryText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  controlsWrap: {
    gap: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emerald,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.emerald,
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
