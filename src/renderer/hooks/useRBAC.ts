import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useSubscriptionStore } from '../store';
import {
  listRoleDefinitions,
  getRoleAssignmentsWithDetails,
  createRoleAssignment,
  deleteRoleAssignment,
  buildScope,
  checkExistingAssignment,
  getCommonRoles,
  listResources,
  type RoleDefinition,
  type RoleAssignmentDisplay,
  type AzureResource,
} from '../services/rbac-api';

export type { AzureResource };
import { searchUsers } from '../services/graph-api';
import { searchGroups } from '../services/groups-api';
import { searchServicePrincipals } from '../services/sp-api';

export type PrincipalType = 'User' | 'Group' | 'ServicePrincipal';

export interface Principal {
  id: string;
  displayName: string;
  type: PrincipalType;
  email?: string;
  appId?: string;
}

/**
 * Hook for searching principals (users, groups, service principals)
 */
export function usePrincipalSearch() {
  const { config } = useAuthStore();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Principal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (query: string, types: PrincipalType[] = ['User', 'Group', 'ServicePrincipal']) => {
      if (!config || !query || query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const searchPromises: Promise<Principal[]>[] = [];

        if (types.includes('User')) {
          searchPromises.push(
            searchUsers(config, query).then((users) =>
              users.map((u) => ({
                id: u.id,
                displayName: u.displayName,
                type: 'User' as PrincipalType,
                email: u.userPrincipalName,
              }))
            )
          );
        }

        if (types.includes('Group')) {
          searchPromises.push(
            searchGroups(config, query).then((groups) =>
              groups.map((g) => ({
                id: g.id,
                displayName: g.displayName,
                type: 'Group' as PrincipalType,
              }))
            )
          );
        }

        if (types.includes('ServicePrincipal')) {
          searchPromises.push(
            searchServicePrincipals(config, query).then((sps) =>
              sps.map((sp) => ({
                id: sp.id,
                displayName: sp.displayName,
                type: 'ServicePrincipal' as PrincipalType,
                appId: sp.appId,
              }))
            )
          );
        }

        const allResults = await Promise.all(searchPromises);
        setResults(allResults.flat());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [config]
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    search,
    results,
    isSearching,
    error,
    clearResults,
  };
}

/**
 * Hook for managing role definitions
 */
export function useRoleDefinitions() {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();

  const query = useQuery({
    queryKey: ['roleDefinitions', selectedSubscription?.subscriptionId],
    queryFn: async (): Promise<RoleDefinition[]> => {
      if (!config || !selectedSubscription) {
        return [];
      }
      return listRoleDefinitions(
        config,
        `/subscriptions/${selectedSubscription.subscriptionId}`
      );
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 30, // 30 minutes - role definitions rarely change
  });

  return {
    roleDefinitions: query.data || [],
    commonRoles: getCommonRoles(),
    isLoading: query.isLoading,
    error: query.error?.message || null,
  };
}

/**
 * Hook for managing role assignments
 */
export function useRoleAssignments(resourceGroupName?: string) {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();
  const queryClient = useQueryClient();

  const scope = selectedSubscription
    ? buildScope(selectedSubscription.subscriptionId, resourceGroupName)
    : null;

  // Get role assignments
  const assignmentsQuery = useQuery({
    queryKey: ['roleAssignments', selectedSubscription?.subscriptionId, resourceGroupName],
    queryFn: async (): Promise<RoleAssignmentDisplay[]> => {
      if (!config || !selectedSubscription) {
        return [];
      }
      return getRoleAssignmentsWithDetails(
        config,
        selectedSubscription.subscriptionId,
        scope || undefined
      );
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create role assignment mutation
  const createMutation = useMutation({
    mutationFn: async ({
      principalId,
      principalType,
      roleDefinitionId,
      targetScope,
    }: {
      principalId: string;
      principalType: PrincipalType;
      roleDefinitionId: string;
      targetScope: string;
    }) => {
      if (!config) throw new Error('Not authenticated');

      // Check for existing assignment
      const exists = await checkExistingAssignment(
        config,
        targetScope,
        principalId,
        roleDefinitionId
      );

      if (exists) {
        throw new Error('This principal already has this role at the specified scope');
      }

      return createRoleAssignment(
        config,
        targetScope,
        roleDefinitionId,
        principalId,
        principalType
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleAssignments'] });
    },
  });

  // Delete role assignment mutation
  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!config) throw new Error('Not authenticated');
      return deleteRoleAssignment(config, assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleAssignments'] });
    },
  });

  return {
    assignments: assignmentsQuery.data || [],
    isLoading: assignmentsQuery.isLoading,
    error: assignmentsQuery.error?.message || null,
    refetch: assignmentsQuery.refetch,
    createAssignment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message || null,
    deleteAssignment: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message || null,
  };
}

/**
 * Hook for listing Azure resources
 */
export function useResources(resourceGroupName?: string) {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();
  const [searchQuery, setSearchQuery] = useState('');

  const query = useQuery({
    queryKey: ['resources', selectedSubscription?.subscriptionId, resourceGroupName],
    queryFn: async (): Promise<AzureResource[]> => {
      if (!config || !selectedSubscription) {
        return [];
      }
      return listResources(config, selectedSubscription.subscriptionId, resourceGroupName);
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Filter resources by search query
  const filteredResources = query.data?.filter((resource) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      resource.name.toLowerCase().includes(q) ||
      resource.type.toLowerCase().includes(q) ||
      resource.resourceGroup.toLowerCase().includes(q)
    );
  }) || [];

  return {
    resources: filteredResources,
    allResources: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    searchQuery,
    setSearchQuery,
  };
}
