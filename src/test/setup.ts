import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.electronAPI
const mockElectronAPI = {
  auth: {
    acquireToken: vi.fn().mockResolvedValue('mock-token'),
    acquireGraphToken: vi.fn().mockResolvedValue('mock-graph-token'),
    acquireKeyVaultToken: vi.fn().mockResolvedValue('mock-keyvault-token'),
  },
  config: {
    readConfigFile: vi.fn().mockResolvedValue({
      clientId: 'mock-client-id',
      tenantId: 'mock-tenant-id',
      clientSecret: 'mock-client-secret',
    }),
    selectConfigFile: vi.fn().mockResolvedValue('/path/to/config.txt'),
  },
  storage: {
    getCredential: vi.fn().mockResolvedValue(null),
    setCredential: vi.fn().mockResolvedValue(undefined),
    deleteCredential: vi.fn().mockResolvedValue(undefined),
  },
  favorites: {
    get: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue(undefined),
  },
  keyVault: {
    listSecrets: vi.fn().mockResolvedValue({ value: [] }),
    getSecretValue: vi.fn().mockResolvedValue({ value: 'mock-secret-value' }),
    setSecret: vi.fn().mockResolvedValue({}),
    deleteSecret: vi.fn().mockResolvedValue({}),
    listVersions: vi.fn().mockResolvedValue({ value: [] }),
    updateAttributes: vi.fn().mockResolvedValue({}),
  },
  updater: {
    checkForUpdates: vi.fn().mockResolvedValue(null),
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
    installUpdate: vi.fn().mockResolvedValue(undefined),
    onUpdateAvailable: vi.fn(),
    onUpdateDownloaded: vi.fn(),
    onDownloadProgress: vi.fn(),
    onUpdateError: vi.fn(),
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
};

Object.defineProperty(window, 'electronAPI', {
  writable: true,
  value: mockElectronAPI,
});

// Mock clipboard API - make it configurable so userEvent can override
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Clean up mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
