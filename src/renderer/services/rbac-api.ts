/**
 * Azure RBAC API Service
 * Handles role-based access control operations
 */

import { getAzureToken } from './azure-auth';
import { batchResolvePrincipals } from './graph-api';

const AZURE_API_BASE = 'https://management.azure.com';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export interface RoleDefinition {
  id: string;
  name: string;
  properties: {
    roleName: string;
    description: string;
    type: string;
    permissions: Array<{
      actions: string[];
      notActions: string[];
      dataActions: string[];
      notDataActions: string[];
    }>;
    assignableScopes: string[];
  };
}

export interface RoleAssignment {
  id: string;
  name: string;
  type: string;
  properties: {
    scope: string;
    roleDefinitionId: string;
    principalId: string;
    principalType: 'User' | 'Group' | 'ServicePrincipal';
    createdOn?: string;
    updatedOn?: string;
    createdBy?: string;
    updatedBy?: string;
  };
}

export interface RoleAssignmentDisplay {
  id: string;
  name: string;
  principalId: string;
  principalType: 'User' | 'Group' | 'ServicePrincipal';
  principalName?: string;
  roleDefinitionId: string;
  roleName: string;
  scope: string;
  scopeDisplay: string;
  createdOn?: string;
}

export type ScopeType = 'subscription' | 'resourceGroup' | 'resource';

/**
 * Make an authenticated request to Azure RBAC API
 */
async function rbacRequest<T>(
  config: AuthConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAzureToken(config);

  const response = await fetch(`${AZURE_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `RBAC API error: ${response.status}`
    );
  }

  // Handle 204 No Content (for DELETE)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * List all role definitions at a scope
 */
export async function listRoleDefinitions(
  config: AuthConfig,
  scope: string
): Promise<RoleDefinition[]> {
  interface Response {
    value: RoleDefinition[];
  }

  const data = await rbacRequest<Response>(
    config,
    `${scope}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01`
  );

  // Sort by role name
  return data.value.sort((a, b) =>
    a.properties.roleName.localeCompare(b.properties.roleName)
  );
}

/**
 * Get common built-in roles (for quick selection)
 */
export function getCommonRoles(): Array<{ name: string; id: string }> {
  return [
    { name: 'Owner', id: '8e3af657-a8ff-443c-a75c-2fe8c4bcb635' },
    { name: 'Contributor', id: 'b24988ac-6180-42a0-ab88-20f7382dd24c' },
    { name: 'Reader', id: 'acdd72a7-3385-48ef-bd42-f606fba81ae7' },
    { name: 'User Access Administrator', id: '18d7d88d-d35e-4fb5-a5c3-7773c20a72d9' },
    { name: 'Storage Blob Data Contributor', id: 'ba92f5b4-2d11-453d-a403-e96b0029c9fe' },
    { name: 'Storage Blob Data Reader', id: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1' },
    { name: 'Key Vault Administrator', id: '00482a5a-887f-4fb3-b363-3b7fe8e74483' },
    { name: 'Key Vault Secrets User', id: '4633458b-17de-408a-b874-0445c86b69e6' },
    { name: 'Virtual Machine Contributor', id: '9980e02c-c2be-4d73-94e8-173b1dc7cf3c' },
    { name: 'Network Contributor', id: '4d97b98b-1d4f-4787-a291-c67834d212e7' },
  ];
}

/**
 * List role assignments at a scope
 */
export async function listRoleAssignments(
  config: AuthConfig,
  scope: string,
  filter?: string
): Promise<RoleAssignment[]> {
  interface Response {
    value: RoleAssignment[];
  }

  let path = `${scope}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`;
  if (filter) {
    path += `&$filter=${encodeURIComponent(filter)}`;
  }

  const data = await rbacRequest<Response>(config, path);
  return data.value;
}

/**
 * Get role assignments with display names resolved
 */
export async function getRoleAssignmentsWithDetails(
  config: AuthConfig,
  subscriptionId: string,
  scope?: string
): Promise<RoleAssignmentDisplay[]> {
  const targetScope = scope || `/subscriptions/${subscriptionId}`;

  // Get role assignments
  const assignments = await listRoleAssignments(config, targetScope);

  // Get role definitions to resolve names
  const roleDefinitions = await listRoleDefinitions(config, `/subscriptions/${subscriptionId}`);
  const roleMap = new Map(
    roleDefinitions.map((r) => [r.id, r.properties.roleName])
  );

  // Resolve principal names using batch resolve
  const principalsToResolve = assignments.map((ra) => ({
    id: ra.properties.principalId,
    type: ra.properties.principalType,
  }));

  const resolvedNames = await batchResolvePrincipals(config, principalsToResolve);

  // Transform to display format with resolved names
  return assignments.map((ra) => ({
    id: ra.id,
    name: ra.name,
    principalId: ra.properties.principalId,
    principalType: ra.properties.principalType,
    principalName: resolvedNames.get(ra.properties.principalId),
    roleDefinitionId: ra.properties.roleDefinitionId,
    roleName: roleMap.get(ra.properties.roleDefinitionId) || 'Unknown Role',
    scope: ra.properties.scope,
    scopeDisplay: formatScope(ra.properties.scope),
    createdOn: ra.properties.createdOn,
  }));
}

/**
 * Format scope for display
 */
function formatScope(scope: string): string {
  const parts = scope.split('/');

  // Subscription level
  if (parts.length === 3 && parts[1] === 'subscriptions') {
    return `Subscription`;
  }

  // Resource group level
  if (parts.length === 5 && parts[3] === 'resourceGroups') {
    return `RG: ${parts[4]}`;
  }

  // Resource level
  if (parts.length > 5) {
    const resourceName = parts[parts.length - 1];
    return `Resource: ${resourceName}`;
  }

  return scope;
}

/**
 * Create a role assignment
 */
export async function createRoleAssignment(
  config: AuthConfig,
  scope: string,
  roleDefinitionId: string,
  principalId: string,
  principalType: 'User' | 'Group' | 'ServicePrincipal'
): Promise<RoleAssignment> {
  const assignmentName = crypto.randomUUID();

  // Ensure roleDefinitionId is a full resource ID
  const fullRoleDefinitionId = roleDefinitionId.startsWith('/')
    ? roleDefinitionId
    : `${scope}/providers/Microsoft.Authorization/roleDefinitions/${roleDefinitionId}`;

  const result = await rbacRequest<RoleAssignment>(
    config,
    `${scope}/providers/Microsoft.Authorization/roleAssignments/${assignmentName}?api-version=2022-04-01`,
    {
      method: 'PUT',
      body: JSON.stringify({
        properties: {
          roleDefinitionId: fullRoleDefinitionId,
          principalId,
          principalType,
        },
      }),
    }
  );

  return result;
}

/**
 * Delete a role assignment
 */
export async function deleteRoleAssignment(
  config: AuthConfig,
  roleAssignmentId: string
): Promise<void> {
  await rbacRequest(
    config,
    `${roleAssignmentId}?api-version=2022-04-01`,
    { method: 'DELETE' }
  );
}

/**
 * Build a scope string from components
 */
export function buildScope(
  subscriptionId: string,
  resourceGroupName?: string,
  resourceId?: string
): string {
  if (resourceId) {
    return resourceId;
  }
  if (resourceGroupName) {
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`;
  }
  return `/subscriptions/${subscriptionId}`;
}

