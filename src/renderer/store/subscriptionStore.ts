import { create } from 'zustand';
import type { Subscription } from '../types';

interface SubscriptionState {
  subscriptions: Subscription[];
  selectedSubscription: Subscription | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSubscriptions: (subscriptions: Subscription[]) => void;
  selectSubscription: (subscription: Subscription | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  subscriptions: [],
  selectedSubscription: null,
  isLoading: false,
  error: null,

  setSubscriptions: (subscriptions) =>
    set({
      subscriptions,
      error: null,
    }),

  selectSubscription: (subscription) =>
    set({
      selectedSubscription: subscription,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
    }),

  clear: () =>
    set({
      subscriptions: [],
      selectedSubscription: null,
      error: null,
    }),
}));
