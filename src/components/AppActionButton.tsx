import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { InstalledAppInfo } from '../../modules/savano-installer';
import { colors, radii, spacing } from '../theme/tokens';
import type { AppDownloadState, CatalogAppEntry } from '../types/catalog';
import { computeAppStatus } from '../utils/format';

interface AppActionButtonProps {
  app: CatalogAppEntry;
  installed?: InstalledAppInfo;
  download?: AppDownloadState;
  onPress: () => void;
  fullWidth?: boolean;
}

export function AppActionButton({
  app,
  installed,
  download,
  onPress,
  fullWidth = false,
}: AppActionButtonProps) {
  const status = computeAppStatus(app, installed);
  const isBusy =
    download?.status === 'downloading' ||
    download?.status === 'verifying' ||
    download?.status === 'installing';

  if (isBusy && download) {
    const pct = Math.round((download.progress || 0) * 100);
    const label =
      download.status === 'verifying'
        ? 'Verificando SHA-256...'
        : download.status === 'installing'
          ? 'Abrindo instalador...'
          : `Baixando ${pct}%`;

    return (
      <View style={[styles.busyContainer, fullWidth && styles.fullWidth]}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.max(8, Math.min(100, pct))}%` },
          ]}
        />
        <View style={styles.busyInner}>
          <ActivityIndicator size="small" color={colors.emerald} />
          <Text style={styles.busyText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    );
  }

  let label = 'Instalar';
  let variantStyle: StyleProp<ViewStyle> = styles.installBtn;
  let textStyle: StyleProp<TextStyle> = styles.installText;

  if (status === 'update_available' && installed?.versionName) {
    label = `Atualizar v${installed.versionName} → v${app.versionName}`;
    variantStyle = styles.updateBtn;
    textStyle = styles.updateText;
  } else if (status === 'up_to_date') {
    label = 'Abrir';
    variantStyle = styles.openBtn;
    textStyle = styles.openText;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${app.name}`}
      style={({ pressed }) => [
        styles.baseBtn,
        variantStyle,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.baseText, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  installBtn: {
    backgroundColor: colors.emerald,
  },
  installText: {
    color: '#04120B',
    fontWeight: '700',
  },
  updateBtn: {
    backgroundColor: colors.gold,
  },
  updateText: {
    color: '#141002',
    fontWeight: '700',
  },
  openBtn: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  openText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  baseText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  busyContainer: {
    minHeight: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.emeraldDeep,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.emeraldMuted,
  },
  busyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  busyText: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '600',
  },
});
