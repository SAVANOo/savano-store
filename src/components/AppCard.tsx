import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { InstalledAppInfo } from '../../modules/savano-installer';
import { colors, radii, spacing } from '../theme/tokens';
import type { AppDownloadState, CatalogAppEntry } from '../types/catalog';
import { computeAppStatus, formatBytes } from '../utils/format';
import { AppActionButton } from './AppActionButton';
import { AppIcon } from './AppIcon';

interface AppCardProps {
  app: CatalogAppEntry;
  installed?: InstalledAppInfo;
  download?: AppDownloadState;
  onPressCard: () => void;
  onPressAction: () => void;
}

export function AppCard({
  app,
  installed,
  download,
  onPressCard,
  onPressAction,
}: AppCardProps) {
  const status = computeAppStatus(app, installed);
  const isUpdate = status === 'update_available';

  return (
    <Pressable
      onPress={onPressCard}
      accessibilityRole="button"
      accessibilityLabel={`${app.name}, versão ${app.versionName}, ${formatBytes(app.sizeBytes)}`}
      style={({ pressed }) => [
        styles.card,
        isUpdate && styles.cardHighlight,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topRow}>
        <AppIcon uri={app.iconUrl} name={app.name} size={56} />
        <View style={styles.metaCol}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {app.name}
            </Text>
            {isUpdate ? (
              <View style={styles.updateBadge}>
                <Text style={styles.updateBadgeText}>NOVIDADES</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.tagline} numberOfLines={2}>
            {app.tagline}
          </Text>
          <View style={styles.chipsRow}>
            <Text style={styles.metaChip}>v{app.versionName}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaChip}>{formatBytes(app.sizeBytes)}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.metaChip}>{app.abi}</Text>
          </View>
        </View>
      </View>

      {isUpdate && app.changelog.length > 0 ? (
        <View style={styles.changelogPreview}>
          <Text style={styles.changelogText} numberOfLines={2}>
            • {app.changelog[0]}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.packageText} numberOfLines={1}>
          {app.packageId}
        </Text>
        <View style={styles.actionWrap}>
          <AppActionButton
            app={app}
            installed={installed}
            download={download}
            onPress={onPressAction}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHighlight: {
    borderColor: colors.gold,
    backgroundColor: '#14161A',
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  metaCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2,
  },
  updateBadge: {
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  updateBadgeText: {
    color: colors.goldSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaChip: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  dot: {
    color: colors.textMuted,
    fontSize: 12,
  },
  changelogPreview: {
    backgroundColor: colors.goldMuted,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changelogText: {
    color: colors.goldSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  packageText: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
  },
  actionWrap: {
    flexShrink: 0,
  },
});
