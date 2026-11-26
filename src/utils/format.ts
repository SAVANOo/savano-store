import type { InstalledAppInfo } from '../../modules/savano-installer';
import type { AppInstallStatus, CatalogAppEntry } from '../types/catalog';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value >= 100 || exp === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exp]}`;
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function shortSha256(hash: string): string {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
}

export function computeAppStatus(
  app: CatalogAppEntry,
  installed?: InstalledAppInfo
): AppInstallStatus {
  if (!installed || !installed.installed || installed.versionCode === null) {
    return 'not_installed';
  }
  if (app.versionCode > installed.versionCode) {
    return 'update_available';
  }
  return 'up_to_date';
}
