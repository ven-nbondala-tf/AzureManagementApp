import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useSubscriptionStore } from '../store';
import {
  listKeyVaults,
  listSecrets,
  getSecretValue,
  setSecret,
  deleteSecret,
  listSecretVersions,
  updateSecretAttributes,
  type KeyVault,
  type KeyVaultSecret,
  type KeyVaultSecretVersion,
  type SecretValue,
} from '../services/keyvault-api';

export type { KeyVault, KeyVaultSecret, KeyVaultSecretVersion, SecretValue };

/**
 * Hook for listing Key Vaults in a subscription
 */
export function useKeyVaultList() {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();
  const [searchQuery, setSearchQuery] = useState('');

  const query = useQuery({
    queryKey: ['keyVaults', selectedSubscription?.subscriptionId],
    queryFn: async (): Promise<KeyVault[]> => {
      if (!config || !selectedSubscription) return [];
      return listKeyVaults(config, selectedSubscription.subscriptionId);
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter vaults by search query
  const filteredVaults = query.data?.filter((vault) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      vault.name.toLowerCase().includes(lowerQuery) ||
      vault.resourceGroup.toLowerCase().includes(lowerQuery) ||
      vault.location.toLowerCase().includes(lowerQuery)
    );
  }) || [];

  return {
    vaults: filteredVaults,
    allVaults: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    searchQuery,
    setSearchQuery,
  };
}

/**
 * Hook for managing secrets in a Key Vault
 */
export function useKeyVaultSecrets(vaultUri: string | null) {
  const { config } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  // List secrets
  const secretsQuery = useQuery({
    queryKey: ['keyVaultSecrets', vaultUri],
    queryFn: async (): Promise<KeyVaultSecret[]> => {
      if (!config || !vaultUri) return [];
      return listSecrets(config, vaultUri);
    },
    enabled: !!config && !!vaultUri,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Filter secrets by search query
  const filteredSecrets = secretsQuery.data?.filter((secret) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      secret.name.toLowerCase().includes(lowerQuery) ||
      secret.contentType?.toLowerCase().includes(lowerQuery)
    );
  }) || [];

  // Get secret value
  const getValueMutation = useMutation({
    mutationFn: async ({ secretName, version }: { secretName: string; version?: string }) => {
      if (!config || !vaultUri) throw new Error('Not configured');
      return getSecretValue(config, vaultUri, secretName, version);
    },
  });

  // Set secret
  const setSecretMutation = useMutation({
    mutationFn: async ({
      secretName,
      value,
      options,
    }: {
      secretName: string;
      value: string;
      options?: {
        contentType?: string;
        enabled?: boolean;
        expires?: string;
        notBefore?: string;
        tags?: Record<string, string>;
      };
    }) => {
      if (!config || !vaultUri) throw new Error('Not configured');
      return setSecret(config, vaultUri, secretName, value, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyVaultSecrets', vaultUri] });
    },
  });

  // Delete secret
  const deleteSecretMutation = useMutation({
    mutationFn: async (secretName: string) => {
      if (!config || !vaultUri) throw new Error('Not configured');
      return deleteSecret(config, vaultUri, secretName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyVaultSecrets', vaultUri] });
    },
  });

  // Update secret attributes
  const updateAttributesMutation = useMutation({
    mutationFn: async ({
      secretName,
      version,
      attributes,
    }: {
      secretName: string;
      version: string;
      attributes: {
        enabled?: boolean;
        expires?: string | null;
        notBefore?: string | null;
        contentType?: string;
        tags?: Record<string, string>;
      };
    }) => {
      if (!config || !vaultUri) throw new Error('Not configured');
      return updateSecretAttributes(config, vaultUri, secretName, version, attributes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyVaultSecrets', vaultUri] });
    },
  });

  return {
    secrets: filteredSecrets,
    allSecrets: secretsQuery.data || [],
    isLoading: secretsQuery.isLoading,
    error: secretsQuery.error?.message || null,
    refetch: secretsQuery.refetch,
    searchQuery,
    setSearchQuery,
    // Actions
    getSecretValue: getValueMutation.mutateAsync,
    isGettingValue: getValueMutation.isPending,
    getValueError: getValueMutation.error?.message || null,
    setSecret: setSecretMutation.mutateAsync,
    isSettingSecret: setSecretMutation.isPending,
    setSecretError: setSecretMutation.error?.message || null,
    deleteSecret: deleteSecretMutation.mutateAsync,
    isDeleting: deleteSecretMutation.isPending,
    deleteError: deleteSecretMutation.error?.message || null,
    updateAttributes: updateAttributesMutation.mutateAsync,
    isUpdating: updateAttributesMutation.isPending,
    updateError: updateAttributesMutation.error?.message || null,
  };
}

/**
 * Hook for viewing secret versions
 */
export function useSecretVersions(vaultUri: string | null, secretName: string | null) {
  const { config } = useAuthStore();

  const query = useQuery({
    queryKey: ['secretVersions', vaultUri, secretName],
    queryFn: async (): Promise<KeyVaultSecretVersion[]> => {
      if (!config || !vaultUri || !secretName) return [];
      return listSecretVersions(config, vaultUri, secretName);
    },
    enabled: !!config && !!vaultUri && !!secretName,
    staleTime: 1000 * 60 * 2,
  });

  return {
    versions: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

/**
 * Hook for copying secret value to clipboard
 */
export function useSecretClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (value: string, id: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    copyToClipboard,
    copiedId,
    isCopied: (id: string) => copiedId === id,
  };
}
