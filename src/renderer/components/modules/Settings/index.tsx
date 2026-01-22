import { Header } from '@/components/common';
import { ConnectionStatus } from '@/components/auth';
import { useAuthStore } from '@/store';
import {
  ArrowPathIcon,
  TrashIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

export function Settings() {
  const { config, logout } = useAuthStore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleClearCredentials = async () => {
    if (confirm('Are you sure you want to clear all stored credentials?')) {
      await window.electronAPI.credentials.clearAll();
      logout();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Settings" />

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Connection Status */}
          <ConnectionStatus />

          {/* Appearance */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Appearance
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900 dark:text-white">
                  Dark Mode
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Toggle between light and dark theme
                </p>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isDark ? (
                  <SunIcon className="w-5 h-5 text-yellow-500" />
                ) : (
                  <MoonIcon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Actions
            </h3>
            <div className="space-y-3">
              {config && (
                <button
                  onClick={logout}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  <span>Change Configuration</span>
                </button>
              )}

              <button
                onClick={handleClearCredentials}
                className="btn-danger w-full flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Clear All Stored Credentials</span>
              </button>
            </div>
          </div>

          {/* About */}
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              About
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>Azure Management App v1.0.0</p>
              <p>A modern desktop application for Azure resource management.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
