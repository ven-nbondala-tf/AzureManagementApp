import { useState, useEffect } from 'react';
import { useApplicationList, useApplicationDetails, useClipboard } from '../../../hooks';
import { Modal } from '../../common/Modal';
import { Header } from '../../common/Header';
import type { Application, CreateSecretResult } from '../../../services/sp-api';

type TabType = 'secrets' | 'federated';

export function ServicePrincipalManager() {
  const {
    applications,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    createAppRegistration,
    isCreating,
    deleteApplication,
    isDeleting,
  } = useApplicationList();

  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('secrets');

  // Clear selection when search changes
  useEffect(() => {
    setSelectedApp(null);
  }, [searchQuery]);

  const handleDelete = async () => {
    if (!selectedApp) return;
    try {
      await deleteApplication(selectedApp.id);
      setSelectedApp(null);
      setShowDeleteConfirm(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Service Principal Manager" />

      <main className="flex-1 overflow-auto p-6">
        <div className="h-full flex gap-6">
          {/* Left Panel - Application List */}
          <div className="w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  New App
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading applications...</div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
              ) : applications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchQuery ? 'No applications found' : 'No applications yet'}
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {applications.map((app) => (
                    <li
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedApp?.id === app.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {app.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        {app.appId}
                      </div>
                      {app.description && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {app.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Panel - Application Details */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {selectedApp ? (
              <ApplicationDetailsPanel
                app={selectedApp}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onDelete={() => setShowDeleteConfirm(true)}
                isDeleting={isDeleting}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select an application to view details
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create App Modal */}
      <CreateAppModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createAppRegistration}
        isCreating={isCreating}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Application"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong>{selectedApp?.displayName}</strong>?
            This action cannot be undone and will also remove the associated service principal.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface ApplicationDetailsPanelProps {
  app: Application;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ApplicationDetailsPanel({
  app,
  activeTab,
  setActiveTab,
  onDelete,
  isDeleting,
}: ApplicationDetailsPanelProps) {
  const {
    application,
    isLoading,
    error,
    addSecret,
    isAddingSecret,
    removeSecret,
    isRemovingSecret,
    addGitHubFederatedCredential,
    isAddingGitHubFederated,
    removeFederatedCredential,
    isRemovingFederated,
  } = useApplicationDetails(app.id);

  const { copy, copied } = useClipboard();
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showFederatedModal, setShowFederatedModal] = useState(false);
  const [newSecret, setNewSecret] = useState<CreateSecretResult | null>(null);

  const handleAddSecret = async (displayName: string, expirationMonths: number) => {
    try {
      const result = await addSecret({ displayName, expirationMonths });
      setNewSecret(result);
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddFederated = async (options: {
    organization: string;
    repository: string;
    entityType: 'branch' | 'tag' | 'environment' | 'pull_request';
    entityValue?: string;
  }) => {
    try {
      await addGitHubFederatedCredential(options);
      setShowFederatedModal(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {app.displayName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {app.appId}
              </span>
              <button
                onClick={() => copy(app.appId)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            Delete
          </button>
        </div>

        {application?.servicePrincipal && (
          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
            <span className="text-gray-500 dark:text-gray-400">Service Principal ID: </span>
            <span className="font-mono text-gray-700 dark:text-gray-300">
              {application.servicePrincipal.id}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('secrets')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'secrets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Client Secrets
            {application && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                {application.passwordCredentials.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('federated')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'federated'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Federated Credentials
            {application && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                {application.federatedIdentityCredentials.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : activeTab === 'secrets' ? (
          <SecretsTab
            secrets={application?.passwordCredentials || []}
            onAddSecret={() => setShowSecretModal(true)}
            onRemoveSecret={removeSecret}
            isRemoving={isRemovingSecret}
            copy={copy}
          />
        ) : (
          <FederatedTab
            credentials={application?.federatedIdentityCredentials || []}
            onAddCredential={() => setShowFederatedModal(true)}
            onRemoveCredential={removeFederatedCredential}
            isRemoving={isRemovingFederated}
          />
        )}
      </div>

      {/* Add Secret Modal */}
      <AddSecretModal
        isOpen={showSecretModal}
        onClose={() => {
          setShowSecretModal(false);
          setNewSecret(null);
        }}
        onAdd={handleAddSecret}
        isAdding={isAddingSecret}
        newSecret={newSecret}
        copy={copy}
        copied={copied}
      />

      {/* Add Federated Modal */}
      <AddFederatedModal
        isOpen={showFederatedModal}
        onClose={() => setShowFederatedModal(false)}
        onAdd={handleAddFederated}
        isAdding={isAddingGitHubFederated}
      />
    </>
  );
}

interface SecretsTabProps {
  secrets: Array<{
    keyId: string;
    displayName?: string;
    hint?: string;
    startDateTime: string;
    endDateTime: string;
  }>;
  onAddSecret: () => void;
  onRemoveSecret: (keyId: string) => Promise<void>;
  isRemoving: boolean;
  copy: (text: string) => Promise<boolean>;
}

function SecretsTab({ secrets, onAddSecret, onRemoveSecret, isRemoving, copy }: SecretsTabProps) {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const getExpirationStatus = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const daysUntil = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { status: 'expired', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400', label: 'Expired', days: daysUntil };
    if (daysUntil < 30) return { status: 'expiring', color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400', label: `${daysUntil}d`, days: daysUntil };
    if (daysUntil < 90) return { status: 'warning', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400', label: `${daysUntil}d`, days: daysUntil };
    return { status: 'ok', color: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400', label: `${daysUntil}d`, days: daysUntil };
  };

  const handleCopyKeyId = async (keyId: string) => {
    const success = await copy(keyId);
    if (success) {
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Client Secrets
        </h3>
        <button
          onClick={onAddSecret}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Add Secret
        </button>
      </div>

      {secrets.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No client secrets configured
        </div>
      ) : (
        <div className="space-y-3">
          {secrets.map((secret) => {
            const expStatus = getExpirationStatus(secret.endDateTime);
            return (
              <div
                key={secret.keyId}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {secret.displayName || 'Unnamed Secret'}
                      </span>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${expStatus.color}`}>
                        {expStatus.label}
                      </span>
                    </div>
                    {secret.hint && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        Value: {secret.hint}***
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Expires:</span>{' '}
                        {new Date(secret.endDateTime).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Key ID:</span>{' '}
                        <span className="font-mono truncate max-w-[100px]">{secret.keyId.slice(0, 8)}...</span>
                        <button
                          onClick={() => handleCopyKeyId(secret.keyId)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {copiedKeyId === secret.keyId ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveSecret(secret.keyId)}
                    disabled={isRemoving}
                    className="flex-shrink-0 text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FederatedTabProps {
  credentials: Array<{
    id: string;
    name: string;
    issuer: string;
    subject: string;
    description?: string;
  }>;
  onAddCredential: () => void;
  onRemoveCredential: (id: string) => Promise<void>;
  isRemoving: boolean;
}

function FederatedTab({ credentials, onAddCredential, onRemoveCredential, isRemoving }: FederatedTabProps) {
  const { copy } = useClipboard();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (value: string, field: string) => {
    const success = await copy(value);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Federated Identity Credentials
        </h3>
        <button
          onClick={onAddCredential}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Add GitHub OIDC
        </button>
      </div>

      {credentials.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No federated credentials configured
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {cred.name}
                  </div>
                  {cred.description && (
                    <div className="text-sm text-gray-500 mt-1 truncate">
                      {cred.description}
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    {/* Issuer */}
                    <div className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Issuer:</span>
                        <button
                          onClick={() => handleCopy(cred.issuer, `issuer-${cred.id}`)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          {copiedField === `issuer-${cred.id}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono text-xs break-all overflow-hidden">
                        {cred.issuer}
                      </div>
                    </div>
                    {/* Subject */}
                    <div className="text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-500 dark:text-gray-400">Subject:</span>
                        <button
                          onClick={() => handleCopy(cred.subject, `subject-${cred.id}`)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          {copiedField === `subject-${cred.id}` ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono text-xs break-all overflow-hidden">
                        {cred.subject}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveCredential(cred.id)}
                  disabled={isRemoving}
                  className="flex-shrink-0 text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CreateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { displayName: string; description?: string; signInAudience?: string }) => Promise<unknown>;
  isCreating: boolean;
}

function CreateAppModal({ isOpen, onClose, onCreate, isCreating }: CreateAppModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [signInAudience, setSignInAudience] = useState('AzureADMyOrg');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      await onCreate({
        displayName: displayName.trim(),
        description: description.trim() || undefined,
        signInAudience,
      });
      setDisplayName('');
      setDescription('');
      setSignInAudience('AzureADMyOrg');
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create App Registration">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My Application"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Supported Account Types
          </label>
          <select
            value={signInAudience}
            onChange={(e) => setSignInAudience(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="AzureADMyOrg">Single tenant (this directory only)</option>
            <option value="AzureADMultipleOrgs">Multi-tenant (any Azure AD)</option>
            <option value="AzureADandPersonalMicrosoftAccount">Multi-tenant + personal accounts</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating || !displayName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface AddSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (displayName: string, expirationMonths: number) => Promise<void>;
  isAdding: boolean;
  newSecret: CreateSecretResult | null;
  copy: (text: string) => Promise<boolean>;
  copied: boolean;
}

function AddSecretModal({ isOpen, onClose, onAdd, isAdding, newSecret, copy, copied }: AddSecretModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [expirationMonths, setExpirationMonths] = useState(12);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    await onAdd(displayName.trim(), expirationMonths);
  };

  const handleClose = () => {
    setDisplayName('');
    setExpirationMonths(12);
    onClose();
  };

  if (newSecret) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Secret Created">
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              Copy the secret value now - it won't be shown again!
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Secret Value
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSecret.secretText}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
              <button
                onClick={() => copy(newSecret.secretText)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Key ID:</span>
              <div className="font-mono text-gray-700 dark:text-gray-300 truncate">
                {newSecret.keyId}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Expires:</span>
              <div className="text-gray-700 dark:text-gray-300">
                {new Date(newSecret.endDateTime).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Client Secret">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., Production Secret"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expiration
          </label>
          <select
            value={expirationMonths}
            onChange={(e) => setExpirationMonths(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
            <option value={18}>18 months</option>
            <option value={24}>24 months</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isAdding || !displayName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isAdding ? 'Creating...' : 'Create Secret'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface AddFederatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (options: {
    organization: string;
    repository: string;
    entityType: 'branch' | 'tag' | 'environment' | 'pull_request';
    entityValue?: string;
  }) => Promise<void>;
  isAdding: boolean;
}

function AddFederatedModal({ isOpen, onClose, onAdd, isAdding }: AddFederatedModalProps) {
  const [organization, setOrganization] = useState('');
  const [repository, setRepository] = useState('');
  const [entityType, setEntityType] = useState<'branch' | 'tag' | 'environment' | 'pull_request'>('branch');
  const [entityValue, setEntityValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization.trim() || !repository.trim()) return;
    if (entityType !== 'pull_request' && !entityValue.trim()) return;

    await onAdd({
      organization: organization.trim(),
      repository: repository.trim(),
      entityType,
      entityValue: entityType === 'pull_request' ? undefined : entityValue.trim(),
    });
  };

  const handleClose = () => {
    setOrganization('');
    setRepository('');
    setEntityType('branch');
    setEntityValue('');
    onClose();
  };

  const needsEntityValue = entityType !== 'pull_request';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add GitHub OIDC Credential">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Configure federated credentials for GitHub Actions to authenticate without secrets.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Organization *
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="my-org"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Repository *
            </label>
            <input
              type="text"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              placeholder="my-repo"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Entity Type *
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as typeof entityType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="branch">Branch</option>
            <option value="tag">Tag</option>
            <option value="environment">Environment</option>
            <option value="pull_request">Pull Request</option>
          </select>
        </div>

        {needsEntityValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {entityType === 'branch' ? 'Branch Name' : entityType === 'tag' ? 'Tag Pattern' : 'Environment Name'} *
            </label>
            <input
              type="text"
              value={entityValue}
              onChange={(e) => setEntityValue(e.target.value)}
              placeholder={entityType === 'branch' ? 'main' : entityType === 'tag' ? 'v*' : 'production'}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isAdding || !organization.trim() || !repository.trim() || (needsEntityValue && !entityValue.trim())}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isAdding ? 'Adding...' : 'Add Credential'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ServicePrincipalManager;
