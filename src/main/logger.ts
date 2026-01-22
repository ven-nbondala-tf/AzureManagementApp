/**
 * Centralized logging module
 * Handles application logging with file output and log rotation
 */

import log from 'electron-log';
import { app, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

// Configure log file location
const logPath = path.join(app.getPath('userData'), 'logs');

// Ensure log directory exists
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}

// Configure electron-log
log.transports.file.resolvePathFn = () => path.join(logPath, 'main.log');
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB max file size
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// Set log level based on environment
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
log.transports.file.level = isDev ? 'debug' : 'info';
log.transports.console.level = isDev ? 'debug' : 'warn';

// Export configured logger
export const logger = log;

/**
 * Log application startup information
 */
export function logAppStartup(): void {
  logger.info('='.repeat(50));
  logger.info('Application starting...');
  logger.info(`Version: ${app.getVersion()}`);
  logger.info(`Platform: ${process.platform}`);
  logger.info(`Architecture: ${process.arch}`);
  logger.info(`Electron: ${process.versions.electron}`);
  logger.info(`Chrome: ${process.versions.chrome}`);
  logger.info(`Node: ${process.versions.node}`);
  logger.info(`User Data Path: ${app.getPath('userData')}`);
  logger.info(`Log Path: ${logPath}`);
  logger.info('='.repeat(50));
}

/**
 * Log application shutdown
 */
export function logAppShutdown(): void {
  logger.info('Application shutting down...');
  logger.info('='.repeat(50));
}

/**
 * Setup IPC handlers for renderer logging
 */
export function setupLoggerIpcHandlers(): void {
  // Allow renderer to send logs to main process
  ipcMain.on('log', (_, level: string, message: string, ...args: unknown[]) => {
    const logLevel = level as keyof typeof logger;
    if (typeof logger[logLevel] === 'function') {
      (logger[logLevel] as (...args: unknown[]) => void)(`[Renderer] ${message}`, ...args);
    }
  });

  // Get log file path
  ipcMain.handle('get-log-path', () => {
    return logPath;
  });

  // Read recent logs
  ipcMain.handle('get-recent-logs', async (_, lines: number = 100) => {
    try {
      const logFile = path.join(logPath, 'main.log');
      if (!fs.existsSync(logFile)) {
        return [];
      }
      const content = fs.readFileSync(logFile, 'utf-8');
      const allLines = content.split('\n').filter(Boolean);
      return allLines.slice(-lines);
    } catch (error) {
      logger.error('Failed to read logs:', error);
      return [];
    }
  });

  // Clear logs
  ipcMain.handle('clear-logs', async () => {
    try {
      const logFile = path.join(logPath, 'main.log');
      if (fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, '');
      }
      logger.info('Logs cleared');
      return { success: true };
    } catch (error) {
      logger.error('Failed to clear logs:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}

/**
 * Setup global error handlers
 */
export function setupErrorHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

export default logger;
