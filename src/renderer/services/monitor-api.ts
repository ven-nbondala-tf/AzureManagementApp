/**
 * Secret Monitor API Service
 * Scans service principals and applications for expiring credentials
 */

import { getGraphToken } from './azure-auth';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export type CredentialStatus = 'expired' | 'critical' | 'warning' | 'ok';

export interface CredentialInfo {
  id: string;
  type: 'secret' | 'certificate';
  displayName: string;
  startDateTime: string;
  endDateTime: string;
  daysUntilExpiration: number;
  status: CredentialStatus;
}

export interface ApplicationCredentialReport {
  id: string;
  appId: string;
  displayName: string;
  objectType: 'Application';
  credentials: CredentialInfo[];
  hasExpired: boolean;
  hasCritical: boolean;
  hasWarning: boolean;
}

export interface ServicePrincipalCredentialReport {
  id: string;
  appId: string;
  displayName: string;
  objectType: 'ServicePrincipal';
  servicePrincipalType: string;
  credentials: CredentialInfo[];
  hasExpired: boolean;
  hasCritical: boolean;
  hasWarning: boolean;
}

export type CredentialReport = ApplicationCredentialReport | ServicePrincipalCredentialReport;

export interface ScanResult {
  scannedAt: string;
  totalScanned: number;
  withExpired: number;
  withCritical: number;
  withWarning: number;
  healthy: number;
  reports: CredentialReport[];
}

export interface ScanOptions {
  includeApplications?: boolean;
  includeServicePrincipals?: boolean;
  criticalDays?: number; // Days threshold for critical status
  warningDays?: number; // Days threshold for warning status
  appIds?: string[]; // Filter to specific app IDs (from YAML)
  displayNames?: string[]; // Filter to specific display names
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

