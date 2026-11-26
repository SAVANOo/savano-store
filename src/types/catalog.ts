export interface CatalogAppEntry {
  packageId: string;
  name: string;
  tagline: string;
  description?: string;
  category?: string;
  iconUrl: string;
  versionName: string;
  versionCode: number;
  abi: string;
  apkUrl: string;
  sizeBytes: number;
  sha256: string;
  signerSha256?: string;
  screenshots?: string[];
  releasedAt: string;
  changelog: string[];
  minSdkVersion?: number;
}

export interface StoreCatalog {
  schemaVersion: number;
  storeName: string;
  updatedAt: string;
  apps: CatalogAppEntry[];
}

export type AppInstallStatus = 'not_installed' | 'update_available' | 'up_to_date';

export interface AppDownloadState {
  status: 'idle' | 'downloading' | 'verifying' | 'installing' | 'error';
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  errorMessage?: string;
}
