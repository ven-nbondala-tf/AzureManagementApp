import { contextBridge, ipcRenderer } from 'electron';

// Define the API exposed to the renderer
const electronAPI = {
  // Proxy fetch - routes all API calls through main process (required for production)
  proxyFetch: (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) =>
    ipcRenderer.invoke('proxy-fetch', url, options || {}),

  // Authentication (runs in main process to avoid CORS)
  auth: {
    authenticate: (clientId: string, tenantId: string, clientSecret: string) =>
      ipcRenderer.invoke('auth:authenticate', clientId, tenantId, clientSecret),
    acquireGraphToken: (clientId: string, tenantId: string, clientSecret: string) =>
      ipcRenderer.invoke('auth:acquire-graph-token', clientId, tenantId, clientSecret),
    acquireAzureToken: (clientId: string, tenantId: string, clientSecret: string) =>
      ipcRenderer.invoke('auth:acquire-azure-token', clientId, tenantId, clientSecret),
    acquireKeyVaultToken: (clientId: string, tenantId: string, clientSecret: string) =>
      ipcRenderer.invoke('auth:acquire-keyvault-token', clientId, tenantId, clientSecret),
    clearTokens: () => ipcRenderer.invoke('auth:clear-tokens'),
  },

  // Configuration
  config: {
    load: (filePath?: string) => ipcRenderer.invoke('config:load', filePath),
  },

  // Secure credential storage
  credentials: {
    store: (key: string, value: string) =>
      ipcRenderer.invoke('credentials:store', key, value),
    get: (key: string) => ipcRenderer.invoke('credentials:get', key),
    delete: (key: string) => ipcRenderer.invoke('credentials:delete', key),
    clearAll: () => ipcRenderer.invoke('credentials:clear-all'),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
  },

  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateChecking: (callback: () => void) => {
      ipcRenderer.on('update-checking', callback);
      return () => ipcRenderer.removeListener('update-checking', callback);
    },
    onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes?: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, info: { version: string; releaseDate: string; releaseNotes?: string }) => callback(info);
      ipcRenderer.on('update-available', handler);
      return () => ipcRenderer.removeListener('update-available', handler);
    },
    onUpdateNotAvailable: (callback: (info: { version: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, info: { version: string }) => callback(info);
      ipcRenderer.on('update-not-available', handler);
      return () => ipcRenderer.removeListener('update-not-available', handler);
    },
    onDownloadProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, progress: { percent: number; transferred: number; total: number }) => callback(progress);
      ipcRenderer.on('update-download-progress', handler);
      return () => ipcRenderer.removeListener('update-download-progress', handler);
    },
    onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, info: { version: string }) => callback(info);
      ipcRenderer.on('update-downloaded', handler);
      return () => ipcRenderer.removeListener('update-downloaded', handler);
    },
    onUpdateError: (callback: (error: { message: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, error: { message: string }) => callback(error);
      ipcRenderer.on('update-error', handler);
      return () => ipcRenderer.removeListener('update-error', handler);
    },
  },

  // Logging
  logger: {
    log: (level: string, message: string, ...args: unknown[]) =>
      ipcRenderer.send('log', level, message, ...args),
    info: (message: string, ...args: unknown[]) =>
      ipcRenderer.send('log', 'info', message, ...args),
    warn: (message: string, ...args: unknown[]) =>
      ipcRenderer.send('log', 'warn', message, ...args),
    error: (message: string, ...args: unknown[]) =>
      ipcRenderer.send('log', 'error', message, ...args),
    debug: (message: string, ...args: unknown[]) =>
      ipcRenderer.send('log', 'debug', message, ...args),
    getLogPath: () => ipcRenderer.invoke('get-log-path'),
    getRecentLogs: (lines?: number) => ipcRenderer.invoke('get-recent-logs', lines),
    clearLogs: () => ipcRenderer.invoke('clear-logs'),
  },

  // Secret Monitor Favorites
  favorites: {
    getAll: () => ipcRenderer.invoke('favorites:get-all'),
    save: (favorite: {
      id?: string;
      name: string;
      items: Array<{
        id: string;
        appId: string;
        displayName: string;
        type: 'Application' | 'ServicePrincipal';
      }>;
    }) => ipcRenderer.invoke('favorites:save', favorite),
    delete: (id: string) => ipcRenderer.invoke('favorites:delete', id),
  },

  // Key Vault API (runs in main process to bypass CSP)
  keyVault: {
    listSecrets: (params: {
      vaultUri: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => ipcRenderer.invoke('keyvault:list-secrets', params),

    getSecretValue: (params: {
      vaultUri: string;
      secretName: string;
      version?: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => ipcRenderer.invoke('keyvault:get-secret-value', params),

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
    }) => ipcRenderer.invoke('keyvault:set-secret', params),

    deleteSecret: (params: {
      vaultUri: string;
      secretName: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => ipcRenderer.invoke('keyvault:delete-secret', params),

    listVersions: (params: {
      vaultUri: string;
      secretName: string;
      clientId: string;
      tenantId: string;
      clientSecret: string;
    }) => ipcRenderer.invoke('keyvault:list-versions', params),

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
    }) => ipcRenderer.invoke('keyvault:update-attributes', params),
  },
};

// Expose the API to the renderer via the context bridge
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the exposed API
export type ElectronAPI = typeof electronAPI;
