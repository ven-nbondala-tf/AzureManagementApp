import { describe, it, expect, beforeEach } from 'vitest';
import { useSubscriptionStore } from '../subscriptionStore';

describe('subscriptionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSubscriptionStore.setState({
      subscriptions: [],
      selectedSubscription: null,
      isLoading: false,
      error: null,
    });
  });

  it('should have initial state', () => {
    const state = useSubscriptionStore.getState();
    expect(state.subscriptions).toEqual([]);
    expect(state.selectedSubscription).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set subscriptions', () => {
    const mockSubscriptions = [
      { subscriptionId: 'sub-1', displayName: 'Subscription 1', state: 'Enabled' },
      { subscriptionId: 'sub-2', displayName: 'Subscription 2', state: 'Enabled' },
    ];

    useSubscriptionStore.getState().setSubscriptions(mockSubscriptions);

    expect(useSubscriptionStore.getState().subscriptions).toEqual(mockSubscriptions);
  });

  it('should select subscription', () => {
    const mockSubscription = {
      subscriptionId: 'sub-1',
      displayName: 'Subscription 1',
      state: 'Enabled',
    };

    useSubscriptionStore.getState().selectSubscription(mockSubscription);

    expect(useSubscriptionStore.getState().selectedSubscription).toEqual(mockSubscription);
  });

  it('should deselect subscription with null', () => {
    const mockSubscription = {
      subscriptionId: 'sub-1',
      displayName: 'Subscription 1',
      state: 'Enabled',
    };

    useSubscriptionStore.getState().selectSubscription(mockSubscription);
    expect(useSubscriptionStore.getState().selectedSubscription).not.toBeNull();

    useSubscriptionStore.getState().selectSubscription(null);
    expect(useSubscriptionStore.getState().selectedSubscription).toBeNull();
  });

  it('should set loading state', () => {
    useSubscriptionStore.getState().setLoading(true);
    expect(useSubscriptionStore.getState().isLoading).toBe(true);

    useSubscriptionStore.getState().setLoading(false);
    expect(useSubscriptionStore.getState().isLoading).toBe(false);
  });

  it('should set error and stop loading', () => {
    useSubscriptionStore.getState().setLoading(true);
    const errorMessage = 'Failed to load subscriptions';
    useSubscriptionStore.getState().setError(errorMessage);

    const state = useSubscriptionStore.getState();
    expect(state.error).toBe(errorMessage);
    expect(state.isLoading).toBe(false);
  });

  it('should clear error when setting subscriptions', () => {
    useSubscriptionStore.getState().setError('Some error');

    const mockSubscriptions = [
      { subscriptionId: 'sub-1', displayName: 'Subscription 1', state: 'Enabled' },
    ];

    useSubscriptionStore.getState().setSubscriptions(mockSubscriptions);

    expect(useSubscriptionStore.getState().error).toBeNull();
  });

  it('should clear all state', () => {
    const mockSubscriptions = [
      { subscriptionId: 'sub-1', displayName: 'Subscription 1', state: 'Enabled' },
    ];

    useSubscriptionStore.getState().setSubscriptions(mockSubscriptions);
    useSubscriptionStore.getState().selectSubscription(mockSubscriptions[0]);

    useSubscriptionStore.getState().clear();

    const state = useSubscriptionStore.getState();
    expect(state.subscriptions).toEqual([]);
    expect(state.selectedSubscription).toBeNull();
    expect(state.error).toBeNull();
  });
});
