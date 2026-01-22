import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useSubscriptionStore } from '../store';
import { listSubscriptions, listResourceGroups } from '../services/azure-api';
import type { ResourceGroup } from '../types';

/**
 * Hook for managing Azure subscriptions
 */
export function useSubscriptions() {
  const { config } = useAuthStore();
  const {
    subscriptions,
    selectedSubscription,
    isLoading,
    error,
    setSubscriptions,
    selectSubscription,
    setLoading,
    setError,
  } = useSubscriptionStore();

  /**
   * Refresh the subscription list
   */
  const refreshSubscriptions = useCallback(async () => {
    if (!config) return;

    setLoading(true);
    setError(null);

    try {
      const subs = await listSubscriptions(config);
      setSubscriptions(subs);

      // Re-select current subscription if it still exists
      if (selectedSubscription) {
        const stillExists = subs.find(
          (s) => s.subscriptionId === selectedSubscription.subscriptionId
        );
        if (!stillExists && subs.length > 0) {
          selectSubscription(subs[0]);
        }
      } else if (subs.length > 0) {
        selectSubscription(subs[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [config, selectedSubscription, setSubscriptions, selectSubscription, setLoading, setError]);

  return {
    subscriptions,
    selectedSubscription,
    isLoading,
    error,
    selectSubscription,
    refreshSubscriptions,
  };
}

/**
 * Hook for fetching resource groups in the selected subscription
 */
export function useResourceGroups() {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();

  const query = useQuery({
    queryKey: ['resourceGroups', selectedSubscription?.subscriptionId],
    queryFn: async (): Promise<ResourceGroup[]> => {
      if (!config || !selectedSubscription) {
        return [];
      }
      return listResourceGroups(config, selectedSubscription.subscriptionId);
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    resourceGroups: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}
