/**
 * Azure Management API Service
 * Handles calls to Azure Resource Manager APIs
 */

import { getAzureToken } from './azure-auth';
import type { Subscription, ResourceGroup } from '../types';

const AZURE_API_BASE = 'https://management.azure.com';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

/**
 * Make an authenticated request to Azure Management API
 */
async function azureRequest<T>(
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
      error.error?.message || `Azure API error: ${response.status}`
    );
  }

  return response.json();
}

/**
 * List all subscriptions accessible by the service principal
 */
export async function listSubscriptions(
  config: AuthConfig
): Promise<Subscription[]> {
  interface SubscriptionResponse {
    value: Array<{
      id: string;
      subscriptionId: string;
      displayName: string;
      state: string;
      tenantId: string;
    }>;
  }

  const data = await azureRequest<SubscriptionResponse>(
    config,
    '/subscriptions?api-version=2022-12-01'
  );

  return data.value.map((sub) => ({
    id: sub.id,
    subscriptionId: sub.subscriptionId,
    displayName: sub.displayName,
    state: sub.state as Subscription['state'],
    tenantId: sub.tenantId,
  }));
}

/**
 * List resource groups in a subscription
 */
export async function listResourceGroups(
  config: AuthConfig,
  subscriptionId: string
): Promise<ResourceGroup[]> {
  interface ResourceGroupResponse {
    value: Array<{
      id: string;
      name: string;
      location: string;
      tags?: Record<string, string>;
    }>;
  }

  const data = await azureRequest<ResourceGroupResponse>(
    config,
    `/subscriptions/${subscriptionId}/resourcegroups?api-version=2022-09-01`
  );

  return data.value.map((rg) => ({
    id: rg.id,
    name: rg.name,
    location: rg.location,
    tags: rg.tags,
  }));
}

/**
 * Get role definitions for a scope
 */
export async function listRoleDefinitions(
  config: AuthConfig,
  scope: string
): Promise<Array<{ id: string; name: string; roleName: string; description: string }>> {
  interface RoleDefinitionResponse {
    value: Array<{
      id: string;
      name: string;
      properties: {
        roleName: string;
        description: string;
      };
    }>;
  }

  const data = await azureRequest<RoleDefinitionResponse>(
    config,
    `${scope}/providers/Microsoft.Authorization/roleDefinitions?api-version=2022-04-01`
  );

  return data.value.map((role) => ({
    id: role.id,
    name: role.name,
    roleName: role.properties.roleName,
    description: role.properties.description,
  }));
}

/**
 * List role assignments for a scope
 */
export async function listRoleAssignments(
  config: AuthConfig,
  scope: string
): Promise<Array<{
  id: string;
  name: string;
  principalId: string;
  principalType: string;
  roleDefinitionId: string;
  scope: string;
}>> {
  interface RoleAssignmentResponse {
    value: Array<{
      id: string;
      name: string;
      properties: {
        principalId: string;
        principalType: string;
        roleDefinitionId: string;
        scope: string;
      };
    }>;
  }

  const data = await azureRequest<RoleAssignmentResponse>(
    config,
    `${scope}/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01`
  );

  return data.value.map((ra) => ({
    id: ra.id,
    name: ra.name,
    principalId: ra.properties.principalId,
    principalType: ra.properties.principalType,
    roleDefinitionId: ra.properties.roleDefinitionId,
    scope: ra.properties.scope,
  }));
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
): Promise<void> {
  const assignmentId = crypto.randomUUID();

  await azureRequest(
    config,
    `${scope}/providers/Microsoft.Authorization/roleAssignments/${assignmentId}?api-version=2022-04-01`,
    {
      method: 'PUT',
      body: JSON.stringify({
        properties: {
          roleDefinitionId,
          principalId,
          principalType,
        },
      }),
    }
  );
}

/**
 * Delete a role assignment
 */
export async function deleteRoleAssignment(
  config: AuthConfig,
  roleAssignmentId: string
): Promise<void> {
  await azureRequest(
    config,
    `${roleAssignmentId}?api-version=2022-04-01`,
    { method: 'DELETE' }
  );
}
