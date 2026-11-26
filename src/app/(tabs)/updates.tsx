import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openInstallPermissionSettings } from '../../../modules/savano-installer';
import { AppCard } from '../../components/AppCard';
import { useStore } from '../../context/StoreContext';
import { colors, radii, spacing } from '../../theme/tokens';
import { computeAppStatus, formatBytes } from '../../utils/format';

export default function UpdatesAndConfigScreen() {
  const {
    catalog,
    catalogUrl,
    installedMap,
    downloads,
    isRefreshing,
    syncError,
    canInstallPackages,
    cacheStats,
    nativeAvailable,
    refreshAll,
    triggerAppAction,
    updateCatalogUrl,
    resetUrlToDefault,
    handleClearApkCache,
  } = useStore();

  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const urlInput = draftUrl ?? catalogUrl;

  const pendingUpdates = useMemo(() => {
    const apps = catalog?.apps ?? [];
    return apps.filter(
      (app) => computeAppStatus(app, installedMap[app.packageId]) === 'update_available'
    );
  }, [catalog, installedMap]);

  const onSaveUrl = async () => {
    setSavingUrl(true);
    try {
      await updateCatalogUrl(urlInput);
      setDraftUrl(null);
      Alert.alert('Catálogo atualizado', 'URL salva e catálogo sincronizado.');
    } catch (err) {
      Alert.alert(
        'URL inválida',
        err instanceof Error ? err.message : 'Verifique o endereço informado.'
      );
    } finally {
      setSavingUrl(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>MANUTENÇÃO & FONTE</Text>
          <Text style={styles.title}>Atualizações e Config</Text>
        </View>

        {nativeAvailable && !canInstallPackages ? (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>
              Permissão de instalação pendente
            </Text>
            <Text style={styles.permissionDesc}>
              O Android exige autorização explícita para a Savano Store instalar ou atualizar APKs.
            </Text>
            <Pressable
              onPress={() => {
                openInstallPermissionSettings();
              }}
              style={({ pressed }) => [styles.goldBtn, pressed && styles.pressed]}
            >
              <Text style={styles.goldBtnText}>Liberar nas Configurações</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.colFlex}>
              <Text style={styles.cardTitle}>Verificar atualizações</Text>
              <Text style={styles.cardSub}>
                {pendingUpdates.length > 0
                  ? `${pendingUpdates.length} app(s) com nova versão disponível`
                  : 'Todos os aplicativos verificados estão em dia'}
              </Text>
            </View>
            <Pressable
              onPress={() => void refreshAll()}
              disabled={isRefreshing}
              style={({ pressed }) => [styles.emeraldBtn, pressed && styles.pressed]}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#04120B" />
              ) : (
                <Text style={styles.emeraldBtnText}>Verificar</Text>
              )}
            </Pressable>
          </View>
          {syncError ? (
            <Text style={styles.errorText}>Última sincronização falhou: {syncError}</Text>
          ) : null}
        </View>

        {pendingUpdates.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pendentes</Text>
            {pendingUpdates.map((app) => (
              <AppCard
                key={app.packageId}
                app={app}
                installed={installedMap[app.packageId]}
                download={downloads[app.packageId]}
                onPressCard={() => {}}
                onPressAction={() => void triggerAppAction(app)}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>URL do Catálogo (catalog.json)</Text>
          <Text style={styles.cardSub}>
            Aponte para seu GitHub Pages, GitHub Raw ou servidor próprio.
          </Text>
          <TextInput
            value={urlInput}
            onChangeText={setDraftUrl}
            placeholder="https://.../catalog.json"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <View style={styles.btnRow}>
            <Pressable
              onPress={() => void onSaveUrl()}
              disabled={savingUrl}
              style={({ pressed }) => [styles.emeraldBtn, styles.flexBtn, pressed && styles.pressed]}
            >
              <Text style={styles.emeraldBtnText}>
                {savingUrl ? 'Salvando...' : 'Salvar e Sincronizar'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDraftUrl(null);
                void resetUrlToDefault();
              }}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
            >
              <Text style={styles.ghostBtnText}>Padrão</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.colFlex}>
              <Text style={styles.cardTitle}>Cache de APKs baixados</Text>
              <Text style={styles.cardSub}>
                {cacheStats.fileCount} arquivo(s) • {formatBytes(cacheStats.totalBytes)}
              </Text>
            </View>
            <Pressable
              onPress={() => void handleClearApkCache()}
              style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
            >
              <Text style={styles.dangerBtnText}>Limpar Cache</Text>
            </Pressable>
          </View>
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
  kicker: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.goldSoft,
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  permissionCard: {
    backgroundColor: colors.goldMuted,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  permissionTitle: {
    color: colors.goldSoft,
    fontSize: 15,
    fontWeight: '700',
  },
  permissionDesc: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  colFlex: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  cardSub: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexBtn: {
    flex: 1,
  },
  emeraldBtn: {
    backgroundColor: colors.emerald,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emeraldBtnText: {
    color: '#04120B',
    fontSize: 13,
    fontWeight: '700',
  },
  goldBtn: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  goldBtnText: {
    color: '#141002',
    fontSize: 13,
    fontWeight: '700',
  },
  ghostBtn: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerBtn: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  dangerBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
});
