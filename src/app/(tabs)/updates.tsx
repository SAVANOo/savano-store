import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
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
    canInstallPackages,
    cacheStats,
    deviceCapabilities,
    installHistory,
    nativeAvailable,
    triggerAppAction,
    updateCatalogUrl,
    resetUrlToDefault,
    handleClearApkCache,
  } = useStore();

  const [draftUrl, setDraftUrl] = useState<string | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const [adminTaps, setAdminTaps] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(__DEV__);
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

  const handleVersionTap = () => {
    if (adminUnlocked) return;
    const next = adminTaps + 1;
    setAdminTaps(next);
    if (next >= 5) {
      setAdminUnlocked(true);
      Alert.alert('Modo Admin ativo', 'Edição da URL do catálogo liberada.');
    }
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>GERENCIAMENTO</Text>
          <Text style={styles.title}>Ajustes &amp; Histórico</Text>
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

        {pendingUpdates.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Atualizações Pendentes</Text>
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saúde &amp; Diagnóstico</Text>
          <Text style={styles.cardSub}>
            SDK Android: {deviceCapabilities.sdkInt > 0 ? `API ${deviceCapabilities.sdkInt}` : 'Web / Expo Go'}
          </Text>
          <Text style={styles.cardSub}>
            ABIs: {deviceCapabilities.supportedAbis.length > 0 ? deviceCapabilities.supportedAbis.join(', ') : 'N/A'}
          </Text>
          <Text style={styles.cardSub}>
            Fontes desconhecidas: {nativeAvailable ? (canInstallPackages ? 'Liberado' : 'Pendente') : 'Indisponível'}
          </Text>
        </View>

        {installHistory.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Histórico de Instalações ({installHistory.length})</Text>
            {installHistory.slice(0, 5).map((item, idx) => (
              <Text key={`${item.packageId}-${item.installedAt}-${idx}`} style={styles.cardSub}>
                • {item.name} v{item.versionName} ({item.versionCode})
              </Text>
            ))}
          </View>
        ) : null}

        {adminUnlocked ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Modo Admin — URL do Catálogo</Text>
            <Text style={styles.cardSub}>
              Altere apenas para homologação ou servidor alternativo HTTPS.
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
        ) : null}

        <Pressable onPress={handleVersionTap} style={styles.versionFooter}>
          <Text style={styles.versionText}>Savano Store v{appVersion}</Text>
        </Pressable>
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
  versionFooter: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  versionText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
