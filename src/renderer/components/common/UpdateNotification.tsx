import { useState, useEffect } from 'react';
import type { UpdateInfo, DownloadProgress } from '../../types/electron.d';

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.updater) return;

    const cleanups: (() => void)[] = [];

    cleanups.push(
      electronAPI.updater.onUpdateChecking(() => {
        setStatus('checking');
        setError(null);
      })
    );

    cleanups.push(
      electronAPI.updater.onUpdateAvailable((info) => {
        setStatus('available');
        setUpdateInfo(info);
        setDismissed(false);
      })
    );

    cleanups.push(
      electronAPI.updater.onUpdateNotAvailable(() => {
        setStatus('idle');
      })
    );

    cleanups.push(
      electronAPI.updater.onDownloadProgress((prog) => {
        setStatus('downloading');
        setProgress(prog);
      })
    );

    cleanups.push(
      electronAPI.updater.onUpdateDownloaded((info) => {
        setStatus('downloaded');
        setUpdateInfo(info);
        setDismissed(false);
      })
    );

    cleanups.push(
      electronAPI.updater.onUpdateError((err) => {
        setStatus('error');
        setError(err.message);
      })
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  const handleDownload = async () => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.updater) return;

    setStatus('downloading');
    await electronAPI.updater.downloadUpdate();
  };

  const handleInstall = () => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.updater) return;

    electronAPI.updater.installUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show anything if dismissed or no update
  if (dismissed || (status !== 'available' && status !== 'downloading' && status !== 'downloaded')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        {status === 'available' && updateInfo && (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Update Available
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Version {updateInfo.version}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                Download
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Later
              </button>
            </div>
          </>
        )}

        {status === 'downloading' && progress && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Downloading Update
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {progress.percent.toFixed(0)}% complete
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </>
        )}

        {status === 'downloaded' && updateInfo && (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Update Ready
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Version {updateInfo.version} downloaded
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
              >
                Restart & Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UpdateNotification;
