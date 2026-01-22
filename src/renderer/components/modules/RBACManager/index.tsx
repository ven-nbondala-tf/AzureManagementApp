import { useState, useEffect, useMemo } from 'react';
import { Header, Modal, ConfirmationModal } from '@/components/common';
import {
  usePrincipalSearch,
  useRoleDefinitions,
  useRoleAssignments,
  useResourceGroups,
  useResources,
  type Principal,
  type PrincipalType,
  type AzureResource,
} from '@/hooks';
import { useSubscriptionStore } from '@/store';
import { buildScope } from '@/services/rbac-api';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserIcon,
  UserGroupIcon,
  KeyIcon,
  XMarkIcon,
  FunnelIcon,
  CubeIcon,
  FolderIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import type { RoleAssignmentDisplay } from '@/services/rbac-api';
import clsx from 'clsx';

type ScopeLevel = 'subscription' | 'resourceGroup' | 'resource';

const PRINCIPAL_TYPE_ICONS = {
  User: UserIcon,
  Group: UserGroupIcon,
  ServicePrincipal: KeyIcon,
};

const PRINCIPAL_TYPE_LABELS = {
  User: 'User',
  Group: 'Group',
  ServicePrincipal: 'Service Principal',
};

const SCOPE_ICONS = {
  subscription: CloudIcon,
  resourceGroup: FolderIcon,
  resource: CubeIcon,
};

