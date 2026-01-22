import { create } from 'zustand';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  config: AuthConfig | null;
  graphToken: string | null;
  azureToken: string | null;

  // Actions
  setConfig: (config: AuthConfig) => void;
  setTokens: (graphToken: string, azureToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  config: null,
  graphToken: null,
  azureToken: null,

  setConfig: (config) =>
    set({
      config,
      isAuthenticated: false,
      error: null,
    }),

  setTokens: (graphToken, azureToken) =>
    set({
      graphToken,
      azureToken,
      isAuthenticated: true,
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) =>
    set({
      error,
      isLoading: false,
    }),

  logout: () =>
    set({
      isAuthenticated: false,
      config: null,
      graphToken: null,
      azureToken: null,
      error: null,
    }),
}));