/**
 * Check if principal already has role at scope
 */
export async function checkExistingAssignment(
  config: AuthConfig,
  scope: string,
  principalId: string,
  roleDefinitionId: string
): Promise<boolean> {
  const filter = `principalId eq '${principalId}'`;
  const assignments = await listRoleAssignments(config, scope, filter);

  // Normalize role definition ID for comparison
  const normalizedRoleId = roleDefinitionId.includes('/')
    ? roleDefinitionId.split('/').pop()
    : roleDefinitionId;

  return assignments.some((a) => {
    const assignmentRoleId = a.properties.roleDefinitionId.split('/').pop();
    return assignmentRoleId === normalizedRoleId;
  });
}

/**
 * Resource interface for display
 */
export interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  resourceGroup: string;
}

/**
 * List resources in a subscription or resource group
 */
export async function listResources(
  config: AuthConfig,
  subscriptionId: string,
  resourceGroupName?: string
): Promise<AzureResource[]> {
  interface Response {
    value: Array<{
      id: string;
      name: string;
      type: string;
      location: string;
    }>;
    nextLink?: string;
  }

  const allResources: AzureResource[] = [];
  let url = resourceGroupName
    ? `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/resources?api-version=2021-04-01`
    : `/subscriptions/${subscriptionId}/resources?api-version=2021-04-01`;

  while (url) {
    const data = await rbacRequest<Response>(config, url);

    for (const resource of data.value) {
      // Extract resource group from ID
      const rgMatch = resource.id.match(/resourceGroups\/([^/]+)/i);
      const rg = rgMatch ? rgMatch[1] : '';

      allResources.push({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        location: resource.location,
        resourceGroup: rg,
      });
    }

    url = data.nextLink ? data.nextLink.replace(AZURE_API_BASE, '') : '';
  }

  return allResources.sort((a, b) => a.name.localeCompare(b.name));
}
