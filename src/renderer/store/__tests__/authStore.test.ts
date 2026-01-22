import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      config: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      graphToken: null,
      azureToken: null,
    });
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    expect(state.config).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.graphToken).toBeNull();
    expect(state.azureToken).toBeNull();
  });

  it('should set config without authenticating', () => {
    const mockConfig = {
      clientId: 'test-client-id',
      tenantId: 'test-tenant-id',
      clientSecret: 'test-secret',
    };

    useAuthStore.getState().setConfig(mockConfig);

    const state = useAuthStore.getState();
    expect(state.config).toEqual(mockConfig);
    expect(state.isAuthenticated).toBe(false); // Config alone doesn't authenticate
  });

  it('should set tokens and mark as authenticated', () => {
    useAuthStore.getState().setTokens('graph-token', 'azure-token');

    const state = useAuthStore.getState();
    expect(state.graphToken).toBe('graph-token');
    expect(state.azureToken).toBe('azure-token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('should set loading state', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('should set error and stop loading', () => {
    useAuthStore.getState().setLoading(true);
    const errorMessage = 'Authentication failed';
    useAuthStore.getState().setError(errorMessage);

    const state = useAuthStore.getState();
    expect(state.error).toBe(errorMessage);
    expect(state.isLoading).toBe(false);
  });

  it('should clear error when setting config', () => {
    useAuthStore.getState().setError('Some error');

    const mockConfig = {
      clientId: 'test-client-id',
      tenantId: 'test-tenant-id',
      clientSecret: 'test-secret',
    };

    useAuthStore.getState().setConfig(mockConfig);

    expect(useAuthStore.getState().error).toBeNull();
  });

  it('should clear error when setting tokens', () => {
    useAuthStore.getState().setError('Some error');
    useAuthStore.getState().setTokens('graph-token', 'azure-token');

    expect(useAuthStore.getState().error).toBeNull();
  });

  it('should logout and clear all state', () => {
    const mockConfig = {
      clientId: 'test-client-id',
      tenantId: 'test-tenant-id',
      clientSecret: 'test-secret',
    };

    useAuthStore.getState().setConfig(mockConfig);
    useAuthStore.getState().setTokens('graph-token', 'azure-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.config).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.graphToken).toBeNull();
    expect(state.azureToken).toBeNull();
    expect(state.error).toBeNull();
  });
});
