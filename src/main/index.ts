import { app, BrowserWindow } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc-handlers';
import { initAutoUpdater, setupUpdateIpcHandlers } from './updater';
import {
  logger,
  logAppStartup,
  logAppShutdown,
  setupLoggerIpcHandlers,
  setupErrorHandlers,
} from './logger';

// Setup error handlers early
setupErrorHandlers();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  logger.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
    backgroundColor: '#f9fafb',
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    logger.info('Main window ready to show');
    mainWindow?.show();

    // Initialize auto-updater after window is ready (only in production)
    if (!isDev && mainWindow) {
      initAutoUpdater(mainWindow);
    }
  });

  // Load the app
  if (isDev) {
    logger.info('Loading development server at http://localhost:5200');
    mainWindow.loadURL('http://localhost:5200');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../renderer/index.html');
    logger.info(`Loading production build from ${indexPath}`);
    mainWindow.loadFile(indexPath);
  }

  // Log navigation events
  mainWindow.webContents.on('did-navigate', (_, url) => {
    logger.debug('Navigated to:', url);
  });

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    logger.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.on('closed', () => {
    logger.info('Main window closed');
    mainWindow = null;
  });
}

// Setup IPC handlers
setupIpcHandlers();
setupUpdateIpcHandlers();
setupLoggerIpcHandlers();

// App lifecycle
app.whenReady().then(() => {
  logAppStartup();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    logAppShutdown();
    app.quit();
  }
});

app.on('before-quit', () => {
  logAppShutdown();
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== 'http://localhost:5200' && parsedUrl.protocol !== 'file:') {
      logger.warn('Blocked navigation to external URL:', url);
      event.preventDefault();
    }
  });

  // Prevent opening new windows
  contents.setWindowOpenHandler(({ url }) => {
    logger.warn('Blocked new window:', url);
    return { action: 'deny' };
  });
});
