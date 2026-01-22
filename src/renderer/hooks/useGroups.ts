import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store';
import {
  listGroups,
  searchGroups,
  getGroup,
  createGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  addGroupMembers,
  removeGroupMember,
  removeGroupMembers,
  searchUsersForMembership,
  searchServicePrincipalsForMembership,
  searchGroupsForMembership,
  type GroupMember,
  type GroupDetails,
  type GroupSearchMode,
} from '../services/groups-api';

export type { GroupSearchMode, GroupDetails, GroupProtectionStatus } from '../services/groups-api';
export { getGroupProtectionStatus } from '../services/groups-api';
import type { Group } from '../types';

export type MemberSearchResult = {
  id: string;
  displayName: string;
  type: 'User' | 'ServicePrincipal' | 'Group';
  email?: string;
  appId?: string;
};

/**
 * Hook for listing and searching groups
 */
export function useGroupList() {
  const { config } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<GroupSearchMode>('startswith');

  const query = useQuery({
    queryKey: ['groups', searchQuery, searchMode],
    queryFn: async (): Promise<Group[]> => {
      if (!config) return [];
      if (searchQuery) {
        return searchGroups(config, searchQuery, searchMode);
      }
      return listGroups(config);
    },
    enabled: !!config,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const createMutation = useMutation({
    mutationFn: async ({
      displayName,
      description,
    }: {
      displayName: string;
      description?: string;
    }) => {
      if (!config) throw new Error('Not authenticated');
      return createGroup(config, displayName, description);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!config) throw new Error('Not authenticated');
      return deleteGroup(config, groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return {
    groups: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    createGroup: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error?.message || null,
    deleteGroup: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error?.message || null,
  };
}

/**
 * Hook for managing a single group's details and members
 */
export function useGroupDetails(groupId: string | null) {
  const { config } = useAuthStore();
  const queryClient = useQueryClient();

  // Get group details
  const detailsQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: async (): Promise<GroupDetails | null> => {
      if (!config || !groupId) return null;
      return getGroup(config, groupId);
    },
    enabled: !!config && !!groupId,
    staleTime: 1000 * 60 * 2,
  });

  // Get group members
  const membersQuery = useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async (): Promise<GroupMember[]> => {
      if (!config || !groupId) return [];
      return getGroupMembers(config, groupId);
    },
    enabled: !!config && !!groupId,
    staleTime: 1000 * 60 * 2,
  });

  // Add single member
  const addMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!config || !groupId) throw new Error('Not configured');
      return addGroupMember(config, groupId, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMembers', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  // Add multiple members
  const addMembersMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      if (!config || !groupId) throw new Error('Not configured');
      return addGroupMembers(config, groupId, memberIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMembers', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  // Remove single member
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!config || !groupId) throw new Error('Not configured');
      return removeGroupMember(config, groupId, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMembers', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  // Remove multiple members
  const removeMembersMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      if (!config || !groupId) throw new Error('Not configured');
      return removeGroupMembers(config, groupId, memberIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groupMembers', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
    },
  });

  return {
    group: detailsQuery.data,
    isLoadingGroup: detailsQuery.isLoading,
    groupError: detailsQuery.error?.message || null,
    members: membersQuery.data || [],
    isLoadingMembers: membersQuery.isLoading,
    membersError: membersQuery.error?.message || null,
    refetchMembers: membersQuery.refetch,
    addMember: addMemberMutation.mutateAsync,
    isAddingMember: addMemberMutation.isPending,
    addMemberError: addMemberMutation.error?.message || null,
    resetAddMemberError: addMemberMutation.reset,
    addMembers: addMembersMutation.mutateAsync,
    isAddingMembers: addMembersMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemovingMember: removeMemberMutation.isPending,
    removeMembers: removeMembersMutation.mutateAsync,
    isRemovingMembers: removeMembersMutation.isPending,
  };
}

/**
 * Hook for searching members to add to a group
 */
export function useMemberSearch(excludeGroupId?: string) {
  const { config } = useAuthStore();
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (
      query: string,
      includeUsers = true,
      includeServicePrincipals = true,
      includeGroups = true
    ) => {
      if (!config || !query || query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const promises: Promise<MemberSearchResult[]>[] = [];

        if (includeUsers) {
          promises.push(
            searchUsersForMembership(config, query).then((users) =>
              users.map((u) => ({
                id: u.id,
                displayName: u.displayName,
                type: 'User' as const,
                email: u.email,
              }))
            )
          );
        }

        if (includeServicePrincipals) {
          promises.push(
            searchServicePrincipalsForMembership(config, query).then((sps) =>
              sps.map((sp) => ({
                id: sp.id,
                displayName: sp.displayName,
                type: 'ServicePrincipal' as const,
                appId: sp.appId,
              }))
            )
          );
        }

        if (includeGroups) {
          promises.push(
            searchGroupsForMembership(config, query, excludeGroupId).then((groups) =>
              groups.map((g) => ({
                id: g.id,
                displayName: g.displayName,
                type: 'Group' as const,
              }))
            )
          );
        }

        const allResults = await Promise.all(promises);
        setResults(allResults.flat());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [config, excludeGroupId]
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
