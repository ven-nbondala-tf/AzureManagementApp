/**
 * Service Principal & Application API Service
 * Handles app registrations, secrets, and federated credentials via Microsoft Graph
 */

import { getGraphToken } from './azure-auth';
import { apiFetch } from './api-fetch';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export interface Application {
  id: string;
  appId: string;
  displayName: string;
  description?: string;
  createdDateTime?: string;
  signInAudience?: string;
}

export interface ServicePrincipalDetails {
  id: string;
  appId: string;
  displayName: string;
  description?: string;
  createdDateTime?: string;
  servicePrincipalType?: string;
  appOwnerOrganizationId?: string;
}

export interface PasswordCredential {
  keyId: string;
  displayName?: string;
  hint?: string;
  startDateTime: string;
  endDateTime: string;
  secretText?: string; // Only returned when creating
}

export interface FederatedIdentityCredential {
  id: string;
  name: string;
  issuer: string;
  subject: string;
  description?: string;
  audiences: string[];
}

export interface ApplicationDetails extends Application {
  passwordCredentials: PasswordCredential[];
  federatedIdentityCredentials: FederatedIdentityCredential[];
  servicePrincipal?: ServicePrincipalDetails;
}

export interface CreateSecretResult {
  keyId: string;
  displayName: string;
  startDateTime: string;
  endDateTime: string;
  secretText: string;
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

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

/**
 * List all applications (app registrations)
 */
export async function listApplications(
  config: AuthConfig,
  top: number = 100
): Promise<Application[]> {
  interface Response {
    value: Application[];
  }

  // Note: $orderby is not supported for applications in Graph API, sort client-side
  const data = await graphRequest<Response>(
    config,
    `/applications?$top=${top}&$select=id,appId,displayName,description,createdDateTime,signInAudience`
  );

  // Sort by displayName client-side
  return data.value.sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '')
  );
}

/**
 * Search applications by display name
 */
export async function searchApplications(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<Application[]> {
  interface Response {
    value: Application[];
  }

  // Note: $orderby is not supported for applications in Graph API
  const filter = `startswith(displayName,'${query}')`;
  const data = await graphRequest<Response>(
    config,
    `/applications?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,appId,displayName,description,createdDateTime,signInAudience`
  );

  // Sort by displayName client-side
  return data.value.sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '')
  );
}

/**
 * Get application details including credentials
 */
export async function getApplication(
  config: AuthConfig,
  appObjectId: string
): Promise<ApplicationDetails> {
  // Get application with password credentials
  const app = await graphRequest<Application & { passwordCredentials: PasswordCredential[] }>(
    config,
    `/applications/${appObjectId}?$select=id,appId,displayName,description,createdDateTime,signInAudience,passwordCredentials`
  );

  // Get federated identity credentials
  interface FicResponse {
    value: FederatedIdentityCredential[];
  }

  let federatedCredentials: FederatedIdentityCredential[] = [];
  try {
    const ficData = await graphRequest<FicResponse>(
      config,
      `/applications/${appObjectId}/federatedIdentityCredentials`
    );
    federatedCredentials = ficData.value;
  } catch {
    // May not have permission or no credentials exist
  }

  // Get service principal for this app
  interface SpResponse {
    value: ServicePrincipalDetails[];
  }

  let servicePrincipal: ServicePrincipalDetails | undefined;
  try {
    const spData = await graphRequest<SpResponse>(
      config,
      `/servicePrincipals?$filter=appId eq '${app.appId}'&$select=id,appId,displayName,description,createdDateTime,servicePrincipalType,appOwnerOrganizationId`
    );
    servicePrincipal = spData.value[0];
  } catch {
    // Service principal may not exist
  }

  return {
    ...app,
    federatedIdentityCredentials: federatedCredentials,
    servicePrincipal,
  };
}

/**
 * Create a new application (app registration)
 */
export async function createApplication(
  config: AuthConfig,
  displayName: string,
  description?: string,
  signInAudience: string = 'AzureADMyOrg'
): Promise<Application> {
  return graphRequest<Application>(config, '/applications', {
    method: 'POST',
    body: JSON.stringify({
      displayName,
      description: description || '',
      signInAudience,
    }),
  });
}

/**
 * Create a service principal for an application
 */
export async function createServicePrincipal(
  config: AuthConfig,
  appId: string
): Promise<ServicePrincipalDetails> {
  return graphRequest<ServicePrincipalDetails>(config, '/servicePrincipals', {
    method: 'POST',
    body: JSON.stringify({
      appId,
    }),
  });
}

/**
 * Create an app registration with service principal in one operation
 */
export async function createAppRegistration(
  config: AuthConfig,
  displayName: string,
  description?: string,
  signInAudience: string = 'AzureADMyOrg'
): Promise<{ application: Application; servicePrincipal: ServicePrincipalDetails }> {
  // Create the application
  const application = await createApplication(config, displayName, description, signInAudience);

  // Create the service principal
  const servicePrincipal = await createServicePrincipal(config, application.appId);

  return { application, servicePrincipal };
}

/**
 * Delete an application
 */
