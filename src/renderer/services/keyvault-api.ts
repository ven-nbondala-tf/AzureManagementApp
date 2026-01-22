/**
 * Azure Key Vault API Service
 * Handles Key Vault management and secret operations
 * Secret operations run via IPC to bypass CSP (Key Vault URLs are dynamic)
 */

import { getAzureToken } from './azure-auth';

const AZURE_API_BASE = 'https://management.azure.com';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export interface KeyVault {
  id: string;
  name: string;
  type: string;
  location: string;
  resourceGroup: string;
  properties: {
    vaultUri: string;
    tenantId: string;
    sku: {
      family: string;
      name: string;
    };
    enabledForDeployment?: boolean;
    enabledForDiskEncryption?: boolean;
    enabledForTemplateDeployment?: boolean;
    enableSoftDelete?: boolean;
    softDeleteRetentionInDays?: number;
    enablePurgeProtection?: boolean;
    enableRbacAuthorization?: boolean;
  };
  tags?: Record<string, string>;
}

export interface KeyVaultSecret {
  id: string;
  name: string;
  contentType?: string;
  enabled: boolean;
  created?: string;
  updated?: string;
  expires?: string;
  notBefore?: string;
  tags?: Record<string, string>;
}

export interface KeyVaultSecretVersion {
  id: string;
  name: string;
  enabled: boolean;
  created?: string;
  updated?: string;
  expires?: string;
}

export interface SecretValue {
  value: string;
  id: string;
  contentType?: string;
}

/**
 * List all Key Vaults in a subscription
 * This uses the Azure Management API (management.azure.com) which is in CSP
 */
export async function listKeyVaults(
  config: AuthConfig,
  subscriptionId: string
): Promise<KeyVault[]> {
  const token = await getAzureToken(config);

  interface Response {
    value: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
      properties: KeyVault['properties'];
      tags?: Record<string, string>;
    }>;
    nextLink?: string;
  }

  const allVaults: KeyVault[] = [];
  let url = `${AZURE_API_BASE}/subscriptions/${subscriptionId}/providers/Microsoft.KeyVault/vaults?api-version=2023-07-01`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error?.message || `Failed to list Key Vaults: ${response.status}`
      );
    }

    const data: Response = await response.json();

    for (const vault of data.value) {
      // Extract resource group from ID
      const rgMatch = vault.id.match(/resourceGroups\/([^/]+)/i);
      const resourceGroup = rgMatch ? rgMatch[1] : '';

      allVaults.push({
        ...vault,
        resourceGroup,
      });
    }

    url = data.nextLink || '';
  }

  return allVaults.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * List all secrets in a Key Vault (via IPC to bypass CSP)
 */
export async function listSecrets(
  config: AuthConfig,
  vaultUri: string
): Promise<KeyVaultSecret[]> {
  const result = await window.electronAPI.keyVault.listSecrets({
    vaultUri,
    clientId: config.clientId,
    tenantId: config.tenantId,
    clientSecret: config.clientSecret,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to list secrets');
  }

  // Transform the response to match our interface
  return (result.data || []).map((secret) => ({
    id: secret.id,
    name: secret.name,
    contentType: secret.contentType || undefined,
    enabled: secret.enabled,
    created: secret.created || undefined,
    updated: secret.updated || undefined,
    expires: secret.expires || undefined,
    notBefore: secret.notBefore || undefined,
    tags: secret.tags,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a secret value (via IPC to bypass CSP)
 */
export async function getSecretValue(
  config: AuthConfig,
  vaultUri: string,
  secretName: string,
  version?: string
): Promise<SecretValue> {
  const result = await window.electronAPI.keyVault.getSecretValue({
    vaultUri,
    secretName,
    version,
    clientId: config.clientId,
    tenantId: config.tenantId,
    clientSecret: config.clientSecret,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to get secret value');
  }

  return {
    value: result.data!.value,
    id: result.data!.id,
    contentType: result.data!.contentType || undefined,
  };
}

/**
 * Set a secret value (via IPC to bypass CSP)
 */
export async function setSecret(
  config: AuthConfig,
  vaultUri: string,
  secretName: string,
  value: string,
  options?: {
    contentType?: string;
    enabled?: boolean;
    expires?: string;
    notBefore?: string;
    tags?: Record<string, string>;
  }
): Promise<KeyVaultSecret> {
  const result = await window.electronAPI.keyVault.setSecret({
    vaultUri,
    secretName,
    value,
    options,
    clientId: config.clientId,
    tenantId: config.tenantId,
    clientSecret: config.clientSecret,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to set secret');
  }

  return {
    id: result.data!.id,
    name: result.data!.name,
    contentType: result.data!.contentType || undefined,
    enabled: result.data!.enabled,
    created: result.data!.created || undefined,
    updated: result.data!.updated || undefined,
    expires: result.data!.expires || undefined,
    notBefore: result.data!.notBefore || undefined,
    tags: result.data!.tags,
  };
}

/**
 * Delete a secret (via IPC to bypass CSP)
 */
export async function deleteSecret(
  config: AuthConfig,
  vaultUri: string,
  secretName: string
): Promise<void> {
  const result = await window.electronAPI.keyVault.deleteSecret({
    vaultUri,
    secretName,
    clientId: config.clientId,
    tenantId: config.tenantId,
    clientSecret: config.clientSecret,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete secret');
  }
}

/**
 * List secret versions (via IPC to bypass CSP)
 */
export async function listSecretVersions(
  config: AuthConfig,
  vaultUri: string,
  secretName: string
): Promise<KeyVaultSecretVersion[]> {
  const result = await window.electronAPI.keyVault.listVersions({
    vaultUri,
    secretName,
    clientId: config.clientId,
    tenantId: config.tenantId,
    clientSecret: config.clientSecret,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to list secret versions');
  }

  // Transform and sort by created date descending (newest first)
  return (result.data || [])
    .map((version) => ({
      id: version.id,
      name: version.version,
      enabled: version.enabled,
      created: version.created || undefined,
      updated: version.updated || undefined,
      expires: version.expires || undefined,
    }))
    .sort((a, b) => {
      if (!a.created) return 1;
      if (!b.created) return -1;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
}

/**
 * Update secret attributes (via IPC to bypass CSP)
 */
export async function updateSecretAttributes(
  config: AuthConfig,
  vaultUri: string,
  secretName: string,
  version: string,
  attributes: {
    enabled?: boolean;
    expires?: string | null;
    notBefore?: string | null;
    contentType?: string;
    tags?: Record<string, string>;
  }
): Promise<KeyVaultSecret> {
  const result = await window.electronAPI.keyVault.updateAttributes({
    vaultUri,
    secretName,
    version,
    attributes,
    clientId: config.clientId,
    tenantId: config.tenantId,
    clientSecret: config.clientSecret,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to update secret attributes');
  }

  // Return a minimal object since the IPC doesn't return the full secret
  return {
    id: `${vaultUri}/secrets/${secretName}/${version}`,
    name: secretName,
    enabled: attributes.enabled ?? true,
    contentType: attributes.contentType,
    tags: attributes.tags,
  };
}