export function RBACManager() {
  const { selectedSubscription } = useSubscriptionStore();
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>('subscription');
  const [selectedResourceGroup, setSelectedResourceGroup] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<AzureResource | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<PrincipalType | ''>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<RoleAssignmentDisplay | null>(null);

  const { resourceGroups } = useResourceGroups();
  const { isLoading: isLoadingResources, resources: resourceList } = useResources(selectedResourceGroup || undefined);

  const {
    assignments,
    isLoading,
    error,
    refetch,
    createAssignment,
    isCreating,
    createError,
    deleteAssignment,
    isDeleting,
  } = useRoleAssignments(
    scopeLevel === 'resourceGroup' ? selectedResourceGroup : undefined
  );

  // Get unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = new Set(assignments.map(a => a.roleName));
    return Array.from(roles).sort();
  }, [assignments]);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          a.roleName.toLowerCase().includes(query) ||
          a.principalId.toLowerCase().includes(query) ||
          a.principalName?.toLowerCase().includes(query) ||
          a.scopeDisplay.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Role filter
      if (roleFilter && a.roleName !== roleFilter) {
        return false;
      }

      // Type filter
      if (typeFilter && a.principalType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [assignments, searchQuery, roleFilter, typeFilter]);

  const handleDelete = async () => {
    if (!assignmentToDelete) return;
    try {
      await deleteAssignment(assignmentToDelete.id);
      setAssignmentToDelete(null);
    } catch {
      // Error is handled by the hook
    }
  };

  // Reset selections when scope level changes
  useEffect(() => {
    if (scopeLevel === 'subscription') {
      setSelectedResourceGroup('');
      setSelectedResource(null);
    } else if (scopeLevel === 'resourceGroup') {
      setSelectedResource(null);
    }
  }, [scopeLevel]);

  // Get current scope display
  const scopeDisplayText = useMemo(() => {
    if (scopeLevel === 'resource' && selectedResource) {
      return `Resource: ${selectedResource.name}`;
    }
    if (scopeLevel === 'resourceGroup' && selectedResourceGroup) {
      return `Resource Group: ${selectedResourceGroup}`;
    }
    return `Subscription: ${selectedSubscription?.displayName || ''}`;
  }, [scopeLevel, selectedResourceGroup, selectedResource, selectedSubscription]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="RBAC Manager" />

      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Scope Selection - Tabbed Interface */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View assignments at:</span>
            </div>

            {/* Scope Level Tabs */}
            <div className="flex gap-2 mb-4">
              {(['subscription', 'resourceGroup', 'resource'] as ScopeLevel[]).map((level) => {
                const Icon = SCOPE_ICONS[level];
                const labels = {
                  subscription: 'Subscription',
                  resourceGroup: 'Resource Group',
                  resource: 'Resource',
                };
                return (
                  <button
                    key={level}
                    onClick={() => setScopeLevel(level)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
                      scopeLevel === level
                        ? 'bg-azure-100 border-azure-300 text-azure-700 dark:bg-azure-900/30 dark:border-azure-700 dark:text-azure-300'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{labels[level]}</span>
                  </button>
                );
              })}
            </div>

            {/* Resource Group Selector */}
            {(scopeLevel === 'resourceGroup' || scopeLevel === 'resource') && (
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm text-gray-600 dark:text-gray-400">Resource Group:</label>
                <select
                  value={selectedResourceGroup}
                  onChange={(e) => {
                    setSelectedResourceGroup(e.target.value);
                    setSelectedResource(null);
                  }}
                  className="input-field py-1.5 pr-8 max-w-md"
                >
                  <option value="">Select a resource group...</option>
                  {resourceGroups.map((rg) => (
                    <option key={rg.id} value={rg.name}>
                      {rg.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Resource Selector */}
            {scopeLevel === 'resource' && selectedResourceGroup && (
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 dark:text-gray-400">Resource:</label>
                {isLoadingResources ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading resources...</span>
                  </div>
                ) : (
                  <select
                    value={selectedResource?.id || ''}
                    onChange={(e) => {
                      const resource = resourceList.find(r => r.id === e.target.value);
                      setSelectedResource(resource || null);
                    }}
                    className="input-field py-1.5 pr-8 max-w-lg"
                  >
                    <option value="">Select a resource...</option>
                    {resourceList.map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name} ({resource.type.split('/').pop()})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Current Scope Display */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Current scope:</span> {scopeDisplayText}
              </p>
            </div>
          </div>

          {/* Filters and Actions Bar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, role, or scope..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field py-1.5 pl-9 w-full"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-field py-1.5 pr-8 text-sm"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PrincipalType | '')}
              className="input-field py-1.5 pr-8 text-sm"
            >
              <option value="">All Types</option>
              <option value="User">Users</option>
              <option value="Group">Groups</option>
              <option value="ServicePrincipal">Service Principals</option>
            </select>

            <div className="flex-1" />

            {/* Actions */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="btn-secondary py-1.5 px-3"
              title="Refresh"
            >
              <ArrowPathIcon className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary py-1.5 px-3 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Assignment</span>
            </button>
          </div>

          {/* Active Filters */}
          {(searchQuery || roleFilter || typeFilter) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-red-500">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              )}
              {roleFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  Role: {roleFilter}
                  <button onClick={() => setRoleFilter('')} className="hover:text-red-500">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              )}
              {typeFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  Type: {PRINCIPAL_TYPE_LABELS[typeFilter]}
                  <button onClick={() => setTypeFilter('')} className="hover:text-red-500">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('');
                  setTypeFilter('');
                }}
                className="text-sm text-azure-600 hover:text-azure-700 dark:text-azure-400"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Role Assignments Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Principal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Scope
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          <span>Loading assignments...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery || roleFilter || typeFilter
                          ? 'No matching assignments'
                          : 'No role assignments found at this scope'}
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((assignment) => {
                      const Icon = PRINCIPAL_TYPE_ICONS[assignment.principalType];
                      return (
                        <tr
                          key={assignment.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Icon className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {assignment.principalName || assignment.principalId}
                                </p>
                                {assignment.principalName && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                    {assignment.principalId.slice(0, 8)}...
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {PRINCIPAL_TYPE_LABELS[assignment.principalType]}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-azure-100 text-azure-800 dark:bg-azure-900/30 dark:text-azure-300">
                              {assignment.roleName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {assignment.scopeDisplay}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setAssignmentToDelete(assignment)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Remove assignment"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            {!isLoading && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredAssignments.length} of {assignments.length} assignments
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data) => {
          await createAssignment({
            principalId: data.principal.id,
            principalType: data.principal.type,
            roleDefinitionId: data.roleDefinitionId,
            targetScope: data.scope,
          });
          setIsCreateModalOpen(false);
        }}
        isSubmitting={isCreating}
        error={createError}
        resourceGroups={resourceGroups}
        // Pre-populate with current scope
        initialScopeLevel={scopeLevel}
        initialResourceGroup={selectedResourceGroup}
        initialResource={selectedResource}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Role Assignment"
        message={
          assignmentToDelete && (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>Are you sure you want to remove this role assignment?</p>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-1">
                <p>
                  <span className="font-medium">Principal:</span>{' '}
                  {assignmentToDelete.principalName || assignmentToDelete.principalId}
                </p>
                <p>
                  <span className="font-medium">Role:</span>{' '}
                  {assignmentToDelete.roleName}
                </p>
                <p>
                  <span className="font-medium">Scope:</span>{' '}
                  {assignmentToDelete.scopeDisplay}
                </p>
              </div>
              <p className="text-yellow-600 dark:text-yellow-400">
                This action will immediately revoke access.
              </p>
            </div>
          )
        }
        confirmText="Remove Assignment"
        isDangerous
        isLoading={isDeleting}
        icon="delete"
      />
    </div>
  );
}

// Create Assignment Modal Component
interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    principal: Principal;
    roleDefinitionId: string;
    scope: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  resourceGroups: Array<{ id: string; name: string }>;
  initialScopeLevel: ScopeLevel;
  initialResourceGroup: string;
  initialResource: AzureResource | null;
}

function CreateAssignmentModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  resourceGroups,
  initialScopeLevel,
  initialResourceGroup,
  initialResource,
}: CreateAssignmentModalProps) {
  const { selectedSubscription } = useSubscriptionStore();
  const [selectedPrincipal, setSelectedPrincipal] = useState<Principal | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>(initialScopeLevel);
  const [resourceGroup, setResourceGroup] = useState<string>(initialResourceGroup);
  const [resource, setResource] = useState<AzureResource | null>(initialResource);
  const [principalSearchQuery, setPrincipalSearchQuery] = useState('');
  const [principalTypes, setPrincipalTypes] = useState<PrincipalType[]>(['User', 'Group', 'ServicePrincipal']);

  const { search, results, isSearching, clearResults } = usePrincipalSearch();
  const { commonRoles, roleDefinitions } = useRoleDefinitions();
  const { resources: scopeResources, isLoading: isLoadingResources } = useResources(resourceGroup || undefined);

  // Reset form when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setScopeLevel(initialScopeLevel);
      setResourceGroup(initialResourceGroup);
      setResource(initialResource);
    }
  }, [isOpen, initialScopeLevel, initialResourceGroup, initialResource]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPrincipal(null);
      setSelectedRole('');
      setPrincipalSearchQuery('');
      clearResults();
    }
  }, [isOpen, clearResults]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (principalSearchQuery.length >= 2) {
        search(principalSearchQuery, principalTypes);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [principalSearchQuery, principalTypes, search, clearResults]);

  const handleSubmit = async () => {
    if (!selectedPrincipal || !selectedRole || !selectedSubscription) return;

    const scope = scopeLevel === 'resource' && resource
      ? resource.id
      : buildScope(
          selectedSubscription.subscriptionId,
          scopeLevel === 'resourceGroup' || scopeLevel === 'resource' ? resourceGroup : undefined
        );

    await onSubmit({
      principal: selectedPrincipal,
      roleDefinitionId: selectedRole,
      scope,
    });
  };

  const canSubmit =
    selectedPrincipal &&
    selectedRole &&
    (scopeLevel === 'subscription' ||
      (scopeLevel === 'resourceGroup' && resourceGroup) ||
      (scopeLevel === 'resource' && resource));

  // Get scope display for confirmation
  const scopeDisplay = useMemo(() => {
    if (scopeLevel === 'resource' && resource) {
      return `Resource: ${resource.name}`;
    }
    if ((scopeLevel === 'resourceGroup' || scopeLevel === 'resource') && resourceGroup) {
      return `Resource Group: ${resourceGroup}`;
    }
    return `Subscription: ${selectedSubscription?.displayName || ''}`;
  }, [scopeLevel, resourceGroup, resource, selectedSubscription]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Role Assignment" size="lg">
      <div className="space-y-6">
        {/* Step 1: Select Principal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            1. Who needs access?
          </label>

          {/* Principal Type Filters */}
          <div className="flex gap-2 mb-2">
            {(['User', 'Group', 'ServicePrincipal'] as PrincipalType[]).map((type) => {
              const Icon = PRINCIPAL_TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => {
                    setPrincipalTypes((prev) =>
                      prev.includes(type)
                        ? prev.filter((t) => t !== type)
                        : [...prev, type]
                    );
                  }}
                  className={clsx(
                    'px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1',
                    principalTypes.includes(type)
                      ? 'bg-azure-100 border-azure-300 text-azure-700 dark:bg-azure-900/30 dark:border-azure-700 dark:text-azure-300'
                      : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {PRINCIPAL_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>

          {selectedPrincipal ? (
            <div className="flex items-center justify-between p-3 bg-azure-50 dark:bg-azure-900/20 border border-azure-200 dark:border-azure-800 rounded-lg">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = PRINCIPAL_TYPE_ICONS[selectedPrincipal.type];
                  return <Icon className="w-5 h-5 text-azure-600" />;
                })()}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedPrincipal.displayName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {PRINCIPAL_TYPE_LABELS[selectedPrincipal.type]}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrincipal(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for users, groups, or service principals..."
                value={principalSearchQuery}
                onChange={(e) => setPrincipalSearchQuery(e.target.value)}
                className="input-field pl-9"
              />

              {/* Search Results Dropdown */}
              {(results.length > 0 || isSearching) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3 text-center text-gray-500">
                      <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" />
                    </div>
                  ) : (
                    results.map((principal) => {
                      const Icon = PRINCIPAL_TYPE_ICONS[principal.type];
                      return (
                        <button
                          key={principal.id}
                          onClick={() => {
                            setSelectedPrincipal(principal);
                            setPrincipalSearchQuery('');
                            clearResults();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                        >
                          <Icon className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              {principal.displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {PRINCIPAL_TYPE_LABELS[principal.type]}
                              {principal.email && ` - ${principal.email}`}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Select Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            2. What role should they have?
          </label>

          {/* Quick Role Selection */}
          <div className="flex flex-wrap gap-2 mb-2">
            {commonRoles.slice(0, 4).map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-lg border transition-colors',
                  selectedRole === role.id
                    ? 'bg-azure-100 border-azure-300 text-azure-700 dark:bg-azure-900/30 dark:border-azure-700 dark:text-azure-300'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                )}
              >
                {role.name}
              </button>
            ))}
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input-field"
          >
            <option value="">Select a role...</option>
            <optgroup label="Common Roles">
              {commonRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="All Roles">
              {roleDefinitions.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.properties.roleName}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Step 3: Select Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            3. Where should they have access?
          </label>

          {/* Scope Level Selection */}
          <div className="flex gap-2 mb-3">
            {(['subscription', 'resourceGroup', 'resource'] as ScopeLevel[]).map((level) => {
              const Icon = SCOPE_ICONS[level];
              const labels = {
                subscription: 'Subscription',
                resourceGroup: 'Resource Group',
                resource: 'Resource',
              };
              return (
                <button
                  key={level}
                  onClick={() => {
                    setScopeLevel(level);
                    if (level === 'subscription') {
                      setResourceGroup('');
                      setResource(null);
                    } else if (level === 'resourceGroup') {
                      setResource(null);
                    }
                  }}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors',
                    scopeLevel === level
                      ? 'bg-azure-100 border-azure-300 text-azure-700 dark:bg-azure-900/30 dark:border-azure-700 dark:text-azure-300'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {labels[level]}
                </button>
              );
            })}
          </div>

          {/* Resource Group Selector */}
          {(scopeLevel === 'resourceGroup' || scopeLevel === 'resource') && (
            <select
              value={resourceGroup}
              onChange={(e) => {
                setResourceGroup(e.target.value);
                setResource(null);
              }}
              className="input-field mb-2"
            >
              <option value="">Select Resource Group...</option>
              {resourceGroups.map((rg) => (
                <option key={rg.id} value={rg.name}>
                  {rg.name}
                </option>
              ))}
            </select>
          )}

          {/* Resource Selector */}
          {scopeLevel === 'resource' && resourceGroup && (
            <>
              {isLoadingResources ? (
                <div className="flex items-center gap-2 text-gray-500 py-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading resources...</span>
                </div>
              ) : (
                <select
                  value={resource?.id || ''}
                  onChange={(e) => {
                    const r = scopeResources.find(res => res.id === e.target.value);
                    setResource(r || null);
                  }}
                  className="input-field"
                >
                  <option value="">Select Resource...</option>
                  {scopeResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type.split('/').pop()})
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* Scope Preview */}
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Scope:</span> {scopeDisplay}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Adding...' : 'Add Assignment'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default RBACManager;
