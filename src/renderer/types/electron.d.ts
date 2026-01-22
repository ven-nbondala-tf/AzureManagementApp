export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AzureConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export interface AuthTokenData {
  accessToken: string;
  expiresOn: number;
}

export interface AuthenticateResult {
  graphToken: string;
  azureToken: string;
  graphExpiresOn: number;
  azureExpiresOn: number;
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

export interface FavoriteItem {
  id: string;
  appId: string;
  displayName: string;
  type: 'Application' | 'ServicePrincipal';
}

export interface Favorite {
  id: string;
  name: string;
  items: FavoriteItem[];
  createdAt: string;
  updatedAt: string;
}

export interface KeyVaultSecretInfo {
  id: string;
  name: string;
  enabled: boolean;
  created: string | null;
  updated: string | null;
  expires: string | null;
  notBefore: string | null;
  contentType: string | null;
  tags: Record<string, string>;
  version?: string;
}

export interface KeyVaultSecretValue extends KeyVaultSecretInfo {
  value: string;
  version: string;
}

export interface KeyVaultSecretVersionInfo {
  id: string;
  version: string;
  enabled: boolean;
  created: string | null;
  updated: string | null;
  expires: string | null;
  notBefore: string | null;
}

export interface ElectronAPI {
  auth: {
    authenticate: (clientId: string, tenantId: string, clientSecret: string) => Promise<IpcResponse<AuthenticateResult>>;
    acquireGraphToken: (clientId: string, tenantId: string, clientSecret: string) => Promise<IpcResponse<AuthTokenData>>;
    acquireAzureToken: (clientId: string, tenantId: string, clientSecret: string) => Promise<IpcResponse<AuthTokenData>>;
    acquireKeyVaultToken: (clientId: string, tenantId: string, clientSecret: string) => Promise<IpcResponse<AuthTokenData>>;
    clearTokens: () => Promise<IpcResponse>;
  };
  config: {
    load: (filePath?: string) => Promise<IpcResponse<AzureConfig>>;
  };
  credentials: {
    store: (key: string, value: string) => Promise<IpcResponse>;
    get: (key: string) => Promise<IpcResponse<string | null>>;
    delete: (key: string) => Promise<IpcResponse>;
    clearAll: () => Promise<IpcResponse>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  updater: {
    checkForUpdates: () => Promise<void>;
    downloadUpdate: () => Promise<void>;
    installUpdate: () => Promise<void>;
    onUpdateChecking: (callback: () => void) => () => void;
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void;
    onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
    onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
    onUpdateError: (callback: (error: { message: string }) => void) => () => void;
  };
  logger: {
    log: (level: string, message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
    getLogPath: () => Promise<string>;
    getRecentLogs: (lines?: number) => Promise<string>;
    clearLogs: () => Promise<void>;
  };
  favorites: {
    getAll: () => Promise<IpcResponse<Favorite[]>>;
    save: (favorite: { id?: string; name: string; items: FavoriteItem[] }) => Promise<IpcResponse<Favorite>>;
    delete: (id: string) => Promise<IpcResponse>;
  };
  keyVault: {
    listSecrets: (params: {
      vaultUri: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => Promise<IpcResponse<KeyVaultSecretInfo[]>>;
    getSecretValue: (params: {
      vaultUri: string;
      secretName: string;
      version?: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => Promise<IpcResponse<KeyVaultSecretValue>>;
    setSecret: (params: {
      vaultUri: string;
      secretName: string;
      value: string;
      options?: {
        contentType?: string;
        enabled?: boolean;
        expires?: string;
        notBefore?: string;
        tags?: Record<string, string>;
      };
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => Promise<IpcResponse<KeyVaultSecretInfo>>;
    deleteSecret: (params: {
      vaultUri: string;
      secretName: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => Promise<IpcResponse>;
    listVersions: (params: {
      vaultUri: string;
      secretName: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => Promise<IpcResponse<KeyVaultSecretVersionInfo[]>>;
    updateAttributes: (params: {
      vaultUri: string;
      secretName: string;
      version: string;
      attributes: {
        enabled?: boolean;
        expires?: string | null;
        notBefore?: string | null;
        contentType?: string;
        tags?: Record<string, string>;
      };
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => Promise<IpcResponse>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
