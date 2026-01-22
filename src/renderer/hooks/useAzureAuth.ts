import { useCallback } from 'react';
import { useAuthStore } from '../store';
import { authenticate, clearTokens } from '../services/azure-auth';
import { listSubscriptions } from '../services/azure-api';
import { useSubscriptionStore } from '../store';

interface AzureConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export function useAzureAuth() {
  const {
    isAuthenticated,
    isLoading,
    error,
    config,
    setConfig,
    setTokens,
    setLoading,
    setError,
    logout: authLogout,
  } = useAuthStore();

  const { setSubscriptions, clear: clearSubscriptions } = useSubscriptionStore();

  /**
   * Connect to Azure using the provided configuration
   */
  const connect = useCallback(
    async (newConfig: AzureConfig) => {
      setLoading(true);
      setError(null);

      try {
        // Store config
        setConfig(newConfig);

        // Authenticate and get tokens
        const tokens = await authenticate(newConfig);
        setTokens(tokens.graphToken, tokens.azureToken);

        // Load subscriptions
        const subs = await listSubscriptions(newConfig);
        setSubscriptions(subs);

        // Select first subscription by default if available
        if (subs.length > 0) {
          useSubscriptionStore.getState().selectSubscription(subs[0]);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        clearTokens();
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setConfig, setTokens, setLoading, setError, setSubscriptions]
  );

  /**
   * Disconnect and clear all state
   */
  const disconnect = useCallback(() => {
    clearTokens();
    authLogout();
    clearSubscriptions();
  }, [authLogout, clearSubscriptions]);

  /**
   * Refresh tokens if needed
   */
  const refreshTokens = useCallback(async () => {
    if (!config) return false;

    try {
      const tokens = await authenticate(config);
      setTokens(tokens.graphToken, tokens.azureToken);
      return true;
    } catch {
      return false;
    }
  }, [config, setTokens]);

  return {
    isAuthenticated,
    isLoading,
    error,
    config,
    connect,
    disconnect,
    refreshTokens,
  };
}
