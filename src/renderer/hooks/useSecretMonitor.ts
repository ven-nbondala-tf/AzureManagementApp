import { useState, useCallback } from 'react';
import { useAuthStore } from '../store';
import {
  scanCredentials,
  parseYamlSpList,
  generateCsvReport,
  downloadCsv,
  type ScanResult,
  type ScanOptions,
  type CredentialReport,
  type CredentialStatus,
} from '../services/monitor-api';

export type { ScanResult, ScanOptions, CredentialReport, CredentialStatus };

export interface ScanProgress {
  phase: string;
  current: number;
  total: number;
  currentName: string;
}

export interface FilterOptions {
  showExpired: boolean;
  showCritical: boolean;
  showWarning: boolean;
  showHealthy: boolean;
  searchQuery: string;
}

/**
 * Hook for scanning and monitoring credential expiration
 */
export function useSecretMonitor() {
  const { config } = useAuthStore();
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(
    async (options: ScanOptions = {}) => {
      if (!config) {
        setError('Not authenticated');
        return;
      }

      setIsScanning(true);
      setError(null);
      setProgress(null);

      try {
        const scanResult = await scanCredentials(
          config,
          options,
          (phase, current, total, name) => {
            setProgress({ phase, current, total, currentName: name });
          }
        );
        setResult(scanResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scan failed');
        setResult(null);
      } finally {
        setIsScanning(false);
        setProgress(null);
      }
    },
    [config]
  );

  const scanFromYaml = useCallback(
    async (yamlContent: string, baseOptions: Omit<ScanOptions, 'appIds' | 'displayNames'> = {}) => {
      const { appIds, displayNames } = parseYamlSpList(yamlContent);

      if (appIds.length === 0 && displayNames.length === 0) {
        setError('No valid entries found in YAML file');
        return;
      }

      await scan({
        ...baseOptions,
        appIds: appIds.length > 0 ? appIds : undefined,
        displayNames: displayNames.length > 0 ? displayNames : undefined,
      });
    },
    [scan]
  );

  const exportToCsv = useCallback(() => {
    if (!result) return;

    const csvContent = generateCsvReport(result);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCsv(csvContent, `credential-report-${timestamp}.csv`);
  }, [result]);

  const clearResults = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isScanning,
    progress,
    result,
    error,
    scan,
    scanFromYaml,
    exportToCsv,
    clearResults,
  };
}

/**
 * Hook for filtering scan results
 */
export function useFilteredResults(
  result: ScanResult | null,
  filters: FilterOptions
): CredentialReport[] {
  if (!result) return [];

  return result.reports.filter((report) => {
    // Status filter
    if (report.hasExpired && !filters.showExpired) return false;
    if (report.hasCritical && !report.hasExpired && !filters.showCritical) return false;
    if (report.hasWarning && !report.hasCritical && !report.hasExpired && !filters.showWarning) return false;
    if (!report.hasExpired && !report.hasCritical && !report.hasWarning && !filters.showHealthy) return false;

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesName = report.displayName.toLowerCase().includes(query);
      const matchesAppId = report.appId.toLowerCase().includes(query);
      if (!matchesName && !matchesAppId) return false;
    }

    return true;
  });
}

/**
 * Get the worst status for a report
 */
export function getReportStatus(report: CredentialReport): CredentialStatus {
  if (report.hasExpired) return 'expired';
  if (report.hasCritical) return 'critical';
  if (report.hasWarning) return 'warning';
  return 'ok';
}

/**
 * Get status color classes
 */
export function getStatusColors(status: CredentialStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'expired':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
      };
    case 'critical':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        text: 'text-orange-700 dark:text-orange-400',
        border: 'border-orange-200 dark:border-orange-800',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        text: 'text-yellow-700 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
      };
    default:
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800',
      };
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: CredentialStatus): string {
  switch (status) {
    case 'expired':
      return 'Expired';
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    default:
      return 'Healthy';
  }
}