  const response = await fetch(`${GRAPH_API_BASE}${path}`, {
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
      error.error?.message || `Graph API error: ${response.status}`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Calculate credential status based on expiration
 */
function getCredentialStatus(
  endDateTime: string,
  criticalDays: number,
  warningDays: number
): { status: CredentialStatus; daysUntilExpiration: number } {
  const end = new Date(endDateTime);
  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  let status: CredentialStatus;
  if (daysUntilExpiration < 0) {
    status = 'expired';
  } else if (daysUntilExpiration <= criticalDays) {
    status = 'critical';
  } else if (daysUntilExpiration <= warningDays) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  return { status, daysUntilExpiration };
}

/**
 * Process credentials into report format
 */
function processCredentials(
  passwordCredentials: Array<{
    keyId: string;
    displayName?: string;
    startDateTime: string;
    endDateTime: string;
  }>,
  keyCredentials: Array<{
    keyId: string;
    displayName?: string;
    startDateTime: string;
    endDateTime: string;
    type: string;
  }>,
  criticalDays: number,
  warningDays: number
): CredentialInfo[] {
  const credentials: CredentialInfo[] = [];

  // Process password credentials (secrets)
  for (const cred of passwordCredentials) {
    const { status, daysUntilExpiration } = getCredentialStatus(
      cred.endDateTime,
      criticalDays,
      warningDays
    );
    credentials.push({
      id: cred.keyId,
      type: 'secret',
      displayName: cred.displayName || 'Unnamed Secret',
      startDateTime: cred.startDateTime,
      endDateTime: cred.endDateTime,
      daysUntilExpiration,
      status,
    });
  }

  // Process key credentials (certificates)
  for (const cred of keyCredentials) {
    const { status, daysUntilExpiration } = getCredentialStatus(
      cred.endDateTime,
      criticalDays,
      warningDays
    );
    credentials.push({
      id: cred.keyId,
      type: 'certificate',
      displayName: cred.displayName || 'Unnamed Certificate',
      startDateTime: cred.startDateTime,
      endDateTime: cred.endDateTime,
      daysUntilExpiration,
      status,
    });
  }

  return credentials;
}

/**
 * Scan all applications for expiring credentials
 */
async function scanApplications(
  config: AuthConfig,
  options: ScanOptions,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<ApplicationCredentialReport[]> {
  const { criticalDays = 30, warningDays = 90, appIds, displayNames } = options;

  interface AppResponse {
    value: Array<{
      id: string;
      appId: string;
      displayName: string;
      passwordCredentials: Array<{
        keyId: string;
        displayName?: string;
        startDateTime: string;
        endDateTime: string;
      }>;
      keyCredentials: Array<{
        keyId: string;
        displayName?: string;
        startDateTime: string;
        endDateTime: string;
        type: string;
      }>;
    }>;
    '@odata.nextLink'?: string;
  }

  const reports: ApplicationCredentialReport[] = [];
  let url = '/applications?$select=id,appId,displayName,passwordCredentials,keyCredentials&$top=100';
  let allApps: AppResponse['value'] = [];

  // Fetch all applications (handling pagination)
  while (url) {
    const data = await graphRequest<AppResponse>(config, url);
    allApps = allApps.concat(data.value);
    url = data['@odata.nextLink']?.replace(GRAPH_API_BASE, '') || '';
  }

  // Filter if specific apps requested
  let filteredApps = allApps;
  if (appIds && appIds.length > 0) {
    filteredApps = allApps.filter((app) => appIds.includes(app.appId));
  }
  if (displayNames && displayNames.length > 0) {
    const lowerNames = displayNames.map((n) => n.toLowerCase());
    filteredApps = filteredApps.filter((app) =>
      lowerNames.some((n) => app.displayName.toLowerCase().includes(n))
    );
  }

  // Process each application
  for (let i = 0; i < filteredApps.length; i++) {
    const app = filteredApps[i];
    onProgress?.(i + 1, filteredApps.length, app.displayName);

    const credentials = processCredentials(
      app.passwordCredentials || [],
      app.keyCredentials || [],
      criticalDays,
      warningDays
    );

    // Only include apps with credentials
    if (credentials.length > 0) {
      reports.push({
        id: app.id,
        appId: app.appId,
        displayName: app.displayName,
        objectType: 'Application',
        credentials,
        hasExpired: credentials.some((c) => c.status === 'expired'),
        hasCritical: credentials.some((c) => c.status === 'critical'),
        hasWarning: credentials.some((c) => c.status === 'warning'),
      });
    }
  }

  return reports;
}

/**
 * Scan all service principals for expiring credentials
 */
async function scanServicePrincipals(
  config: AuthConfig,
  options: ScanOptions,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<ServicePrincipalCredentialReport[]> {
  const { criticalDays = 30, warningDays = 90, appIds, displayNames } = options;

  interface SpResponse {
    value: Array<{
      id: string;
      appId: string;
      displayName: string;
      servicePrincipalType: string;
      passwordCredentials: Array<{
        keyId: string;
        displayName?: string;
        startDateTime: string;
        endDateTime: string;
      }>;
      keyCredentials: Array<{
        keyId: string;
        displayName?: string;
        startDateTime: string;
        endDateTime: string;
        type: string;
      }>;
    }>;
    '@odata.nextLink'?: string;
  }

  const reports: ServicePrincipalCredentialReport[] = [];
  let url = '/servicePrincipals?$select=id,appId,displayName,servicePrincipalType,passwordCredentials,keyCredentials&$top=100';
  let allSps: SpResponse['value'] = [];

  // Fetch all service principals (handling pagination)
  while (url) {
    const data = await graphRequest<SpResponse>(config, url);
    allSps = allSps.concat(data.value);
    url = data['@odata.nextLink']?.replace(GRAPH_API_BASE, '') || '';
  }

  // Filter if specific apps requested
  let filteredSps = allSps;
  if (appIds && appIds.length > 0) {
    filteredSps = allSps.filter((sp) => appIds.includes(sp.appId));
  }
  if (displayNames && displayNames.length > 0) {
    const lowerNames = displayNames.map((n) => n.toLowerCase());
    filteredSps = filteredSps.filter((sp) =>
      lowerNames.some((n) => sp.displayName.toLowerCase().includes(n))
    );
  }

  // Process each service principal
  for (let i = 0; i < filteredSps.length; i++) {
    const sp = filteredSps[i];
    onProgress?.(i + 1, filteredSps.length, sp.displayName);

    const credentials = processCredentials(
      sp.passwordCredentials || [],
      sp.keyCredentials || [],
      criticalDays,
      warningDays
    );

    // Only include SPs with credentials
    if (credentials.length > 0) {
      reports.push({
        id: sp.id,
        appId: sp.appId,
        displayName: sp.displayName,
        objectType: 'ServicePrincipal',
        servicePrincipalType: sp.servicePrincipalType,
        credentials,
        hasExpired: credentials.some((c) => c.status === 'expired'),
        hasCritical: credentials.some((c) => c.status === 'critical'),
        hasWarning: credentials.some((c) => c.status === 'warning'),
      });
    }
  }

  return reports;
}

/**
 * Run a full credential scan
 */
export async function scanCredentials(
  config: AuthConfig,
  options: ScanOptions = {},
  onProgress?: (phase: string, current: number, total: number, name: string) => void
): Promise<ScanResult> {
  const {
    includeApplications = true,
    includeServicePrincipals = true,
  } = options;

  const reports: CredentialReport[] = [];

  // Scan applications
  if (includeApplications) {
    const appReports = await scanApplications(
      config,
      options,
      (current, total, name) => onProgress?.('Applications', current, total, name)
    );
    reports.push(...appReports);
  }

  // Scan service principals
  if (includeServicePrincipals) {
    const spReports = await scanServicePrincipals(
      config,
      options,
      (current, total, name) => onProgress?.('Service Principals', current, total, name)
    );
    reports.push(...spReports);
  }

  // Calculate summary
  const withExpired = reports.filter((r) => r.hasExpired).length;
  const withCritical = reports.filter((r) => r.hasCritical && !r.hasExpired).length;
  const withWarning = reports.filter((r) => r.hasWarning && !r.hasCritical && !r.hasExpired).length;
  const healthy = reports.length - withExpired - withCritical - withWarning;

  return {
    scannedAt: new Date().toISOString(),
    totalScanned: reports.length,
    withExpired,
    withCritical,
    withWarning,
    healthy,
    reports,
  };
}

/**
 * Parse YAML content for SP list
 * Supports simple format:
 * service_principals:
 *   - name: "App Name"
 *     appId: "xxx-xxx"
 *   - name: "Another App"
 */
export function parseYamlSpList(yamlContent: string): {
  appIds: string[];
  displayNames: string[];
} {
  const appIds: string[] = [];
  const displayNames: string[] = [];

  // Simple YAML parsing for the expected format
  const lines = yamlContent.split('\n');
  let currentName = '';
  let currentAppId = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for name field
    const nameMatch = trimmed.match(/^-?\s*name:\s*["']?([^"']+)["']?$/);
    if (nameMatch) {
      if (currentName) displayNames.push(currentName);
      if (currentAppId) appIds.push(currentAppId);
      currentName = nameMatch[1].trim();
      currentAppId = '';
      continue;
    }

    // Check for appId field
    const appIdMatch = trimmed.match(/^appId:\s*["']?([^"']+)["']?$/);
    if (appIdMatch) {
      currentAppId = appIdMatch[1].trim();
      continue;
    }

    // Check for simple list item (just name)
    const simpleMatch = trimmed.match(/^-\s+["']?([^"':]+)["']?$/);
    if (simpleMatch) {
      if (currentName) displayNames.push(currentName);
      if (currentAppId) appIds.push(currentAppId);
      currentName = simpleMatch[1].trim();
      currentAppId = '';
    }
  }

  // Don't forget the last entry
  if (currentName) displayNames.push(currentName);
  if (currentAppId) appIds.push(currentAppId);

  return { appIds, displayNames };
}

/**
 * Generate CSV content from scan results
 */
export function generateCsvReport(result: ScanResult): string {
  const headers = [
    'Object Type',
    'Display Name',
    'App ID',
    'Credential Type',
    'Credential Name',
    'Start Date',
    'End Date',
    'Days Until Expiration',
    'Status',
  ];

  const rows: string[][] = [];

  for (const report of result.reports) {
    for (const cred of report.credentials) {
      rows.push([
        report.objectType,
        report.displayName,
        report.appId,
        cred.type,
        cred.displayName,
        new Date(cred.startDateTime).toLocaleDateString(),
        new Date(cred.endDateTime).toLocaleDateString(),
        cred.daysUntilExpiration.toString(),
        cred.status.toUpperCase(),
      ]);
    }
  }

  // Sort by status priority (expired first, then critical, warning, ok)
  const statusOrder: Record<string, number> = { EXPIRED: 0, CRITICAL: 1, WARNING: 2, OK: 3 };
  rows.sort((a, b) => statusOrder[a[8]] - statusOrder[b[8]]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
