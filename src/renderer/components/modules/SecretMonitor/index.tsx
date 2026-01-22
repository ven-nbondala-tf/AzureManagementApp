import { useState, useRef } from 'react';
import {
  useSecretMonitor,
  useFilteredResults,
  getReportStatus,
  getStatusColors,
  getStatusLabel,
  type FilterOptions,
  type CredentialReport,
  type CredentialStatus,
} from '../../../hooks';
import { ServicePrincipalPicker } from './ServicePrincipalPicker';
import { FavoritesPanel, type FavoriteItem } from './FavoritesPanel';
import { StarIcon } from '@heroicons/react/24/outline';

interface SelectedSP {
  id: string;
  appId: string;
  displayName: string;
  type: 'Application' | 'ServicePrincipal';
}

export function SecretMonitor() {
  const {
    isScanning,
    progress,
    result,
    error,
    scan,
    scanFromYaml,
    exportToCsv,
    clearResults,
  } = useSecretMonitor();

  const [filters, setFilters] = useState<FilterOptions>({
    showExpired: true,
    showCritical: true,
    showWarning: true,
    showHealthy: true,
    searchQuery: '',
  });

  const [scanOptions, setScanOptions] = useState({
    includeApplications: true,
    includeServicePrincipals: true,
    criticalDays: 30,
    warningDays: 90,
  });

  const [showOptions, setShowOptions] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CredentialReport | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isFavoritesPanelOpen, setIsFavoritesPanelOpen] = useState(false);
  const [selectedSPs, setSelectedSPs] = useState<SelectedSP[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredReports = useFilteredResults(result, filters);

  const handleScan = () => {
    scan(scanOptions);
  };

  const handleScanSelected = () => {
    if (selectedSPs.length === 0) return;

    // Convert selected SPs to YAML format for scanning
    const yamlContent = `service_principals:
${selectedSPs.map((sp) => `  - name: "${sp.displayName}"
    appId: "${sp.appId}"`).join('\n')}`;

    scanFromYaml(yamlContent, scanOptions);
  };

  const handleYamlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    scanFromYaml(content, scanOptions);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectSPs = (items: SelectedSP[]) => {
    setSelectedSPs(items);
  };

  const removeSelectedSP = (appId: string) => {
    setSelectedSPs((prev) => prev.filter((sp) => sp.appId !== appId));
  };

  const handleLoadFavorite = (items: FavoriteItem[]) => {
    setSelectedSPs(items);
    setIsFavoritesPanelOpen(false);
  };

  const handleScanFavorite = (items: FavoriteItem[]) => {
    setSelectedSPs(items);
    setIsFavoritesPanelOpen(false);
    // Trigger scan after a short delay to allow state update
    setTimeout(() => {
      const yamlContent = `service_principals:
${items.map((sp) => `  - name: "${sp.displayName}"
    appId: "${sp.appId}"`).join('\n')}`;
      scanFromYaml(yamlContent, scanOptions);
    }, 100);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Secret Monitor
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Scan for expiring credentials across applications and service principals
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isScanning ? 'Scanning...' : 'Scan All'}
          </button>

          <button
            onClick={() => setIsPickerOpen(true)}
            disabled={isScanning}
            className="px-4 py-2 border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
          >
            Select Service Principals
          </button>

          {selectedSPs.length > 0 && (
            <button
              onClick={handleScanSelected}
              disabled={isScanning}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Scan Selected ({selectedSPs.length})
            </button>
          )}

          <label className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            YAML File
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml"
              onChange={handleYamlUpload}
              disabled={isScanning}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setIsFavoritesPanelOpen(true)}
            className="px-4 py-2 border border-yellow-500 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-50 dark:hover:bg-yellow-900/20 flex items-center gap-2"
          >
            <StarIcon className="w-4 h-4" />
            Favorites
          </button>

          <button
            onClick={() => setShowOptions(!showOptions)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Options
          </button>

          {result && (
            <>
              <button
                onClick={exportToCsv}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Export CSV
              </button>
              <button
                onClick={clearResults}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Selected SPs Display */}
        {selectedSPs.length > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Selected for Scan ({selectedSPs.length})
              </span>
              <button
                onClick={() => setSelectedSPs([])}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedSPs.slice(0, 8).map((sp) => (
                <span
                  key={sp.appId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 rounded text-sm border border-blue-200 dark:border-blue-700"
                >
                  <span className="truncate max-w-[150px]">{sp.displayName}</span>
                  <button
                    onClick={() => removeSelectedSP(sp.appId)}
                    className="hover:text-blue-900 dark:hover:text-blue-100"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {selectedSPs.length > 8 && (
                <span className="px-2 py-1 text-sm text-blue-600 dark:text-blue-400">
                  +{selectedSPs.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scan Options */}
        {showOptions && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Scan Options
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scanOptions.includeApplications}
                  onChange={(e) =>
                    setScanOptions({ ...scanOptions, includeApplications: e.target.checked })
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Applications</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scanOptions.includeServicePrincipals}
                  onChange={(e) =>
                    setScanOptions({ ...scanOptions, includeServicePrincipals: e.target.checked })
                  }
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Service Principals</span>
              </label>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Critical (days)
                </label>
                <input
                  type="number"
                  value={scanOptions.criticalDays}
                  onChange={(e) =>
                    setScanOptions({ ...scanOptions, criticalDays: parseInt(e.target.value) || 30 })
                  }
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                  Warning (days)
                </label>
                <input
                  type="number"
                  value={scanOptions.warningDays}
                  onChange={(e) =>
                    setScanOptions({ ...scanOptions, warningDays: parseInt(e.target.value) || 90 })
                  }
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {isScanning && progress && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Scanning {progress.phase}...
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 truncate">
              {progress.currentName}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <SummaryCard label="Total Scanned" value={result.totalScanned} color="gray" />
            <SummaryCard
              label="Expired"
              value={result.withExpired}
              color="red"
              active={filters.showExpired}
              onClick={() => setFilters({ ...filters, showExpired: !filters.showExpired })}
            />
            <SummaryCard
              label="Critical"
              value={result.withCritical}
              color="orange"
              active={filters.showCritical}
              onClick={() => setFilters({ ...filters, showCritical: !filters.showCritical })}
            />
            <SummaryCard
              label="Warning"
              value={result.withWarning}
              color="yellow"
              active={filters.showWarning}
              onClick={() => setFilters({ ...filters, showWarning: !filters.showWarning })}
            />
            <SummaryCard
              label="Healthy"
              value={result.healthy}
              color="green"
              active={filters.showHealthy}
              onClick={() => setFilters({ ...filters, showHealthy: !filters.showHealthy })}
            />
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or app ID..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Results List */}
          <div className="flex-1 flex gap-6 min-h-0">
            <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Results ({filteredReports.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredReports.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No results match the current filters
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredReports.map((report) => (
                      <ReportListItem
                        key={report.id}
                        report={report}
                        isSelected={selectedReport?.id === report.id}
                        onClick={() => setSelectedReport(report)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Details Panel */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {selectedReport ? (
                <ReportDetails report={selectedReport} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  Select an item to view credential details
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isScanning && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Scan Results
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
              Click "Scan All" to check all applications and service principals, or select specific
              items using the "Select Service Principals" button.
            </p>
            {selectedSPs.length > 0 && (
              <button
                onClick={handleScanSelected}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Scan {selectedSPs.length} Selected Item{selectedSPs.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Service Principal Picker Modal */}
      <ServicePrincipalPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleSelectSPs}
        initialSelection={selectedSPs}
      />

      {/* Favorites Panel */}
      <FavoritesPanel
        isOpen={isFavoritesPanelOpen}
        onClose={() => setIsFavoritesPanelOpen(false)}
        currentSelection={selectedSPs}
        onLoadFavorite={handleLoadFavorite}
        onScanFavorite={handleScanFavorite}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  color: 'gray' | 'red' | 'orange' | 'yellow' | 'green';
  active?: boolean;
  onClick?: () => void;
}

function SummaryCard({ label, value, color, active = true, onClick }: SummaryCardProps) {
  const colorClasses = {
    gray: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    red: active
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50',
    orange: active
      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50',
    yellow: active
      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50',
    green: active
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50',
  };

  const textClasses = {
    gray: 'text-gray-900 dark:text-white',
    red: active ? 'text-red-700 dark:text-red-400' : 'text-gray-400',
    orange: active ? 'text-orange-700 dark:text-orange-400' : 'text-gray-400',
    yellow: active ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-400',
    green: active ? 'text-green-700 dark:text-green-400' : 'text-gray-400',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border ${colorClasses[color]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`text-2xl font-bold ${textClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

interface ReportListItemProps {
  report: CredentialReport;
  isSelected: boolean;
  onClick: () => void;
}

function ReportListItem({ report, isSelected, onClick }: ReportListItemProps) {
  const status = getReportStatus(report);
  const colors = getStatusColors(status);

  return (
    <li
      onClick={onClick}
      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-white truncate">
            {report.displayName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-mono">{report.appId}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {report.objectType} • {report.credentials.length} credential(s)
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
          {getStatusLabel(status)}
        </span>
      </div>
    </li>
  );
}

interface ReportDetailsProps {
  report: CredentialReport;
}

function ReportDetails({ report }: ReportDetailsProps) {
  const status = getReportStatus(report);
  const colors = getStatusColors(status);

  return (
    <>
      <div className={`p-4 border-b ${colors.border} ${colors.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {report.displayName}
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              {report.appId}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {report.objectType}
              {report.objectType === 'ServicePrincipal' && 'servicePrincipalType' in report && (
                <span> • {report.servicePrincipalType}</span>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text} ${colors.border} border`}>
            {getStatusLabel(status)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Credentials ({report.credentials.length})
        </h3>
        <div className="space-y-3">
          {report.credentials.map((cred) => (
            <CredentialCard key={cred.id} credential={cred} />
          ))}
        </div>
      </div>
    </>
  );
}

interface CredentialCardProps {
  credential: {
    id: string;
    type: 'secret' | 'certificate';
    displayName: string;
    startDateTime: string;
    endDateTime: string;
    daysUntilExpiration: number;
    status: CredentialStatus;
  };
}

function CredentialCard({ credential }: CredentialCardProps) {
  const colors = getStatusColors(credential.status);

  return (
    <div className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${colors.text}`}>
              {credential.displayName}
            </span>
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
              {credential.type}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(credential.startDateTime).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Expires:</span>{' '}
              {new Date(credential.endDateTime).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${colors.text}`}>
            {credential.daysUntilExpiration < 0
              ? `${Math.abs(credential.daysUntilExpiration)}d ago`
              : `${credential.daysUntilExpiration}d`}
          </div>
          <div className={`text-xs ${colors.text}`}>
            {getStatusLabel(credential.status)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecretMonitor;
