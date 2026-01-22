/**
 * Azure Authentication Service
 * Handles token acquisition for Azure Management API and Microsoft Graph
 * Uses IPC to call main process for token acquisition (avoids CORS issues)
 */

interface TokenResponse {
  accessToken: string;
  expiresOn: Date;
}

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

// Token cache (stores the tokens received from main process)
let graphToken: TokenResponse | null = null;
let azureToken: TokenResponse | null = null;
let keyVaultToken: TokenResponse | null = null;

/**
 * Check if a token is expired or about to expire (within 5 minutes)
 */
function isTokenExpired(token: TokenResponse | null): boolean {
  if (!token) return true;
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  return token.expiresOn.getTime() - bufferTime < Date.now();
}

/**
 * Get a valid Graph API token, refreshing if necessary
 */
export async function getGraphToken(config: AuthConfig): Promise<string> {
  if (isTokenExpired(graphToken)) {
    const result = await window.electronAPI.auth.acquireGraphToken(
      config.clientId,
      config.tenantId,
      config.clientSecret
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to acquire Graph token');
    }

    graphToken = {
      accessToken: result.data.accessToken,
      expiresOn: new Date(result.data.expiresOn),
    };
  }
  return graphToken!.accessToken;
}

/**
 * Get a valid Azure Management API token, refreshing if necessary
 */
export async function getAzureToken(config: AuthConfig): Promise<string> {
  if (isTokenExpired(azureToken)) {
    const result = await window.electronAPI.auth.acquireAzureToken(
      config.clientId,
      config.tenantId,
      config.clientSecret
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to acquire Azure token');
    }

    azureToken = {
      accessToken: result.data.accessToken,
      expiresOn: new Date(result.data.expiresOn),
    };
  }
  return azureToken!.accessToken;
}

/**
 * Get a valid Key Vault API token, refreshing if necessary
 */
export async function getKeyVaultToken(config: AuthConfig): Promise<string> {
  if (isTokenExpired(keyVaultToken)) {
    const result = await window.electronAPI.auth.acquireKeyVaultToken(
      config.clientId,
      config.tenantId,
      config.clientSecret
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to acquire Key Vault token');
    }

    keyVaultToken = {
      accessToken: result.data.accessToken,
      expiresOn: new Date(result.data.expiresOn),
    };
  }
  return keyVaultToken!.accessToken;
}

/**
 * Authenticate and get both tokens
 */
export async function authenticate(
  config: AuthConfig
): Promise<{ graphToken: string; azureToken: string }> {
  const result = await window.electronAPI.auth.authenticate(
    config.clientId,
    config.tenantId,
    config.clientSecret
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to authenticate');
  }

  graphToken = {
    accessToken: result.data.graphToken,
    expiresOn: new Date(result.data.graphExpiresOn),
  };

  azureToken = {
    accessToken: result.data.azureToken,
    expiresOn: new Date(result.data.azureExpiresOn),
  };

  return {
    graphToken: result.data.graphToken,
    azureToken: result.data.azureToken,
  };
}

/**
 * Clear all cached tokens
 */
export function clearTokens(): void {
  graphToken = null;
  azureToken = null;
  keyVaultToken = null;
  // Also clear tokens in main process
  window.electronAPI.auth.clearTokens();
}

/**
 * Test authentication by acquiring tokens
 */
export async function testAuthentication(config: AuthConfig): Promise<boolean> {
  try {
    await authenticate(config);
    return true;
  } catch {
    return false;
  }
}
