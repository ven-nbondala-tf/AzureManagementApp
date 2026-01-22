import { useState, useEffect, useMemo } from 'react';
import { Header, Modal, ConfirmationModal } from '@/components/common';
import {
  useGroupList,
  useGroupDetails,
  useMemberSearch,
  getGroupProtectionStatus,
  type MemberSearchResult,
  type GroupSearchMode,
} from '@/hooks';
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserGroupIcon,
  UserIcon,
  KeyIcon,
  XMarkIcon,
  CheckIcon,
  UserPlusIcon,
  UserMinusIcon,
  ShieldExclamationIcon,
  CloudIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { Group } from '@/types';

const MEMBER_TYPE_ICONS = {
  User: UserIcon,
  ServicePrincipal: KeyIcon,
  Group: UserGroupIcon,
};

export function GroupsManager() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const {
    groups,
    isLoading,
    error,
    refetch,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    createGroup,
    isCreating,
    createError,
    deleteGroup,
    isDeleting,
  } = useGroupList();

  const {
    group: groupDetails,
    members,
    isLoadingMembers,
    addMember,
    isAddingMember,
    addMemberError,
    resetAddMemberError,
    removeMember,
    isRemovingMember,
    refetchMembers,
  } = useGroupDetails(selectedGroup?.id || null);

  // Get protection status for the selected group
  const protectionStatus = useMemo(() => {
    if (!groupDetails) return null;
    return getGroupProtectionStatus(groupDetails);
  }, [groupDetails]);

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await deleteGroup(groupToDelete.id);
      if (selectedGroup?.id === groupToDelete.id) {
        setSelectedGroup(null);
      }
      setGroupToDelete(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Groups Manager" />

      <main className="flex-1 overflow-hidden p-6">
        <div className="h-full flex gap-6">
          {/* Groups List Panel */}
          <div className="w-1/3 flex flex-col card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Security Groups
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <ArrowPathIcon className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="p-1.5 text-azure-600 hover:bg-azure-50 dark:hover:bg-azure-900/20 rounded transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field py-1.5 pl-9 text-sm"
                  />
                </div>
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as GroupSearchMode)}
                  className="input-field py-1.5 px-2 text-xs w-24"
                  title="Search mode"
                >
                  <option value="startswith">Starts with</option>
                  <option value="contains">Contains</option>
                  <option value="exact">Exact</option>
                </select>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Groups List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : groups.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No matching groups' : 'No groups found'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className={clsx(
                        'p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                        selectedGroup?.id === group.id && 'bg-azure-50 dark:bg-azure-900/20'
                      )}
                      onClick={() => setSelectedGroup(group)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserGroupIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {group.displayName}
                            </p>
                            {group.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {group.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGroupToDelete(group);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete group"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {groups.length} group{groups.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Group Details Panel */}
          <div className="flex-1 card overflow-hidden flex flex-col">
            {selectedGroup ? (
              <>
                {/* Group Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        protectionStatus?.isProtected
                          ? 'bg-amber-100 dark:bg-amber-900/30'
                          : 'bg-azure-100 dark:bg-azure-900/30'
                      )}>
                        {protectionStatus?.isProtected ? (
                          <ShieldExclamationIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <UserGroupIcon className="w-5 h-5 text-azure-600 dark:text-azure-400" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedGroup.displayName}
                        </h2>
                        {selectedGroup.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedGroup.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedGroup(null)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Group Type Badges */}
                  {groupDetails && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {groupDetails.securityEnabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          <LockClosedIcon className="w-3 h-3" />
                          Security
                        </span>
                      )}
                      {groupDetails.groupTypes?.includes('Unified') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          Microsoft 365
                        </span>
                      )}
                      {groupDetails.groupTypes?.includes('DynamicMembership') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          Dynamic
                        </span>
                      )}
                      {groupDetails.onPremisesSyncEnabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <CloudIcon className="w-3 h-3" />
                          On-Premises Synced
                        </span>
                      )}
                      {groupDetails.isAssignableToRole && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          Role-Assignable
                        </span>
                      )}
                      {groupDetails.mailEnabled && groupDetails.mail && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Mail-Enabled
                        </span>
                      )}
                    </div>
                  )}

                  {/* Protection Warning */}
                  {protectionStatus?.isProtected && (
                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <ShieldExclamationIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            Protected Group
                          </p>
                          <ul className="mt-1 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                            {protectionStatus.reasons.map((reason, idx) => (
                              <li key={idx}>• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Group Info */}
                  {groupDetails && (groupDetails.mail || groupDetails.createdDateTime) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {groupDetails.mail && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <span className="ml-1 text-gray-700 dark:text-gray-300">{groupDetails.mail}</span>
                          </div>
                        )}
                        {groupDetails.createdDateTime && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Created:</span>
                            <span className="ml-1 text-gray-700 dark:text-gray-300">
                              {new Date(groupDetails.createdDateTime).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {groupDetails.visibility && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Visibility:</span>
                            <span className="ml-1 text-gray-700 dark:text-gray-300">{groupDetails.visibility}</span>
                          </div>
                        )}
                        {groupDetails.membershipRule && (
                          <div className="col-span-2">
                            <span className="text-gray-500 dark:text-gray-400">Membership Rule:</span>
                            <code className="ml-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                              {groupDetails.membershipRule}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Members Section */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Members ({members.length})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => refetchMembers()}
                        disabled={isLoadingMembers}
                        className="btn-secondary py-1 px-2 text-xs"
                      >
                        <ArrowPathIcon className={clsx('w-3 h-3', isLoadingMembers && 'animate-spin')} />
                      </button>
                      <button
                        onClick={() => setIsAddMembersModalOpen(true)}
                        className="btn-primary py-1 px-2 text-xs flex items-center gap-1"
                      >
                        <UserPlusIcon className="w-3 h-3" />
                        <span>Add Members</span>
                      </button>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoadingMembers ? (
                      <div className="p-8 text-center text-gray-500">
                        <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto" />
                      </div>
                    ) : members.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <UserGroupIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No members in this group</p>
                        <button
                          onClick={() => setIsAddMembersModalOpen(true)}
                          className="mt-2 text-azure-600 dark:text-azure-400 text-sm hover:underline"
                        >
                          Add members
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {members.map((member) => {
                          const Icon = MEMBER_TYPE_ICONS[member.type];
                          return (
                            <div
                              key={member.id}
                              className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {member.displayName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {member.type === 'User' && member.email}
                                    {member.type === 'ServicePrincipal' && `App ID: ${member.appId?.slice(0, 8)}...`}
                                    {member.type === 'Group' && 'Nested Group'}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={isRemovingMember}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Remove member"
                              >
                                <UserMinusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a group to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (data) => {
          await createGroup(data);
          setIsCreateModalOpen(false);
        }}
        isSubmitting={isCreating}
        error={createError}
      />

      {/* Add Members Modal */}
      {selectedGroup && (
        <AddMembersModal
          isOpen={isAddMembersModalOpen}
          onClose={() => {
            setIsAddMembersModalOpen(false);
            resetAddMemberError();
          }}
          onAddMember={async (memberId) => {
            await addMember(memberId);
          }}
          isAdding={isAddingMember}
          existingMemberIds={members.map((m) => m.id)}
          error={addMemberError}
          onClearError={resetAddMemberError}
          groupId={selectedGroup.id}
        />
      )}

      {/* Delete Group Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={handleDeleteGroup}
        title="Delete Group"
        message={
          groupToDelete && (
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                Are you sure you want to delete the group{' '}
                <strong className="text-gray-900 dark:text-white">
                  {groupToDelete.displayName}
                </strong>
                ?
              </p>
              {groupToDelete.description && (
                <p className="text-xs italic">{groupToDelete.description}</p>
              )}
              <p className="text-red-600 dark:text-red-400">
                This action cannot be undone and will remove all members from
                the group.
              </p>
            </div>
          )
        }
        confirmText="Delete Group"
        isDangerous
        isLoading={isDeleting}
        icon="delete"
      />
    </div>
  );
}

// Create Group Modal
interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { displayName: string; description?: string }) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

function CreateGroupModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: CreateGroupModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDisplayName('');
      setDescription('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!displayName.trim()) return;
    await onSubmit({
      displayName: displayName.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Security Group">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter group name"
            className="input-field"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter group description (optional)"
            className="input-field"
            rows={3}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!displayName.trim() || isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Creating...' : 'Create Group'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Add Members Modal
interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (memberId: string) => Promise<void>;
  isAdding: boolean;
  existingMemberIds: string[];
  error: string | null;
  onClearError: () => void;
  groupId: string;
}

function AddMembersModal({
  isOpen,
  onClose,
  onAddMember,
  isAdding,
  existingMemberIds,
  error,
  onClearError,
  groupId,
}: AddMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [includeUsers, setIncludeUsers] = useState(true);
  const [includeSPs, setIncludeSPs] = useState(true);
  const [includeGroups, setIncludeGroups] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState<MemberSearchResult[]>([]);

  // Pass groupId to exclude the current group from search results
  const { search, results, isSearching, clearResults } = useMemberSearch(groupId);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSelectedMembers([]);
      clearResults();
      onClearError();
    }
  }, [isOpen, clearResults, onClearError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        search(searchQuery, includeUsers, includeSPs, includeGroups);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, includeUsers, includeSPs, includeGroups, search, clearResults]);

  // Separate results into available and already existing members
  const { availableResults, existingResults } = useMemo(() => {
    const available: MemberSearchResult[] = [];
    const existing: MemberSearchResult[] = [];

    for (const r of results) {
      if (existingMemberIds.includes(r.id)) {
        existing.push(r);
      } else if (!selectedMembers.some((s) => s.id === r.id)) {
        available.push(r);
      }
    }

    return { availableResults: available, existingResults: existing };
  }, [results, existingMemberIds, selectedMembers]);

  const handleAddSelected = async () => {
    const failedMembers: MemberSearchResult[] = [];
    const successfulMembers: string[] = [];

    for (const member of selectedMembers) {
      try {
        await onAddMember(member.id);
        successfulMembers.push(member.id);
      } catch {
        failedMembers.push(member);
      }
    }

    // Remove successfully added members from selection
    if (successfulMembers.length > 0) {
      setSelectedMembers(failedMembers);
    }

    // Only close if all members were added successfully
    if (failedMembers.length === 0) {
      onClose();
    }
  };

  const toggleMemberSelection = (member: MemberSearchResult) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Members" size="lg">
      <div className="space-y-4">
        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIncludeUsers(!includeUsers)}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1',
              includeUsers
                ? 'bg-azure-100 border-azure-300 text-azure-700 dark:bg-azure-900/30 dark:border-azure-700 dark:text-azure-300'
                : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
            )}
          >
            <UserIcon className="w-4 h-4" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setIncludeSPs(!includeSPs)}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1',
              includeSPs
                ? 'bg-azure-100 border-azure-300 text-azure-700 dark:bg-azure-900/30 dark:border-azure-700 dark:text-azure-300'
                : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
            )}
          >
            <KeyIcon className="w-4 h-4" />
            <span>Service Principals</span>
          </button>
          <button
            onClick={() => setIncludeGroups(!includeGroups)}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg border transition-colors flex items-center gap-1',
              includeGroups
                ? 'bg-azure-100 border-azure-300 text-azure-700 dark:bg-azure-900/30 dark:border-azure-700 dark:text-azure-300'
                : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
            )}
          >
            <UserGroupIcon className="w-4 h-4" />
            <span>Groups</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search for users, service principals, or groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
            autoFocus
          />
        </div>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <span
                key={member.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300 rounded-full text-sm"
              >
                {member.displayName}
                <button
                  onClick={() => toggleMemberSelection(member)}
                  className="hover:text-azure-900 dark:hover:text-azure-100"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search Results */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : availableResults.length > 0 || existingResults.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Available members (can be selected) */}
              {availableResults.map((result) => {
                const Icon = result.type === 'User' ? UserIcon : result.type === 'Group' ? UserGroupIcon : KeyIcon;
                const isSelected = selectedMembers.some((m) => m.id === result.id);
                const subtitle = result.type === 'User'
                  ? result.email
                  : result.type === 'Group'
                    ? 'Group'
                    : `App ID: ${result.appId}`;
                return (
                  <button
                    key={result.id}
                    onClick={() => toggleMemberSelection(result)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                      isSelected && 'bg-azure-50 dark:bg-azure-900/20'
                    )}
                  >
                    <Icon className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {subtitle}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckIcon className="w-5 h-5 text-azure-600" />
                    )}
                  </button>
                );
              })}

              {/* Already existing members (shown but disabled) */}
              {existingResults.map((result) => {
                const Icon = result.type === 'User' ? UserIcon : result.type === 'Group' ? UserGroupIcon : KeyIcon;
                const subtitle = result.type === 'User'
                  ? result.email
                  : result.type === 'Group'
                    ? 'Group'
                    : `App ID: ${result.appId}`;
                return (
                  <div
                    key={result.id}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 opacity-60"
                  >
                    <Icon className="w-5 h-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                        {result.displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                        {subtitle}
                      </p>
                    </div>
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                      Already member
                    </span>
                  </div>
                );
              })}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Type at least 2 characters to search
            </div>
          )}
        </div>

        {/* Error Display */}
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
            onClick={handleAddSelected}
            disabled={selectedMembers.length === 0 || isAdding}
            className="btn-primary flex items-center gap-2"
          >
            {isAdding && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            <span>
              {isAdding
                ? 'Adding...'
                : `Add ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}`}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default GroupsManager;
