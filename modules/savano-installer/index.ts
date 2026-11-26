import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export interface InstalledAppInfo {
  installed: boolean;
  versionCode: number | null;
  versionName: string | null;
}

export interface DownloadProgressEvent {
  packageId: string;
  bytesDownloaded: number;
  totalBytes: number;
  progress: number;
  phase: 'downloading' | 'verifying';
}

export interface DownloadVerifyResult {
  filePath: string;
  sha256: string;
  sizeBytes: number;
}

export interface ApkCacheStats {
  fileCount: number;
  totalBytes: number;
}

export interface ClearCacheResult {
  deletedCount: number;
  freedBytes: number;
}

interface NativeSavanoInstaller {
  getInstalledApps(packageIds: string[]): Promise<Record<string, InstalledAppInfo>>;
  canRequestPackageInstalls(): boolean;
  openInstallPermissionSettings(): boolean;
  downloadAndVerifyApk(
    packageId: string,
    apkUrl: string,
    expectedSha256: string
  ): Promise<DownloadVerifyResult>;
  installApk(filePath: string): Promise<boolean>;
  openApp(packageId: string): boolean;
  getApkCacheStats(): Promise<ApkCacheStats>;
  clearApkCache(): Promise<ClearCacheResult>;
  addListener?(eventName: string, listener: (event: DownloadProgressEvent) => void): EventSubscription;
}

const NativeModule = requireOptionalNativeModule<NativeSavanoInstaller>('SavanoInstaller');

export const isNativeInstallerAvailable = NativeModule !== null;

export function addDownloadProgressListener(
  listener: (event: DownloadProgressEvent) => void
): EventSubscription {
  if (!NativeModule?.addListener) {
    return { remove: () => {} };
  }
  return NativeModule.addListener('onDownloadProgress', listener);
}

export async function getInstalledApps(
  packageIds: string[]
): Promise<Record<string, InstalledAppInfo>> {
  if (!NativeModule) {
    const empty: Record<string, InstalledAppInfo> = {};
    for (const id of packageIds) {
      empty[id] = { installed: false, versionCode: null, versionName: null };
    }
    return empty;
  }
  return NativeModule.getInstalledApps(packageIds);
}

export function canRequestPackageInstalls(): boolean {
  if (!NativeModule) return false;
  return NativeModule.canRequestPackageInstalls();
}

export function openInstallPermissionSettings(): boolean {
  if (!NativeModule) return false;
  return NativeModule.openInstallPermissionSettings();
}

export async function downloadAndVerifyApk(
  packageId: string,
  apkUrl: string,
  expectedSha256: string
): Promise<DownloadVerifyResult> {
  if (!NativeModule) {
    throw new Error('Módulo nativo SavanoInstaller disponível apenas no build Android nativo.');
  }
  return NativeModule.downloadAndVerifyApk(packageId, apkUrl, expectedSha256);
}

export async function installApk(filePath: string): Promise<boolean> {
  if (!NativeModule) {
    throw new Error('Módulo nativo SavanoInstaller disponível apenas no build Android nativo.');
  }
  return NativeModule.installApk(filePath);
}

export function openApp(packageId: string): boolean {
  if (!NativeModule) return false;
  return NativeModule.openApp(packageId);
}

export async function getApkCacheStats(): Promise<ApkCacheStats> {
  if (!NativeModule) return { fileCount: 0, totalBytes: 0 };
  return NativeModule.getApkCacheStats();
}

export async function clearApkCache(): Promise<ClearCacheResult> {
  if (!NativeModule) return { deletedCount: 0, freedBytes: 0 };
  return NativeModule.clearApkCache();
}
