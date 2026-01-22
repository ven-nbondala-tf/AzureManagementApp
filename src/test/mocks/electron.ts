// Mock for Electron module when running in test environment
import { vi } from 'vitest';

export const ipcRenderer = {
  invoke: vi.fn(),
  send: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
};

export const contextBridge = {
  exposeInMainWorld: vi.fn(),
};

export const app = {
  getPath: vi.fn().mockReturnValue('/mock/path'),
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  getName: vi.fn().mockReturnValue('Azure Management App'),
  isPackaged: false,
  quit: vi.fn(),
};

export const BrowserWindow = vi.fn().mockImplementation(() => ({
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  webContents: {
    send: vi.fn(),
    on: vi.fn(),
    openDevTools: vi.fn(),
  },
}));

export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn(),
};

export const dialog = {
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/mock/file.txt'] }),
  showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/save.txt' }),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
};

export const shell = {
  openExternal: vi.fn().mockResolvedValue(undefined),
  openPath: vi.fn().mockResolvedValue(''),
};

export default {
  ipcRenderer,
  contextBridge,
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
};