export async function deleteApplication(
  config: AuthConfig,
  appObjectId: string
): Promise<void> {
  await graphRequest(config, `/applications/${appObjectId}`, {
    method: 'DELETE',
  });
}

/**
 * Add a password credential (client secret) to an application
 */
export async function addApplicationSecret(
  config: AuthConfig,
  appObjectId: string,
  displayName: string,
  expirationMonths: number = 12
): Promise<CreateSecretResult> {
  const endDateTime = new Date();
  endDateTime.setMonth(endDateTime.getMonth() + expirationMonths);

  const result = await graphRequest<PasswordCredential>(
    config,
    `/applications/${appObjectId}/addPassword`,
    {
      method: 'POST',
      body: JSON.stringify({
        passwordCredential: {
          displayName,
          endDateTime: endDateTime.toISOString(),
        },
      }),
    }
  );

  return {
    keyId: result.keyId,
    displayName: result.displayName || displayName,
    startDateTime: result.startDateTime,
    endDateTime: result.endDateTime,
    secretText: result.secretText || '',
  };
}

/**
 * Remove a password credential from an application
 */
export async function removeApplicationSecret(
  config: AuthConfig,
  appObjectId: string,
  keyId: string
): Promise<void> {
  await graphRequest(config, `/applications/${appObjectId}/removePassword`, {
    method: 'POST',
    body: JSON.stringify({
      keyId,
    }),
  });
}

/**
 * Add a federated identity credential (for GitHub OIDC, etc.)
 */
export async function addFederatedCredential(
  config: AuthConfig,
  appObjectId: string,
  name: string,
  issuer: string,
  subject: string,
  description?: string,
  audiences: string[] = ['api://AzureADTokenExchange']
): Promise<FederatedIdentityCredential> {
  return graphRequest<FederatedIdentityCredential>(
    config,
    `/applications/${appObjectId}/federatedIdentityCredentials`,
    {
      method: 'POST',
      body: JSON.stringify({
        name,
        issuer,
        subject,
        description: description || '',
        audiences,
      }),
    }
  );
}

/**
 * Remove a federated identity credential
 */
export async function removeFederatedCredential(
  config: AuthConfig,
  appObjectId: string,
  credentialId: string
): Promise<void> {
  await graphRequest(
    config,
    `/applications/${appObjectId}/federatedIdentityCredentials/${credentialId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * GitHub-specific helper to add federated credential for a repository
 */
export async function addGitHubFederatedCredential(
  config: AuthConfig,
  appObjectId: string,
  options: {
    organization: string;
    repository: string;
    entityType: 'branch' | 'tag' | 'environment' | 'pull_request';
    entityValue?: string; // Required for branch, tag, environment
    description?: string;
  }
): Promise<FederatedIdentityCredential> {
  const { organization, repository, entityType, entityValue, description } = options;

  let subject: string;
  let name: string;

  switch (entityType) {
    case 'branch':
      subject = `repo:${organization}/${repository}:ref:refs/heads/${entityValue}`;
      name = `github-${repository}-branch-${entityValue}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120);
      break;
    case 'tag':
      subject = `repo:${organization}/${repository}:ref:refs/tags/${entityValue}`;
      name = `github-${repository}-tag-${entityValue}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120);
      break;
    case 'environment':
      subject = `repo:${organization}/${repository}:environment:${entityValue}`;
      name = `github-${repository}-env-${entityValue}`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120);
      break;
    case 'pull_request':
      subject = `repo:${organization}/${repository}:pull_request`;
      name = `github-${repository}-pr`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 120);
      break;
  }

  return addFederatedCredential(
    config,
    appObjectId,
    name,
    'https://token.actions.githubusercontent.com',
    subject,
    description || `GitHub Actions: ${organization}/${repository} (${entityType}${entityValue ? `: ${entityValue}` : ''})`
  );
}

/**
 * List all service principals
 */
export async function listServicePrincipals(
  config: AuthConfig,
  top: number = 100
): Promise<ServicePrincipalDetails[]> {
  interface Response {
    value: ServicePrincipalDetails[];
  }

  // Note: $orderby is not supported for servicePrincipals in Graph API
  const data = await graphRequest<Response>(
    config,
    `/servicePrincipals?$top=${top}&$select=id,appId,displayName,description,createdDateTime,servicePrincipalType,appOwnerOrganizationId`
  );

  // Sort by displayName client-side
  return data.value.sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '')
  );
}

/**
 * Search service principals by display name
 */
export async function searchServicePrincipals(
  config: AuthConfig,
  query: string,
  top: number = 25
): Promise<ServicePrincipalDetails[]> {
  interface Response {
    value: ServicePrincipalDetails[];
  }

  // Note: $orderby is not supported for servicePrincipals in Graph API
  const filter = `startswith(displayName,'${query}')`;
  const data = await graphRequest<Response>(
    config,
    `/servicePrincipals?$filter=${encodeURIComponent(filter)}&$top=${top}&$select=id,appId,displayName,description,createdDateTime,servicePrincipalType,appOwnerOrganizationId`
  );

  // Sort by displayName client-side
  return data.value.sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || '')
  );
}
