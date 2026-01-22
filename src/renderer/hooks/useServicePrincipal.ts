import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import {
  listApplications,
  searchApplications,
  getApplication,
  createAppRegistration,
  deleteApplication,
  addApplicationSecret,
  removeApplicationSecret,
  addFederatedCredential,
  addGitHubFederatedCredential,
  removeFederatedCredential,
  type Application,
  type ApplicationDetails,
  type CreateSecretResult,
  type FederatedIdentityCredential,
} from '../services/sp-api';

/**
 * Hook for listing and searching applications
 */
export function useApplicationList() {
  const { config } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');

  const query = useQuery({
    queryKey: ['applications', searchQuery],
    queryFn: async (): Promise<Application[]> => {
      if (!config) return [];
      if (searchQuery) {
        return searchApplications(config, searchQuery);
      }
      return listApplications(config);
    },
    enabled: !!config,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const createMutation = useMutation({
    mutationFn: async ({
      displayName,
      description,
      signInAudience,
    }: {
      displayName: string;
      description?: string;
      signInAudience?: string;
    }) => {
      if (!config) throw new Error('Not authenticated');
      return createAppRegistration(config, displayName, description, signInAudience);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (appObjectId: string) => {
      if (!config) throw new Error('Not authenticated');
      return deleteApplication(config, appObjectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });

  return {
    applications: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    searchQuery,
    setSearchQuery,
    createAppRegistration: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message || null,
    deleteApplication: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message || null,
  };
}

/**
 * Hook for managing a single application's details and credentials
 */
export function useApplicationDetails(appObjectId: string | null) {
  const { config } = useAuthStore();
  const queryClient = useQueryClient();

  // Get application details
  const detailsQuery = useQuery({
    queryKey: ['application', appObjectId],
    queryFn: async (): Promise<ApplicationDetails | null> => {
      if (!config || !appObjectId) return null;
      return getApplication(config, appObjectId);
    },
    enabled: !!config && !!appObjectId,
    staleTime: 1000 * 60 * 2,
  });

  // Add secret
  const addSecretMutation = useMutation({
    mutationFn: async ({
      displayName,
      expirationMonths,
    }: {
      displayName: string;
      expirationMonths?: number;
    }): Promise<CreateSecretResult> => {
      if (!config || !appObjectId) throw new Error('Not configured');
      return addApplicationSecret(config, appObjectId, displayName, expirationMonths);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', appObjectId] });
    },
  });

  // Remove secret
  const removeSecretMutation = useMutation({
    mutationFn: async (keyId: string) => {
      if (!config || !appObjectId) throw new Error('Not configured');
      return removeApplicationSecret(config, appObjectId, keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', appObjectId] });
    },
  });

  // Add federated credential
  const addFederatedMutation = useMutation({
    mutationFn: async ({
      name,
      issuer,
      subject,
      description,
      audiences,
    }: {
      name: string;
      issuer: string;
      subject: string;
      description?: string;
      audiences?: string[];
    }): Promise<FederatedIdentityCredential> => {
      if (!config || !appObjectId) throw new Error('Not configured');
      return addFederatedCredential(config, appObjectId, name, issuer, subject, description, audiences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', appObjectId] });
    },
  });

  // Add GitHub federated credential
  const addGitHubFederatedMutation = useMutation({
    mutationFn: async (options: {
      organization: string;
      repository: string;
      entityType: 'branch' | 'tag' | 'environment' | 'pull_request';
      entityValue?: string;
      description?: string;
    }): Promise<FederatedIdentityCredential> => {
      if (!config || !appObjectId) throw new Error('Not configured');
      return addGitHubFederatedCredential(config, appObjectId, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', appObjectId] });
    },
  });

  // Remove federated credential
  const removeFederatedMutation = useMutation({
    mutationFn: async (credentialId: string) => {
      if (!config || !appObjectId) throw new Error('Not configured');
      return removeFederatedCredential(config, appObjectId, credentialId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', appObjectId] });
    },
  });

  return {
    application: detailsQuery.data,
    isLoading: detailsQuery.isLoading,
    error: detailsQuery.error?.message || null,
    refetch: detailsQuery.refetch,
    // Secret management
    addSecret: addSecretMutation.mutateAsync,
    isAddingSecret: addSecretMutation.isPending,
    addSecretError: addSecretMutation.error?.message || null,
    removeSecret: removeSecretMutation.mutateAsync,
    isRemovingSecret: removeSecretMutation.isPending,
    // Federated credential management
    addFederatedCredential: addFederatedMutation.mutateAsync,
    isAddingFederated: addFederatedMutation.isPending,
    addGitHubFederatedCredential: addGitHubFederatedMutation.mutateAsync,
    isAddingGitHubFederated: addGitHubFederatedMutation.isPending,
    removeFederatedCredential: removeFederatedMutation.mutateAsync,
    isRemovingFederated: removeFederatedMutation.isPending,
  };
}

/**
 * Hook for copying text to clipboard
 */
export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { copy, copied };
}
