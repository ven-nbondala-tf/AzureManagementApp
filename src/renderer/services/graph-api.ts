/**
 * Microsoft Graph API Service
 * Handles calls to Microsoft Graph for users, groups, and service principals
 */

import { getGraphToken } from './azure-auth';
import { apiFetch } from './api-fetch';
import type { User, Group, ServicePrincipal, Application } from '../types';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
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
    const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(
      error.error?.message || `Graph API error: ${response.status}`
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ============ User Operations ============

/**
 * Search users by display name or UPN
 */
export async function searchUsers(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<User[]> {
  interface UserResponse {
    value: Array<{
      id: string;
      displayName: string;
      userPrincipalName: string;
      mail?: string;
      jobTitle?: string;
    }>;
  }

  const filter = `startswith(displayName,'${query}') or startswith(userPrincipalName,'${query}')`;
  const data = await graphRequest<UserResponse>(
    config,
    `/users?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,displayName,userPrincipalName,mail,jobTitle`
  );

  return data.value;
}

/**
 * Get a user by ID
 */
export async function getUser(config: AuthConfig, userId: string): Promise<User> {
  return graphRequest<User>(
    config,
    `/users/${userId}?$select=id,displayName,userPrincipalName,mail,jobTitle`
  );
}

// ============ Group Operations ============

/**
 * Search groups by display name
 */
export async function searchGroups(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<Group[]> {
  interface GroupResponse {
    value: Group[];
  }

  const filter = `startswith(displayName,'${query}')`;
  const data = await graphRequest<GroupResponse>(
    config,
    `/groups?$filter=${encodeURIComponent(filter)}&$top=${top}`
  );

  return data.value;
}

/**
 * Get a group by ID
 */
export async function getGroup(config: AuthConfig, groupId: string): Promise<Group> {
  return graphRequest<Group>(config, `/groups/${groupId}`);
}

/**
 * Create a new security group
 */
export async function createSecurityGroup(
  config: AuthConfig,
  displayName: string,
  description?: string,
  mailNickname?: string
): Promise<Group> {
  return graphRequest<Group>(config, '/groups', {
    method: 'POST',
    body: JSON.stringify({
      displayName,
      description,
      mailNickname: mailNickname || displayName.replace(/[^a-zA-Z0-9]/g, ''),
      mailEnabled: false,
      securityEnabled: true,
      groupTypes: [],
    }),
  });
}

/**
 * Delete a group
 */
export async function deleteGroup(config: AuthConfig, groupId: string): Promise<void> {
  await graphRequest(config, `/groups/${groupId}`, { method: 'DELETE' });
}

/**
 * Get group members
 */
export async function getGroupMembers(
  config: AuthConfig,
  groupId: string
): Promise<Array<User | ServicePrincipal>> {
  interface MemberResponse {
    value: Array<{
      '@odata.type': string;
      id: string;
      displayName: string;
      userPrincipalName?: string;
      appId?: string;
    }>;
  }

  const data = await graphRequest<MemberResponse>(
    config,
    `/groups/${groupId}/members?$select=id,displayName,userPrincipalName,appId`
  );

  return data.value.map((member) => {
    if (member['@odata.type'] === '#microsoft.graph.user') {
      return {
        id: member.id,
        displayName: member.displayName,
        userPrincipalName: member.userPrincipalName || '',
      } as User;
    }
    return {
      id: member.id,
      displayName: member.displayName,
      appId: member.appId || '',
      servicePrincipalType: 'Application',
    } as ServicePrincipal;
  });
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

// ============ Service Principal Operations ============

/**
 * Search service principals by display name
 */
export async function searchServicePrincipals(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<ServicePrincipal[]> {
  interface SPResponse {
    value: ServicePrincipal[];
  }

  const filter = `startswith(displayName,'${query}')`;
  const data = await graphRequest<SPResponse>(
    config,
    `/servicePrincipals?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,appId,displayName,servicePrincipalType`
  );

  return data.value;
}

/**
 * Get a service principal by ID
 */
export async function getServicePrincipal(
  config: AuthConfig,
  spId: string
): Promise<ServicePrincipal> {
  return graphRequest<ServicePrincipal>(
    config,
    `/servicePrincipals/${spId}?$select=id,appId,displayName,servicePrincipalType`
  );
}

// ============ Application Operations ============

/**
 * Search applications by display name
 */
export async function searchApplications(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<Application[]> {
  interface AppResponse {
    value: Application[];
  }

  const filter = `startswith(displayName,'${query}')`;
  const data = await graphRequest<AppResponse>(
    config,
    `/applications?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,appId,displayName`
  );

  return data.value;
}

/**
 * List all applications (app registrations)
 */
export async function listApplications(
  config: AuthConfig,
  top: number = 100
): Promise<Application[]> {
  interface AppResponse {
    value: Application[];
  }

  const data = await graphRequest<AppResponse>(
    config,
    `/applications?$top=${top}&$select=id,appId,displayName,signInAudience,passwordCredentials,keyCredentials`
  );

  return data.value;
}

/**
 * Get an application by ID
 */
export async function getApplication(
  config: AuthConfig,
  appId: string
): Promise<Application> {
  return graphRequest<Application>(
    config,
    `/applications/${appId}?$select=id,appId,displayName,signInAudience,passwordCredentials,keyCredentials`
  );
}

/**
 * Create a new application registration
 */
export async function createApplication(
  config: AuthConfig,
  displayName: string,
  signInAudience: string = 'AzureADMyOrg'
): Promise<Application> {
  return graphRequest<Application>(config, '/applications', {
    method: 'POST',
    body: JSON.stringify({
      displayName,
      signInAudience,
    }),
  });
}

/**
 * Add a client secret to an application
 */
export async function addApplicationSecret(
  config: AuthConfig,
  appId: string,
  displayName: string,
  endDateTime?: string
): Promise<{ secretText: string; keyId: string; endDateTime: string }> {
  // Default to 1 year from now
  const defaultEndDate = new Date();
  defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1);

  const result = await graphRequest<{
    secretText: string;
    keyId: string;
    endDateTime: string;
  }>(config, `/applications/${appId}/addPassword`, {
    method: 'POST',
    body: JSON.stringify({
      passwordCredential: {
        displayName,
        endDateTime: endDateTime || defaultEndDate.toISOString(),
      },
    }),
  });

  return result;
}

/**
 * Remove a client secret from an application
 */
export async function removeApplicationSecret(
  config: AuthConfig,
  appId: string,
  keyId: string
): Promise<void> {
  await graphRequest(config, `/applications/${appId}/removePassword`, {
    method: 'POST',
    body: JSON.stringify({ keyId }),
  });
}

/**
 * Create a service principal for an application
 */
export async function createServicePrincipal(
  config: AuthConfig,
  appId: string
): Promise<ServicePrincipal> {
  return graphRequest<ServicePrincipal>(config, '/servicePrincipals', {
    method: 'POST',
    body: JSON.stringify({ appId }),
  });
}

// ============ Principal Name Resolution ============

export interface ResolvedPrincipal {
  id: string;
  displayName: string;
  type: 'User' | 'Group' | 'ServicePrincipal';
}

interface PrincipalToResolve {
  id: string;
  type: 'User' | 'Group' | 'ServicePrincipal';
}

// Simple in-memory cache for resolved principals (1 hour TTL)
// Stores name or null for failed lookups to avoid repeated API calls
const principalCache = new Map<string, { name: string | null; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const NEGATIVE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for failed lookups

function getCachedPrincipal(id: string): { found: boolean; name: string | null } {
  const cached = principalCache.get(id);
  if (!cached) {
    return { found: false, name: null };
  }

  const ttl = cached.name ? CACHE_TTL : NEGATIVE_CACHE_TTL;
  if (Date.now() - cached.timestamp < ttl) {
    return { found: true, name: cached.name };
  }
  principalCache.delete(id);
  return { found: false, name: null };
}

function cachePrincipal(id: string, name: string | null): void {
  principalCache.set(id, { name, timestamp: Date.now() });
}

/**
 * Resolve a single principal by ID and type
 * Falls back to /directoryObjects if type-specific endpoint fails
 */
async function resolveSinglePrincipal(
  config: AuthConfig,
  id: string,
  type: 'User' | 'Group' | 'ServicePrincipal'
): Promise<string | null> {
  // Try type-specific endpoint first
  try {
    switch (type) {
      case 'User': {
        const user = await graphRequest<{ displayName: string }>(
          config,
          `/users/${id}?$select=displayName`
        );
        return user.displayName;
      }
      case 'Group': {
        const group = await graphRequest<{ displayName: string }>(
          config,
          `/groups/${id}?$select=displayName`
        );
        return group.displayName;
      }
      case 'ServicePrincipal': {
        const sp = await graphRequest<{ displayName: string }>(
          config,
          `/servicePrincipals/${id}?$select=displayName`
        );
        return sp.displayName;
      }
      default:
        break;
    }
  } catch {
    // Type-specific endpoint failed, try directoryObjects as fallback
  }

  // Fallback: try /directoryObjects which can resolve any principal type
  try {
    const obj = await graphRequest<{ displayName?: string }>(
      config,
      `/directoryObjects/${id}?$select=displayName`
    );
    return obj.displayName || null;
  } catch {
    // Return null if we can't resolve (deleted principal, insufficient permissions, etc.)
    return null;
  }
}

/**
 * Batch resolve principal names from their IDs
 * Deduplicates input, caches results (including failures), and rate-limits requests
 */
export async function batchResolvePrincipals(
  config: AuthConfig,
  principals: PrincipalToResolve[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const toResolve: PrincipalToResolve[] = [];
  const seenIds = new Set<string>();

  // Deduplicate and check cache first
  for (const principal of principals) {
    // Skip duplicates in input
    if (seenIds.has(principal.id)) {
      continue;
    }
    seenIds.add(principal.id);

    const cached = getCachedPrincipal(principal.id);
    if (cached.found) {
      // Use cached value (may be null for previously failed lookups)
      if (cached.name) {
        results.set(principal.id, cached.name);
      }
    } else {
      toResolve.push(principal);
    }
  }

  // Resolve remaining principals in parallel (with rate limiting)
  const BATCH_SIZE = 10;
  for (let i = 0; i < toResolve.length; i += BATCH_SIZE) {
    const batch = toResolve.slice(i, i + BATCH_SIZE);
    const resolvedBatch = await Promise.all(
      batch.map(async (p) => {
        const name = await resolveSinglePrincipal(config, p.id, p.type);
        return { id: p.id, name };
      })
    );

    for (const { id, name } of resolvedBatch) {
      // Cache both successful and failed lookups
      cachePrincipal(id, name);
      if (name) {
        results.set(id, name);
      }
    }
  }

  return results;
}
