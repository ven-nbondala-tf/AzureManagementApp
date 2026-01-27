import { ReactNode } from 'react';
import { Modal } from './Modal';
import {
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  icon?: 'warning' | 'delete' | 'none';
  error?: string | null;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  isLoading = false,
  icon = 'warning',
  error = null,
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        {/* Icon and Message */}
        <div className="flex gap-4">
          {icon !== 'none' && (
            <div
              className={clsx(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                isDangerous
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-yellow-100 dark:bg-yellow-900/30'
              )}
            >
              {icon === 'delete' ? (
                <TrashIcon
                  className={clsx(
                    'w-5 h-5',
                    isDangerous
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  )}
                />
              ) : (
                <ExclamationTriangleIcon
                  className={clsx(
                    'w-5 h-5',
                    isDangerous
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  )}
                />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {typeof message === 'string' ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
            ) : (
              message
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isDangerous
                ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                : 'btn-primary'
            )}
          >
            {isLoading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            <span>{isLoading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmationModal;
