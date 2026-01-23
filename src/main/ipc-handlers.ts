import { ipcMain, dialog, net } from 'electron';
import { SecureStorage } from './secure-storage';
import Store from 'electron-store';

/**
 * Helper to make HTTP requests using Electron's net module
 * This is more reliable than native fetch in production builds
 * as it properly handles system proxies and certificates
 */
async function electronFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: options.method || 'GET',
      url,
    });

    // Set headers
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        request.setHeader(key, value);
      }
    }

    let responseData = '';
    let statusCode = 0;

    request.on('response', (response) => {
      statusCode = response.statusCode;

      response.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      response.on('end', () => {
        resolve({
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          json: async () => JSON.parse(responseData),
          text: async () => responseData,
        });
      });

      response.on('error', (error) => {
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    // Write body if present
    if (options.body) {
      request.write(options.body);
    }

    request.end();
  });
}

const secureStorage = new SecureStorage();

// Electron Store for non-sensitive data (favorites, preferences)
interface StoreSchema {
  secretMonitorFavorites: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      appId: string;
      displayName: string;
      type: 'Application' | 'ServicePrincipal';
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
}

const store = new Store<StoreSchema>({
  defaults: {
    secretMonitorFavorites: [],
  },
});

// Token cache for the main process
interface TokenResponse {
  accessToken: string;
  expiresOn: number; // timestamp
}

let graphTokenCache: TokenResponse | null = null;
let azureTokenCache: TokenResponse | null = null;
let keyVaultTokenCache: TokenResponse | null = null;

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const AZURE_SCOPE = 'https://management.azure.com/.default';
const KEYVAULT_SCOPE = 'https://vault.azure.net/.default';

/**
 * Acquire an access token using client credentials flow (runs in main process - no CORS)
 */
async function acquireToken(
  clientId: string,
  tenantId: string,
  clientSecret: string,
  scope: string
): Promise<TokenResponse> {
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope,
    grant_type: 'client_credentials',
  });

  const response = await electronFetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorResponse = await response.json() as { error_description?: string; error?: string };
    throw new Error(
      errorResponse.error_description || errorResponse.error || 'Failed to acquire token'
    );
  }

  const data = await response.json() as { access_token: string; expires_in: number };

  return {
    accessToken: data.access_token,
    expiresOn: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Check if a token is expired or about to expire (within 5 minutes)
 */
function isTokenExpired(token: TokenResponse | null): boolean {
  if (!token) return true;
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  return token.expiresOn - bufferTime < Date.now();
}

export function setupIpcHandlers(): void {
  // Generic proxy fetch handler - allows renderer to make API calls through main process
  // This is necessary because fetch from renderer fails in production (file:// protocol)
  ipcMain.handle('proxy-fetch', async (_, url: string, options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }) => {
    try {
      const response = await electronFetch(url, options);
      const text = await response.text();
      return {
        success: true,
        data: {
          ok: response.ok,
          status: response.status,
          body: text,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Authentication handlers (run in main process to avoid CORS)
  ipcMain.handle('auth:acquire-graph-token', async (_, clientId: string, tenantId: string, clientSecret: string) => {
    try {
      if (isTokenExpired(graphTokenCache)) {
        graphTokenCache = await acquireToken(clientId, tenantId, clientSecret, GRAPH_SCOPE);
      }
      return { success: true, data: { accessToken: graphTokenCache!.accessToken, expiresOn: graphTokenCache!.expiresOn } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:acquire-azure-token', async (_, clientId: string, tenantId: string, clientSecret: string) => {
    try {
      if (isTokenExpired(azureTokenCache)) {
        azureTokenCache = await acquireToken(clientId, tenantId, clientSecret, AZURE_SCOPE);
      }
      return { success: true, data: { accessToken: azureTokenCache!.accessToken, expiresOn: azureTokenCache!.expiresOn } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:acquire-keyvault-token', async (_, clientId: string, tenantId: string, clientSecret: string) => {
    try {
      if (isTokenExpired(keyVaultTokenCache)) {
        keyVaultTokenCache = await acquireToken(clientId, tenantId, clientSecret, KEYVAULT_SCOPE);
      }
      return { success: true, data: { accessToken: keyVaultTokenCache!.accessToken, expiresOn: keyVaultTokenCache!.expiresOn } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:authenticate', async (_, clientId: string, tenantId: string, clientSecret: string) => {
    try {
      const [graphResult, azureResult] = await Promise.all([
        acquireToken(clientId, tenantId, clientSecret, GRAPH_SCOPE),
        acquireToken(clientId, tenantId, clientSecret, AZURE_SCOPE),
      ]);

      graphTokenCache = graphResult;
      azureTokenCache = azureResult;

      return {
        success: true,
        data: {
          graphToken: graphResult.accessToken,
          azureToken: azureResult.accessToken,
          graphExpiresOn: graphResult.expiresOn,
          azureExpiresOn: azureResult.expiresOn,
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('auth:clear-tokens', () => {
    graphTokenCache = null;
    azureTokenCache = null;
    keyVaultTokenCache = null;
    return { success: true };
  });

  // Configuration file handling
  ipcMain.handle('config:load', async (_, filePath?: string) => {
    try {
      if (!filePath) {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            { name: 'Config Files', extensions: ['txt', 'config'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'No file selected' };
        }

        filePath = result.filePaths[0];
      }

      const config = await secureStorage.loadConfigFile(filePath);
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Credential storage
  ipcMain.handle('credentials:store', async (_, key: string, value: string) => {
    try {
      await secureStorage.storeCredential(key, value);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('credentials:get', async (_, key: string) => {
    try {
      const value = await secureStorage.getCredential(key);
      return { success: true, data: value };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('credentials:delete', async (_, key: string) => {
    try {
      await secureStorage.deleteCredential(key);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('credentials:clear-all', async () => {
    try {
      await secureStorage.clearAllCredentials();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // App info
  ipcMain.handle('app:get-version', () => {
    const { app } = require('electron');
    return app.getVersion();
  });

  // Secret Monitor Favorites
  ipcMain.handle('favorites:get-all', () => {
    try {
      const favorites = store.get('secretMonitorFavorites', []);
      return { success: true, data: favorites };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('favorites:save', (_, favorite: {
    id?: string;
    name: string;
    items: Array<{
      id: string;
      appId: string;
      displayName: string;
      type: 'Application' | 'ServicePrincipal';
    }>;
  }) => {
    try {
      const favorites = store.get('secretMonitorFavorites', []);
      const now = new Date().toISOString();

      if (favorite.id) {
        // Update existing
        const index = favorites.findIndex((f) => f.id === favorite.id);
        if (index >= 0) {
          favorites[index] = {
            ...favorites[index],
            name: favorite.name,
            items: favorite.items,
            updatedAt: now,
          };
        }
      } else {
        // Create new
        const newFavorite = {
          id: `fav_${Date.now()}`,
          name: favorite.name,
          items: favorite.items,
          createdAt: now,
          updatedAt: now,
        };
        favorites.push(newFavorite);
      }

      store.set('secretMonitorFavorites', favorites);
      return { success: true, data: favorites };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('favorites:delete', (_, id: string) => {
    try {
      const favorites = store.get('secretMonitorFavorites', []);
      const filtered = favorites.filter((f) => f.id !== id);
      store.set('secretMonitorFavorites', filtered);
      return { success: true, data: filtered };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ============================================
  // Key Vault API handlers (bypass CSP)
  // ============================================

  // Helper to ensure we have a valid Key Vault token
  async function ensureKeyVaultToken(clientId: string, tenantId: string, clientSecret: string): Promise<string> {
    if (isTokenExpired(keyVaultTokenCache)) {
      keyVaultTokenCache = await acquireToken(clientId, tenantId, clientSecret, KEYVAULT_SCOPE);
    }
    return keyVaultTokenCache!.accessToken;
  }

  // List secrets in a Key Vault
  ipcMain.handle('keyvault:list-secrets', async (_, params: {
    vaultUri: string;
    clientId: string;
    tenantId: string;
    clientSecret: string;
  }) => {
    try {
      const token = await ensureKeyVaultToken(params.clientId, params.tenantId, params.clientSecret);
      const baseUrl = params.vaultUri.replace(/\/$/, '');

      const secrets: Array<{
        id: string;
        name: string;
        enabled: boolean;
        created: string | null;
        updated: string | null;
        expires: string | null;
        notBefore: string | null;
        contentType: string | null;
        tags: Record<string, string>;
      }> = [];

      let nextLink: string | null = `${baseUrl}/secrets?api-version=7.4`;

      while (nextLink) {
        const response = await electronFetch(nextLink, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to list secrets: ${response.status} ${errorText}`);
        }

        const data = await response.json() as {
          value: Array<{
            id: string;
            attributes: {
              enabled: boolean;
              created: number;
              updated: number;
              exp?: number;
              nbf?: number;
            };
            contentType?: string;
            tags?: Record<string, string>;
          }>;
          nextLink?: string;
        };

        for (const secret of data.value) {
          const name = secret.id.split('/').pop() || '';
          secrets.push({
            id: secret.id,
            name,
            enabled: secret.attributes.enabled,
            created: secret.attributes.created ? new Date(secret.attributes.created * 1000).toISOString() : null,
            updated: secret.attributes.updated ? new Date(secret.attributes.updated * 1000).toISOString() : null,
            expires: secret.attributes.exp ? new Date(secret.attributes.exp * 1000).toISOString() : null,
            notBefore: secret.attributes.nbf ? new Date(secret.attributes.nbf * 1000).toISOString() : null,
            contentType: secret.contentType || null,
            tags: secret.tags || {},
          });
        }

        nextLink = data.nextLink || null;
      }

      return { success: true, data: secrets };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get secret value
  ipcMain.handle('keyvault:get-secret-value', async (_, params: {
    vaultUri: string;
    secretName: string;
    version?: string;
    clientId: string;
    tenantId: string;
    clientSecret: string;
  }) => {
    try {
      const token = await ensureKeyVaultToken(params.clientId, params.tenantId, params.clientSecret);
      const baseUrl = params.vaultUri.replace(/\/$/, '');
      const versionPath = params.version ? `/${params.version}` : '';
      const url = `${baseUrl}/secrets/${params.secretName}${versionPath}?api-version=7.4`;

      const response = await electronFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get secret: ${response.status} ${errorText}`);
      }

      const data = await response.json() as {
        value: string;
        id: string;
        attributes: {
          enabled: boolean;
          created: number;
          updated: number;
          exp?: number;
          nbf?: number;
        };
        contentType?: string;
        tags?: Record<string, string>;
      };

      return {
        success: true,
        data: {
          value: data.value,
          id: data.id,
          name: params.secretName,
          version: data.id.split('/').pop() || '',
          enabled: data.attributes.enabled,
          created: data.attributes.created ? new Date(data.attributes.created * 1000).toISOString() : null,
          updated: data.attributes.updated ? new Date(data.attributes.updated * 1000).toISOString() : null,
          expires: data.attributes.exp ? new Date(data.attributes.exp * 1000).toISOString() : null,
          notBefore: data.attributes.nbf ? new Date(data.attributes.nbf * 1000).toISOString() : null,
          contentType: data.contentType || null,
          tags: data.tags || {},
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Set/create secret
  ipcMain.handle('keyvault:set-secret', async (_, params: {
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
  }) => {
    try {
      const token = await ensureKeyVaultToken(params.clientId, params.tenantId, params.clientSecret);
      const baseUrl = params.vaultUri.replace(/\/$/, '');
      const url = `${baseUrl}/secrets/${params.secretName}?api-version=7.4`;

      const body: {
        value: string;
        contentType?: string;
        attributes?: {
          enabled?: boolean;
          exp?: number;
          nbf?: number;
        };
        tags?: Record<string, string>;
      } = { value: params.value };

      if (params.options?.contentType) {
        body.contentType = params.options.contentType;
      }

      if (params.options?.enabled !== undefined || params.options?.expires || params.options?.notBefore) {
        body.attributes = {};
        if (params.options?.enabled !== undefined) {
          body.attributes.enabled = params.options.enabled;
        }
        if (params.options?.expires) {
          body.attributes.exp = Math.floor(new Date(params.options.expires).getTime() / 1000);
        }
        if (params.options?.notBefore) {
          body.attributes.nbf = Math.floor(new Date(params.options.notBefore).getTime() / 1000);
        }
      }

      if (params.options?.tags) {
        body.tags = params.options.tags;
      }

      const response = await electronFetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to set secret: ${response.status} ${errorText}`);
      }

      const data = await response.json() as {
        id: string;
        attributes: {
          enabled: boolean;
          created: number;
          updated: number;
          exp?: number;
          nbf?: number;
        };
        contentType?: string;
        tags?: Record<string, string>;
      };

      return {
        success: true,
        data: {
          id: data.id,
          name: params.secretName,
          version: data.id.split('/').pop() || '',
          enabled: data.attributes.enabled,
          created: data.attributes.created ? new Date(data.attributes.created * 1000).toISOString() : null,
          updated: data.attributes.updated ? new Date(data.attributes.updated * 1000).toISOString() : null,
          expires: data.attributes.exp ? new Date(data.attributes.exp * 1000).toISOString() : null,
          notBefore: data.attributes.nbf ? new Date(data.attributes.nbf * 1000).toISOString() : null,
          contentType: data.contentType || null,
          tags: data.tags || {},
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Delete secret
  ipcMain.handle('keyvault:delete-secret', async (_, params: {
    vaultUri: string;
    secretName: string;
    clientId: string;
    tenantId: string;
    clientSecret: string;
  }) => {
    try {
      const token = await ensureKeyVaultToken(params.clientId, params.tenantId, params.clientSecret);
      const baseUrl = params.vaultUri.replace(/\/$/, '');
      const url = `${baseUrl}/secrets/${params.secretName}?api-version=7.4`;

      const response = await electronFetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete secret: ${response.status} ${errorText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // List secret versions
  ipcMain.handle('keyvault:list-versions', async (_, params: {
    vaultUri: string;
    secretName: string;
    clientId: string;
    tenantId: string;
    clientSecret: string;
  }) => {
    try {
      const token = await ensureKeyVaultToken(params.clientId, params.tenantId, params.clientSecret);
      const baseUrl = params.vaultUri.replace(/\/$/, '');

      const versions: Array<{
        id: string;
        version: string;
        enabled: boolean;
        created: string | null;
        updated: string | null;
        expires: string | null;
        notBefore: string | null;
      }> = [];

      let nextLink: string | null = `${baseUrl}/secrets/${params.secretName}/versions?api-version=7.4`;

      while (nextLink) {
        const response = await electronFetch(nextLink, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to list versions: ${response.status} ${errorText}`);
        }

        const data = await response.json() as {
          value: Array<{
            id: string;
            attributes: {
              enabled: boolean;
              created: number;
              updated: number;
              exp?: number;
              nbf?: number;
            };
          }>;
          nextLink?: string;
        };

        for (const version of data.value) {
          const versionId = version.id.split('/').pop() || '';
          versions.push({
            id: version.id,
            version: versionId,
            enabled: version.attributes.enabled,
            created: version.attributes.created ? new Date(version.attributes.created * 1000).toISOString() : null,
            updated: version.attributes.updated ? new Date(version.attributes.updated * 1000).toISOString() : null,
            expires: version.attributes.exp ? new Date(version.attributes.exp * 1000).toISOString() : null,
            notBefore: version.attributes.nbf ? new Date(version.attributes.nbf * 1000).toISOString() : null,
          });
        }

        nextLink = data.nextLink || null;
      }

      return { success: true, data: versions };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Update secret attributes
  ipcMain.handle('keyvault:update-attributes', async (_, params: {
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
  }) => {
    try {
      const token = await ensureKeyVaultToken(params.clientId, params.tenantId, params.clientSecret);
      const baseUrl = params.vaultUri.replace(/\/$/, '');
      const url = `${baseUrl}/secrets/${params.secretName}/${params.version}?api-version=7.4`;

      const body: {
        contentType?: string;
        attributes?: {
          enabled?: boolean;
          exp?: number | null;
          nbf?: number | null;
        };
        tags?: Record<string, string>;
      } = {};

      if (params.attributes.contentType !== undefined) {
        body.contentType = params.attributes.contentType;
      }

      if (params.attributes.enabled !== undefined || params.attributes.expires !== undefined || params.attributes.notBefore !== undefined) {
        body.attributes = {};
        if (params.attributes.enabled !== undefined) {
          body.attributes.enabled = params.attributes.enabled;
        }
        if (params.attributes.expires !== undefined) {
          body.attributes.exp = params.attributes.expires ? Math.floor(new Date(params.attributes.expires).getTime() / 1000) : null;
        }
        if (params.attributes.notBefore !== undefined) {
          body.attributes.nbf = params.attributes.notBefore ? Math.floor(new Date(params.attributes.notBefore).getTime() / 1000) : null;
        }
      }

      if (params.attributes.tags !== undefined) {
        body.tags = params.attributes.tags;
      }

      const response = await electronFetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update attributes: ${response.status} ${errorText}`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
