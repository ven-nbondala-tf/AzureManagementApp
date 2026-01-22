import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import {
  searchUsers,
  searchGroups,
  searchServicePrincipals,
  getGroupMembers,
  addGroupMember,
  removeGroupMember,
  createSecurityGroup,
  deleteGroup,
  listApplications,
  createApplication,
  addApplicationSecret,
  removeApplicationSecret,
  createServicePrincipal,
} from '../services/graph-api';
import type { User, Group, ServicePrincipal, Application } from '../types';

/**
 * Hook for searching directory objects (users, groups, service principals)
 */
export function useDirectorySearch() {
  const { config } = useAuthStore();

  const searchUsersQuery = async (query: string): Promise<User[]> => {
    if (!config || !query) return [];
    return searchUsers(config, query);
  };

  const searchGroupsQuery = async (query: string): Promise<Group[]> => {
    if (!config || !query) return [];
    return searchGroups(config, query);
  };

  const searchSPsQuery = async (query: string): Promise<ServicePrincipal[]> => {
    if (!config || !query) return [];
    return searchServicePrincipals(config, query);
  };

  return {
    searchUsers: searchUsersQuery,
    searchGroups: searchGroupsQuery,
    searchServicePrincipals: searchSPsQuery,
  };
}

/**
 * Hook for group management operations
 */
export function useGroupManagement(groupId?: string) {
  const { config } = useAuthStore();

  // Get group members
  const membersQuery = useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      if (!config || !groupId) return [];
      return getGroupMembers(config, groupId);
    },
    enabled: !!config && !!groupId,
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!config || !groupId) throw new Error('Not configured');
      return addGroupMember(config, groupId, memberId);
    },
    onSuccess: () => {
      membersQuery.refetch();
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!config || !groupId) throw new Error('Not configured');
      return removeGroupMember(config, groupId, memberId);
    },
    onSuccess: () => {
      membersQuery.refetch();
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async ({
      displayName,
      description,
    }: {
      displayName: string;
      description?: string;
    }) => {
      if (!config) throw new Error('Not configured');
      return createSecurityGroup(config, displayName, description);
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!config) throw new Error('Not configured');
      return deleteGroup(config, id);
    },
  });

  return {
    members: membersQuery.data || [],
    isLoadingMembers: membersQuery.isLoading,
    membersError: membersQuery.error?.message || null,
    refetchMembers: membersQuery.refetch,
    addMember: addMemberMutation.mutateAsync,
    isAddingMember: addMemberMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemovingMember: removeMemberMutation.isPending,
    createGroup: createGroupMutation.mutateAsync,
    isCreatingGroup: createGroupMutation.isPending,
    deleteGroup: deleteGroupMutation.mutateAsync,
    isDeletingGroup: deleteGroupMutation.isPending,
  };
}

/**
 * Hook for application/service principal management
 */
export function useApplicationManagement() {
  const { config } = useAuthStore();

  // List applications
  const applicationsQuery = useQuery({
    queryKey: ['applications'],
    queryFn: async (): Promise<Application[]> => {
      if (!config) return [];
      return listApplications(config);
    },
    enabled: !!config,
  });

  // Create application mutation
  const createAppMutation = useMutation({
    mutationFn: async (displayName: string) => {
      if (!config) throw new Error('Not configured');
      const app = await createApplication(config, displayName);
      // Also create the service principal
      await createServicePrincipal(config, app.appId);
      return app;
    },
    onSuccess: () => {
      applicationsQuery.refetch();
    },
  });

  // Add secret mutation
  const addSecretMutation = useMutation({
    mutationFn: async ({
      appId,
      displayName,
      endDateTime,
    }: {
      appId: string;
      displayName: string;
      endDateTime?: string;
    }) => {
      if (!config) throw new Error('Not configured');
      return addApplicationSecret(config, appId, displayName, endDateTime);
    },
    onSuccess: () => {
      applicationsQuery.refetch();
    },
  });

  // Remove secret mutation
  const removeSecretMutation = useMutation({
    mutationFn: async ({ appId, keyId }: { appId: string; keyId: string }) => {
      if (!config) throw new Error('Not configured');
      return removeApplicationSecret(config, appId, keyId);
    },
    onSuccess: () => {
      applicationsQuery.refetch();
    },
  });

  return {
    applications: applicationsQuery.data || [],
    isLoading: applicationsQuery.isLoading,
    error: applicationsQuery.error?.message || null,
    refetch: applicationsQuery.refetch,
    createApplication: createAppMutation.mutateAsync,
    isCreatingApp: createAppMutation.isPending,
    addSecret: addSecretMutation.mutateAsync,
    isAddingSecret: addSecretMutation.isPending,
    removeSecret: removeSecretMutation.mutateAsync,
    isRemovingSecret: removeSecretMutation.isPending,
  };
}
