import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { openAppSettings } from '../../../modules/savano-installer';
import { AppActionButton } from '../../components/AppActionButton';
import { AppIcon } from '../../components/AppIcon';
import { useStore } from '../../context/StoreContext';
import { colors, radii, spacing } from '../../theme/tokens';
import { formatBytes, formatShortDate, shortSha256 } from '../../utils/format';

export default function AppDetailScreen() {
  const { packageId } = useLocalSearchParams<{ packageId: string }>();
  const decodedId = decodeURIComponent(packageId ?? '');
  const { catalog, installedMap, downloads, triggerAppAction } = useStore();
  const [showFullHash, setShowFullHash] = useState(false);

  const app = useMemo(
    () => catalog?.apps.find((item) => item.packageId === decodedId),
    [catalog, decodedId]
  );

  if (!app) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundTitle}>Aplicativo não encontrado</Text>
        <Text style={styles.notFoundSub}>{decodedId}</Text>
      </View>
    );
  }

  const installed = installedMap[app.packageId];
  const download = downloads[app.packageId];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <AppIcon uri={app.iconUrl} name={app.name} size={76} />
        <View style={styles.heroMeta}>
          <Text style={styles.name}>{app.name}</Text>
          <Text style={styles.packageId}>{app.packageId}</Text>
          {app.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{app.category}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.tagline}>{app.tagline}</Text>

      <AppActionButton
        app={app}
        installed={installed}
        download={download}
        onPress={() => void triggerAppAction(app)}
        fullWidth
      />

      {installed?.installed ? (
        <Pressable
          onPress={() => {
            openAppSettings(app.packageId);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Abrir configurações do Android para ${app.name}`}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>Configurações / Desinstalar no Android</Text>
        </Pressable>
      ) : null}

      {app.screenshots && app.screenshots.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenshotsRow}>
          {app.screenshots.map((uri, idx) => (
            <Image key={`${idx}-${uri}`} source={{ uri }} style={styles.screenshot} resizeMode="cover" />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>VERSÃO REMOTA</Text>
          <Text style={styles.metricValue}>
            v{app.versionName} ({app.versionCode})
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>INSTALADA</Text>
          <Text style={styles.metricValue}>
            {installed?.installed
              ? `v${installed.versionName} (${installed.versionCode})`
              : 'Não instalado'}
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>TAMANHO / ABI</Text>
          <Text style={styles.metricValue}>
            {formatBytes(app.sizeBytes)} • {app.abi}
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>LANÇAMENTO</Text>
          <Text style={styles.metricValue}>{formatShortDate(app.releasedAt)}</Text>
        </View>
      </View>

      {app.description ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sobre o aplicativo</Text>
          <Text style={styles.description}>{app.description}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Novidades da versão {app.versionName}</Text>
        {app.changelog.length > 0 ? (
          <View style={styles.changelogList}>
            {app.changelog.map((item, idx) => (
              <View key={`${idx}-${item}`} style={styles.changelogRow}>
                <View style={styles.bullet} />
                <Text style={styles.changelogText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>Nenhuma nota de versão informada.</Text>
        )}
      </View>

      <Pressable
        onPress={() => setShowFullHash((prev) => !prev)}
        style={styles.sectionCard}
      >
        <View style={styles.hashHeader}>
          <Text style={styles.sectionTitle}>Integridade SHA-256</Text>
          <Text style={styles.hashToggle}>
            {showFullHash ? 'Ocultar' : 'Ver completo'}
          </Text>
        </View>
        <Text style={styles.hashValue} selectable>
          {showFullHash ? app.sha256 : shortSha256(app.sha256)}
        </Text>
        {app.signerSha256 ? (
          <View style={styles.signerWrap}>
            <Text style={styles.metricLabel}>CERTIFICADO DE ASSINATURA (SIGNER SHA-256)</Text>
            <Text style={styles.hashValue} selectable>
              {showFullHash ? app.signerSha256 : shortSha256(app.signerSha256)}
            </Text>
          </View>
        ) : null}
        <Text style={styles.mutedText}>
          Validado automaticamente pelo módulo nativo (SHA-256 + manifesto + certificado) antes de iniciar o instalador do Android.
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.bg,
  },
  notFound: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  notFoundTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  notFoundSub: {
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  hero: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  packageId: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  categoryPill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emeraldDeep,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  categoryText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '700',
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricBox: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  changelogList: {
    gap: spacing.sm,
    marginTop: 4,
  },
  changelogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
    marginTop: 7,
  },
  changelogText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  hashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hashToggle: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '600',
  },
  hashValue: {
    color: colors.goldSoft,
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: colors.bg,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  mutedText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  screenshotsRow: {
    gap: spacing.sm,
  },
  screenshot: {
    width: 180,
    height: 320,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signerWrap: {
    gap: 4,
    marginTop: 4,
  },
});
