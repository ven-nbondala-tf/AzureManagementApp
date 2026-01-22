import { useState } from 'react';
import { FolderOpenIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAzureAuth } from '@/hooks';

export function ConfigSelector() {
  const { connect, isLoading, error } = useAzureAuth();
  const [status, setStatus] = useState<'idle' | 'loading-file' | 'authenticating' | 'success'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleLoadConfig = async () => {
    setStatus('loading-file');
    setStatusMessage('Selecting configuration file...');

    try {
      const result = await window.electronAPI.config.load();

      if (!result.success || !result.data) {
        setStatus('idle');
        setStatusMessage(null);
        return;
      }

      setStatus('authenticating');
      setStatusMessage('Authenticating with Azure...');

      const success = await connect(result.data);

      if (success) {
        setStatus('success');
        setStatusMessage('Connected successfully!');
      } else {
        setStatus('idle');
      }
    } catch (err) {
      setStatus('idle');
      setStatusMessage(null);
    }
  };

  const isProcessing = status === 'loading-file' || status === 'authenticating' || isLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="card p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-azure-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">Az</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Azure Management App
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Load your Service Principal configuration to get started
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLoadConfig}
            disabled={isProcessing}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <FolderOpenIcon className="w-5 h-5" />
            )}
            <span>
              {isProcessing ? 'Connecting...' : 'Load Configuration File'}
            </span>
          </button>

          {statusMessage && !error && (
            <div className="flex items-center justify-center gap-2 text-sm">
              {status === 'success' ? (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    {statusMessage}
                  </span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-azure-500" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {statusMessage}
                  </span>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expected file format:
          </h3>
          <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-gray-600 dark:text-gray-300 overflow-x-auto">
{`ClientId = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
TenantId = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ClientSecret = your-client-secret-here`}
          </pre>
        </div>
      </div>
    </div>
  );
}
