import { useState } from 'react';
import { Header, Modal, ConfirmationModal } from '@/components/common';
import {
  useKeyVaultList,
  useKeyVaultSecrets,
  useSecretClipboard,
  type KeyVault,
  type KeyVaultSecret,
} from '@/hooks';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
  LockClosedIcon,
  MapPinIcon,
  FolderIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { format, formatDistanceToNow, isPast, addDays } from 'date-fns';

export function KeyVaultManager() {
  const [selectedVault, setSelectedVault] = useState<KeyVault | null>(null);
  const [selectedSecret, setSelectedSecret] = useState<KeyVaultSecret | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewValueModalOpen, setIsViewValueModalOpen] = useState(false);
  const [secretToDelete, setSecretToDelete] = useState<KeyVaultSecret | null>(null);

  const {
    vaults,
    isLoading: isLoadingVaults,
    error: vaultsError,
    refetch: refetchVaults,
    searchQuery: vaultSearchQuery,
    setSearchQuery: setVaultSearchQuery,
  } = useKeyVaultList();

  const {
    secrets,
    isLoading: isLoadingSecrets,
    error: secretsError,
    refetch: refetchSecrets,
    searchQuery: secretSearchQuery,
    setSearchQuery: setSecretSearchQuery,
    getSecretValue,
    isGettingValue,
    setSecret,
    isSettingSecret,
    deleteSecret,
    isDeleting,
  } = useKeyVaultSecrets(selectedVault?.properties.vaultUri || null);

  const handleDeleteSecret = async () => {
    if (!secretToDelete) return;
    try {
      await deleteSecret(secretToDelete.name);
      setSecretToDelete(null);
      if (selectedSecret?.name === secretToDelete.name) {
        setSelectedSecret(null);
      }
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Key Vault Manager" />

      <main className="flex-1 overflow-hidden p-6">
        <div className="h-full flex gap-6">
          {/* Key Vaults List Panel */}
          <div className="w-1/3 flex flex-col card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Key Vaults
                </h2>
                <button
                  onClick={() => refetchVaults()}
                  disabled={isLoadingVaults}
                  className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <ArrowPathIcon className={clsx('w-4 h-4', isLoadingVaults && 'animate-spin')} />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vaults..."
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  className="input-field py-1.5 pl-9 text-sm"
                />
              </div>
            </div>

            {/* Error */}
            {vaultsError && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                {vaultsError}
              </div>
            )}

            {/* Vaults List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingVaults ? (
                <div className="p-8 text-center text-gray-500">
                  <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : vaults.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {vaultSearchQuery ? 'No matching vaults' : 'No Key Vaults found'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {vaults.map((vault) => (
                    <div
                      key={vault.id}
                      className={clsx(
                        'p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                        selectedVault?.id === vault.id && 'bg-azure-50 dark:bg-azure-900/20'
                      )}
                      onClick={() => {
                        setSelectedVault(vault);
                        setSelectedSecret(null);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <LockClosedIcon className="w-5 h-5 text-azure-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {vault.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <FolderIcon className="w-3 h-3" />
                              {vault.resourceGroup}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3" />
                              {vault.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {vaults.length} vault{vaults.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Secrets Panel */}
          <div className="flex-1 card overflow-hidden flex flex-col">
            {selectedVault ? (
              <>
                {/* Vault Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-azure-100 dark:bg-azure-900/30 rounded-lg flex items-center justify-center">
                        <LockClosedIcon className="w-5 h-5 text-azure-600 dark:text-azure-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedVault.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedVault.properties.vaultUri}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedVault(null)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Vault Properties */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {selectedVault.properties.sku.name}
                    </span>
                    {selectedVault.properties.enableRbacAuthorization && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        RBAC Enabled
                      </span>
                    )}
                    {selectedVault.properties.enableSoftDelete && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Soft Delete
                      </span>
                    )}
                    {selectedVault.properties.enablePurgeProtection && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                        Purge Protection
                      </span>
                    )}
                  </div>
                </div>

                {/* Secrets Section */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Secrets ({secrets.length})
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => refetchSecrets()}
                          disabled={isLoadingSecrets}
                          className="btn-secondary py-1 px-2 text-xs"
                        >
                          <ArrowPathIcon className={clsx('w-3 h-3', isLoadingSecrets && 'animate-spin')} />
                        </button>
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="btn-primary py-1 px-2 text-xs flex items-center gap-1"
                        >
                          <PlusIcon className="w-3 h-3" />
                          <span>Add Secret</span>
                        </button>
                      </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search secrets..."
                        value={secretSearchQuery}
                        onChange={(e) => setSecretSearchQuery(e.target.value)}
                        className="input-field py-1.5 pl-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {secretsError && (
                    <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                      {secretsError}
                    </div>
                  )}

                  {/* Secrets List */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoadingSecrets ? (
                      <div className="p-8 text-center text-gray-500">
                        <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto" />
                      </div>
                    ) : secrets.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <KeyIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{secretSearchQuery ? 'No matching secrets' : 'No secrets in this vault'}</p>
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="mt-2 text-azure-600 dark:text-azure-400 text-sm hover:underline"
                        >
                          Add a secret
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {secrets.map((secret) => (
                          <SecretRow
                            key={secret.id}
                            secret={secret}
                            onView={() => {
                              setSelectedSecret(secret);
                              setIsViewValueModalOpen(true);
                            }}
                            onDelete={() => setSecretToDelete(secret)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <LockClosedIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a Key Vault to view secrets</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Secret Modal */}
      {selectedVault && (
        <CreateSecretModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={async (data) => {
            await setSecret({
              secretName: data.name,
              value: data.value,
              options: {
                contentType: data.contentType || undefined,
                expires: data.expires || undefined,
              },
            });
            setIsCreateModalOpen(false);
          }}
          isSubmitting={isSettingSecret}
        />
      )}

      {/* View Secret Value Modal */}
      {selectedVault && selectedSecret && (
        <ViewSecretModal
          isOpen={isViewValueModalOpen}
          onClose={() => {
            setIsViewValueModalOpen(false);
            setSelectedSecret(null);
          }}
          secret={selectedSecret}
          vaultUri={selectedVault.properties.vaultUri}
          getSecretValue={getSecretValue}
          isLoading={isGettingValue}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!secretToDelete}
        onClose={() => setSecretToDelete(null)}
        onConfirm={handleDeleteSecret}
        title="Delete Secret"
        message={
          secretToDelete && (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                Are you sure you want to delete the secret{' '}
                <strong className="text-gray-900 dark:text-white">
                  {secretToDelete.name}
                </strong>
                ?
              </p>
              {selectedVault?.properties.enableSoftDelete ? (
                <p className="text-amber-600 dark:text-amber-400">
                  This vault has soft delete enabled. The secret can be recovered
                  within {selectedVault.properties.softDeleteRetentionInDays || 90} days.
                </p>
              ) : (
                <p className="text-red-600 dark:text-red-400">
                  This action cannot be undone.
                </p>
              )}
            </div>
          )
        }
        confirmText="Delete Secret"
        isDangerous
        isLoading={isDeleting}
        icon="delete"
      />
    </div>
  );
}

// Secret Row Component
interface SecretRowProps {
  secret: KeyVaultSecret;
  onView: () => void;
  onDelete: () => void;
}

function SecretRow({ secret, onView, onDelete }: SecretRowProps) {
  const isExpired = secret.expires && isPast(new Date(secret.expires));
  const isExpiringSoon = secret.expires && !isExpired && isPast(addDays(new Date(), -30));

  return (
    <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <KeyIcon className={clsx(
            'w-5 h-5 flex-shrink-0',
            !secret.enabled ? 'text-gray-400' :
            isExpired ? 'text-red-500' :
            isExpiringSoon ? 'text-amber-500' :
            'text-azure-500'
          )} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {secret.name}
              </p>
              {!secret.enabled && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  Disabled
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  Expired
                </span>
              )}
              {isExpiringSoon && !isExpired && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <ClockIcon className="w-3 h-3" />
                  Expiring Soon
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              {secret.contentType && (
                <span>{secret.contentType}</span>
              )}
              {secret.updated && (
                <span>Updated {formatDistanceToNow(new Date(secret.updated), { addSuffix: true })}</span>
              )}
              {secret.expires && (
                <span>
                  Expires {format(new Date(secret.expires), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onView}
            className="p-1.5 text-gray-400 hover:text-azure-600 hover:bg-azure-50 dark:hover:bg-azure-900/20 rounded transition-colors"
            title="View secret"
          >
            <EyeIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Delete secret"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Secret Modal
interface CreateSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; value: string; contentType?: string; expires?: string }) => Promise<void>;
  isSubmitting: boolean;
}

function CreateSecretModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateSecretModalProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [contentType, setContentType] = useState('');
  const [expires, setExpires] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !value) {
      setError('Name and value are required');
      return;
    }

    // Validate secret name (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      setError('Secret name can only contain alphanumeric characters and hyphens');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        value,
        contentType: contentType.trim() || undefined,
        expires: expires || undefined,
      });
      // Reset form
      setName('');
      setValue('');
      setContentType('');
      setExpires('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create secret');
    }
  };

  const handleClose = () => {
    setName('');
    setValue('');
    setContentType('');
    setExpires('');
    setError(null);
    setShowValue(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Secret">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Secret Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="my-secret-name"
            className="input-field"
            autoFocus
          />
          <p className="mt-1 text-xs text-gray-500">
            Alphanumeric characters and hyphens only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Secret Value *
          </label>
          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter secret value..."
              className={clsx('input-field pr-10', !showValue && 'font-mono')}
              rows={3}
              style={!showValue ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : undefined}
            />
            <button
              type="button"
              onClick={() => setShowValue(!showValue)}
              className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
            >
              {showValue ? (
                <EyeSlashIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Content Type
          </label>
          <input
            type="text"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            placeholder="e.g., text/plain, application/json"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expiration Date
          </label>
          <input
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            className="input-field"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !value || isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Creating...' : 'Create Secret'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

// View Secret Modal
interface ViewSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  secret: KeyVaultSecret;
  vaultUri: string;
  getSecretValue: (params: { secretName: string; version?: string }) => Promise<{ value: string; id: string; contentType?: string }>;
  isLoading: boolean;
}

function ViewSecretModal({ isOpen, onClose, secret, getSecretValue, isLoading }: ViewSecretModalProps) {
  const [secretValue, setSecretValue] = useState<string | null>(null);
  const [showValue, setShowValue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { copyToClipboard, isCopied } = useSecretClipboard();

  const handleLoadValue = async () => {
    try {
      setError(null);
      const result = await getSecretValue({ secretName: secret.name });
      setSecretValue(result.value);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secret value');
    }
  };

  const handleClose = () => {
    setSecretValue(null);
    setShowValue(false);
    setError(null);
    setLoaded(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="View Secret" size="lg">
      <div className="space-y-4">
        {/* Secret Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Name:</span>
            <p className="font-medium text-gray-900 dark:text-white">{secret.name}</p>
          </div>
          {secret.contentType && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Content Type:</span>
              <p className="font-medium text-gray-900 dark:text-white">{secret.contentType}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500 dark:text-gray-400">Status:</span>
            <p className={clsx(
              'font-medium',
              secret.enabled ? 'text-green-600' : 'text-gray-500'
            )}>
              {secret.enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          {secret.created && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Created:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {format(new Date(secret.created), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          )}
          {secret.updated && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Updated:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {format(new Date(secret.updated), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          )}
          {secret.expires && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Expires:</span>
              <p className={clsx(
                'font-medium',
                isPast(new Date(secret.expires)) ? 'text-red-600' : 'text-gray-900 dark:text-white'
              )}>
                {format(new Date(secret.expires), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          )}
        </div>

        {/* Secret Value */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Secret Value
          </label>

          {!loaded ? (
            <div className="text-center py-4">
              <button
                onClick={handleLoadValue}
                disabled={isLoading}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <EyeIcon className="w-4 h-4" />
                    <span>Load Secret Value</span>
                  </>
                )}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Click to securely load the secret value
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className={clsx(
                'p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all',
                !showValue && 'select-none'
              )}>
                {showValue ? secretValue : '•'.repeat(Math.min(secretValue?.length || 20, 40))}
              </div>
              <div className="absolute right-2 top-2 flex gap-1">
                <button
                  onClick={() => setShowValue(!showValue)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-700 rounded"
                  title={showValue ? 'Hide value' : 'Show value'}
                >
                  {showValue ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => secretValue && copyToClipboard(secretValue, secret.id)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-700 rounded"
                  title="Copy to clipboard"
                >
                  {isCopied(secret.id) ? (
                    <CheckIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default KeyVaultManager;
