/**
 * Entra ID Groups API Service
 * Handles group management operations via Microsoft Graph
 */

import { getGraphToken } from './azure-auth';
import { apiFetch } from './api-fetch';
import type { User, Group, ServicePrincipal } from '../types';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export interface GroupMember {
  id: string;
  displayName: string;
  type: 'User' | 'ServicePrincipal' | 'Group';
  email?: string;
  appId?: string;
}

export interface GroupDetails extends Group {
  membersCount?: number;
  ownersCount?: number;
  createdDateTime?: string;
  // Protection-related properties
  onPremisesSyncEnabled?: boolean;
  isAssignableToRole?: boolean;
  // Additional metadata
  mail?: string;
  visibility?: string;
  resourceProvisioningOptions?: string[];
}

export interface GroupProtectionStatus {
  isProtected: boolean;
  reasons: string[];
}

/**
 * Make an authenticated request to Microsoft Graph API
 */
async function graphRequest<T>(
  config: AuthConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getGraphToken(config);

  const response = await apiFetch(`${GRAPH_API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    body: options.body as string | undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
    const errorCode = error.error?.code || '';
    const errorMessage = error.error?.message || `Graph API error: ${response.status}`;

    // Provide more helpful error messages for common scenarios
    if (response.status === 403) {
      if (errorCode === 'Authorization_RequestDenied') {
        throw new Error('Permission denied. The service principal may not have sufficient permissions to perform this action, or the resource may be protected.');
      }
      if (errorMessage.includes('on-premises')) {
        throw new Error('This group is synced from on-premises Active Directory and cannot be modified via Microsoft Graph.');
      }
      throw new Error(`Access denied (403): ${errorMessage || 'Insufficient permissions or protected resource'}`);
    }

    if (errorCode === 'Request_BadRequest') {
      if (errorMessage.includes('dynamic group')) {
        throw new Error('Cannot manually add members to a dynamic group. Members are determined by membership rules.');
      }
      if (errorMessage.includes('already exist')) {
        throw new Error('This member is already in the group.');
      }
    }

    throw new Error(errorCode ? `${errorCode}: ${errorMessage}` : errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

/**
 * List all security groups with pagination support
 */
export async function listGroups(
  config: AuthConfig,
  options: { fetchAll?: boolean; pageSize?: number } = {}
): Promise<Group[]> {
  const { fetchAll = true, pageSize = 100 } = options;

  interface Response {
    value: Group[];
    '@odata.nextLink'?: string;
  }

  const allGroups: Group[] = [];

  // Filter for security groups only
  // Note: $orderby cannot be combined with $filter in Graph API for groups, so we sort client-side
  const filter = 'securityEnabled eq true';
  let url = `/groups?$filter=${encodeURIComponent(filter)}&$top=${pageSize}`;

  // Fetch first page
  let data = await graphRequest<Response>(config, url);
  allGroups.push(...data.value);

  // Fetch remaining pages if fetchAll is true
  if (fetchAll) {
    while (data['@odata.nextLink']) {
      // The nextLink is a full URL, so we need to extract the path
      const nextUrl = data['@odata.nextLink'].replace(GRAPH_API_BASE, '');
      data = await graphRequest<Response>(config, nextUrl);
      allGroups.push(...data.value);
    }
  }

  // Sort by displayName client-side
  return allGroups.sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '')
  );
}

export type GroupSearchMode = 'startswith' | 'contains' | 'exact';

/**
 * Search groups by display name with different search modes
 */
export async function searchGroups(
  config: AuthConfig,
  query: string,
  searchMode: GroupSearchMode = 'startswith',
  top: number = 25
): Promise<Group[]> {
  interface Response {
    value: Group[];
  }

  // Escape single quotes in query for OData filter
  const escapedQuery = query.replace(/'/g, "''");

  if (searchMode === 'exact') {
    // Exact match using eq operator
    const filter = `displayName eq '${escapedQuery}'`;
    const data = await graphRequest<Response>(
      config,
      `/groups?$filter=${encodeURIComponent(filter)}&$top=${top}`
    );
    return data.value;
  }

  if (searchMode === 'contains') {
    // Use $search for contains functionality (requires ConsistencyLevel header)
    // $search uses KQL and searches within the displayName
    // Format: $search="displayName:value"
    const searchValue = `"displayName:${query}"`;
    const data = await graphRequest<Response>(
      config,
      `/groups?$search=${encodeURIComponent(searchValue)}&$top=${top}`,
      {
        headers: {
          ConsistencyLevel: 'eventual',
        },
      }
    );

    // Sort by displayName client-side
    return data.value.sort((a, b) =>
      (a.displayName || '').localeCompare(b.displayName || '')
    );
  }

  // Default: startswith
  const filter = `startswith(displayName,'${escapedQuery}')`;
  const data = await graphRequest<Response>(
    config,
    `/groups?$filter=${encodeURIComponent(filter)}&$top=${top}`
  );

  // Sort by displayName client-side
  return data.value.sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '')
  );
}

/**
 * Get group details by ID
 */
export async function getGroup(
  config: AuthConfig,
  groupId: string
): Promise<GroupDetails> {
  const group = await graphRequest<GroupDetails>(
    config,
    `/groups/${groupId}?$select=id,displayName,description,groupTypes,mailEnabled,mailNickname,securityEnabled,createdDateTime,onPremisesSyncEnabled,isAssignableToRole,membershipRule,membershipRuleProcessingState,mail,visibility,resourceProvisioningOptions`
  );

  // Get member count
  interface CountResponse {
    '@odata.count': number;
  }

  let membersCount = 0;
  try {
    const membersCountData = await graphRequest<CountResponse>(
      config,
      `/groups/${groupId}/members/$count`,
      {
        headers: {
          ConsistencyLevel: 'eventual',
        },
      }
    );
    membersCount = membersCountData['@odata.count'] || 0;
  } catch {
    // Count may not be available, ignore
  }

  return {
    ...group,
    membersCount,
  };
}

/**
 * Analyze group protection status
 */
export function getGroupProtectionStatus(group: GroupDetails): GroupProtectionStatus {
  const reasons: string[] = [];

  if (group.onPremisesSyncEnabled) {
    reasons.push('Synced from on-premises AD - cannot be deleted via cloud');
  }

  if (group.isAssignableToRole) {
    reasons.push('Role-assignable group - requires privileged permissions to modify');
  }

  if (group.groupTypes?.includes('DynamicMembership')) {
    reasons.push('Dynamic membership group - members are determined by rules');
  }

  if (group.groupTypes?.includes('Unified')) {
    reasons.push('Microsoft 365 group - may have additional protections');
  }

  if (group.membershipRuleProcessingState === 'On') {
    reasons.push('Dynamic membership rule is active');
  }

  return {
    isProtected: reasons.length > 0,
    reasons,
  };
}

/**
 * Create a new security group
 */
export async function createGroup(
  config: AuthConfig,
  displayName: string,
  description?: string,
  mailNickname?: string
): Promise<Group> {
  const nickname = mailNickname || displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);

  return graphRequest<Group>(config, '/groups', {
    method: 'POST',
    body: JSON.stringify({
      displayName,
      description: description || '',
      mailNickname: nickname,
      mailEnabled: false,
      securityEnabled: true,
      groupTypes: [],
    }),
  });
}

/**
 * Update group properties
 */
export async function updateGroup(
  config: AuthConfig,
  groupId: string,
  updates: { displayName?: string; description?: string }
): Promise<void> {
  await graphRequest(config, `/groups/${groupId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a group
 */
export async function deleteGroup(
  config: AuthConfig,
  groupId: string
): Promise<void> {
  await graphRequest(config, `/groups/${groupId}`, {
    method: 'DELETE',
  });
}

/**
 * Get group members with pagination support
 */
export async function getGroupMembers(
  config: AuthConfig,
  groupId: string
): Promise<GroupMember[]> {
  interface MemberResponse {
    value: Array<{
      '@odata.type'?: string;
      id: string;
      displayName?: string;
      userPrincipalName?: string;
      mail?: string;
      appId?: string;
      servicePrincipalType?: string;
      securityEnabled?: boolean;
    }>;
    '@odata.nextLink'?: string;
  }

  // Fetch all pages from a given URL
  async function fetchAllPages(startUrl: string): Promise<MemberResponse['value']> {
    const items: MemberResponse['value'] = [];
    let data = await graphRequest<MemberResponse>(config, startUrl);
    items.push(...data.value);
    while (data['@odata.nextLink']) {
      const nextUrl = data['@odata.nextLink'].replace(GRAPH_API_BASE, '');
      data = await graphRequest<MemberResponse>(config, nextUrl);
      items.push(...data.value);
    }
    return items;
  }

  // Fetch all member types in parallel using type-cast endpoints
  // The generic /members endpoint may filter out types the SP lacks read permissions for,
  // but type-specific endpoints work with Application.ReadWrite.All and Group.ReadWrite.All
  const [users, servicePrincipals, groups] = await Promise.all([
    fetchAllPages(`/groups/${groupId}/members/microsoft.graph.user?$top=100`).catch(() => []),
    fetchAllPages(`/groups/${groupId}/members/microsoft.graph.servicePrincipal?$top=100`).catch(() => []),
    fetchAllPages(`/groups/${groupId}/members/microsoft.graph.group?$top=100`).catch(() => []),
  ]);

  const allMembers: GroupMember[] = [];

  for (const member of users) {
    allMembers.push({
      id: member.id,
      displayName: member.displayName || member.id,
      type: 'User',
      email: member.userPrincipalName || member.mail,
    });
  }

  for (const member of servicePrincipals) {
    allMembers.push({
      id: member.id,
      displayName: member.displayName || member.id,
      type: 'ServicePrincipal',
      appId: member.appId,
    });
  }

  for (const member of groups) {
    allMembers.push({
      id: member.id,
      displayName: member.displayName || member.id,
      type: 'Group',
    });
  }

  return allMembers;
}

/**
 * Add a member to a group
 */
export async function addGroupMember(
  config: AuthConfig,
  groupId: string,
  memberId: string
): Promise<void> {
  await graphRequest(config, `/groups/${groupId}/members/$ref`, {
    method: 'POST',
    body: JSON.stringify({
      '@odata.id': `${GRAPH_API_BASE}/directoryObjects/${memberId}`,
    }),
  });
}

/**
 * Add multiple members to a group
 */
export async function addGroupMembers(
  config: AuthConfig,
  groupId: string,
  memberIds: string[]
): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
  const success: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  // Graph API supports batch adding up to 20 members
  // For simplicity, we'll add one at a time
  for (const memberId of memberIds) {
    try {
      await addGroupMember(config, groupId, memberId);
      success.push(memberId);
    } catch (error) {
      failed.push({
        id: memberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { success, failed };
}

/**
 * Remove a member from a group
 */
export async function removeGroupMember(
  config: AuthConfig,
  groupId: string,
  memberId: string
): Promise<void> {
  await graphRequest(config, `/groups/${groupId}/members/${memberId}/$ref`, {
    method: 'DELETE',
  });
}

/**
 * Remove multiple members from a group
 */
export async function removeGroupMembers(
  config: AuthConfig,
  groupId: string,
  memberIds: string[]
): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
  const success: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const memberId of memberIds) {
    try {
      await removeGroupMember(config, groupId, memberId);
      success.push(memberId);
    } catch (error) {
      failed.push({
        id: memberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { success, failed };
}

/**
 * Check if a principal is a member of a group
 */
export async function checkMembership(
  config: AuthConfig,
  groupId: string,
  memberId: string
): Promise<boolean> {
  try {
    const members = await getGroupMembers(config, groupId);
    return members.some((m) => m.id === memberId);
  } catch {
    return false;
  }
}

/**
 * Search for users to add as members
 */
export async function searchUsersForMembership(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<Array<{ id: string; displayName: string; email: string; type: 'User' }>> {
  interface Response {
    value: User[];
  }

  const filter = `startswith(displayName,'${query}') or startswith(userPrincipalName,'${query}')`;
  const data = await graphRequest<Response>(
    config,
    `/users?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,displayName,userPrincipalName`
  );

  return data.value.map((user) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.userPrincipalName,
    type: 'User' as const,
  }));
}

/**
 * Search for service principals to add as members
 */
export async function searchServicePrincipalsForMembership(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<Array<{ id: string; displayName: string; appId: string; type: 'ServicePrincipal' }>> {
  interface Response {
    value: ServicePrincipal[];
  }

  const filter = `startswith(displayName,'${query}')`;
  const data = await graphRequest<Response>(
    config,
    `/servicePrincipals?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,displayName,appId`
  );

  return data.value.map((sp) => ({
    id: sp.id,
    displayName: sp.displayName,
    appId: sp.appId,
    type: 'ServicePrincipal' as const,
  }));
}

/**
 * Search for groups to add as members (nested groups)
 */
export async function searchGroupsForMembership(
  config: AuthConfig,
  query: string,
  excludeGroupId?: string,
  top: number = 25
): Promise<Array<{ id: string; displayName: string; type: 'Group' }>> {
  interface Response {
    value: Group[];
  }

  const filter = `startswith(displayName,'${query}')`;
  const data = await graphRequest<Response>(
    config,
    `/groups?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,displayName`
  );

  // Filter out the current group to prevent circular membership
  return data.value
    .filter((group) => group.id !== excludeGroupId)
    .map((group) => ({
      id: group.id,
      displayName: group.displayName,
      type: 'Group' as const,
    }));
}
