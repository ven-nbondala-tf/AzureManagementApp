import { useAuthStore, useSubscriptionStore } from '@/store';
import { Menu } from '@headlessui/react';
import {
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { isAuthenticated, logout } = useAuthStore();
  const { subscriptions, selectedSubscription, selectSubscription } =
    useSubscriptionStore();

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* Subscription Selector */}
        {isAuthenticated && subscriptions.length > 0 && (
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <span className="max-w-[200px] truncate">
                {selectedSubscription?.displayName || 'Select Subscription'}
              </span>
              <ChevronDownIcon className="w-4 h-4" />
            </Menu.Button>

            <Menu.Items className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 max-h-80 overflow-y-auto">
              {subscriptions.map((sub) => (
                <Menu.Item key={sub.id}>
                  {({ active }) => (
                    <button
                      onClick={() => selectSubscription(sub)}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-sm',
                        active
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'text-gray-700 dark:text-gray-300',
                        selectedSubscription?.id === sub.id &&
                          'text-azure-600 dark:text-azure-400 font-medium'
                      )}
                    >
                      <div className="truncate">{sub.displayName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {sub.subscriptionId}
                      </div>
                    </button>
                  )}
                </Menu.Item>
              ))}
            </Menu.Items>
          </Menu>
        )}

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'w-2 h-2 rounded-full',
              isAuthenticated ? 'bg-green-500' : 'bg-gray-400'
            )}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isAuthenticated ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Logout Button */}
        {isAuthenticated && (
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Disconnect"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
}
