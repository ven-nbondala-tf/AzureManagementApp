import { useAuthStore } from '@/store';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export function ConnectionStatus() {
  const { isAuthenticated, config, error } = useAuthStore();

  return (
    <div className="card p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Connection Status
      </h3>

      <div className="flex items-center gap-2">
        {isAuthenticated ? (
          <>
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Connected
            </span>
          </>
        ) : (
          <>
            <XCircleIcon
              className={clsx(
                'w-5 h-5',
                error ? 'text-red-500' : 'text-gray-400'
              )}
            />
            <span
              className={clsx(
                'text-sm',
                error
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {error || 'Not connected'}
            </span>
          </>
        )}
      </div>

      {config && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="font-medium">Tenant:</span> {config.tenantId}
            </p>
            <p>
              <span className="font-medium">Client ID:</span> {config.clientId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
