import React, { useState, useMemo } from 'react';
import { Header } from '@/components/common';
import {
  useCostData,
  useCostTrend,
  useCostTrendGrouped,
  useCostComparison,
  useResourceGroupCostData,
  getDateRangeFromPreset,
  type DateRange,
  type DateRangePreset,
} from '@/hooks';
import { type CostGrouping } from '@/services/cost-api';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  EyeIcon,
  EyeSlashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'last90days', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3months', label: 'Last 3 Months' },
  { value: 'last6months', label: 'Last 6 Months' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
];

const CHART_TYPES = [
  { value: 'area', label: 'Area' },
  { value: 'line', label: 'Line' },
  { value: 'bar', label: 'Bar' },
] as const;

type ChartType = typeof CHART_TYPES[number]['value'];

// Trend grouping options - 'None' shows total only
const TREND_GROUPING_OPTIONS: { value: CostGrouping | 'None'; label: string }[] = [
  { value: 'None', label: 'Total Only' },
  { value: 'ResourceGroup', label: 'Resource Group' },
  { value: 'ServiceName', label: 'Service Name' },
  { value: 'ServiceFamily', label: 'Service Family' },
  { value: 'ResourceType', label: 'Resource Type' },
  { value: 'MeterCategory', label: 'Meter Category' },
  { value: 'ChargeType', label: 'Charge Type' },
  { value: 'PublisherType', label: 'Publisher Type' },
];

// Breakdown options for resource group drill-down
const BREAKDOWN_OPTIONS: { value: CostGrouping; label: string }[] = [
  { value: 'ServiceName', label: 'Service' },
  { value: 'ResourceType', label: 'Resource Type' },
  { value: 'ResourceId', label: 'Resource' },
  { value: 'MeterCategory', label: 'Meter Category' },
];

// Colors for multi-series charts
const TREND_COLORS = [
  '#0078d4', '#00bcf2', '#2d7d9a', '#00b294', '#4db08b',
  '#50e6ff', '#008272', '#5c2d91', '#a4262c', '#ca5010',
];

// Hierarchical breakdown rows component
function BreakdownRows({
  resourceGroupName,
  dateRange,
  breakdownTypes,
  formatCurrency,
  totalCost,
  level = 1,
}: {
  resourceGroupName: string;
  dateRange: DateRange;
  breakdownTypes: CostGrouping[];
  formatCurrency: (value: number, currency?: string) => string;
  totalCost: number;
  level?: number;
}) {
  const currentBreakdown = breakdownTypes[0];
  const remainingBreakdowns = breakdownTypes.slice(1);

  const { data, isLoading } = useResourceGroupCostData(
    resourceGroupName,
    dateRange,
    currentBreakdown
  );

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (name: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedItems(newExpanded);
  };

  const formatName = (name: string) => {
    if (currentBreakdown === 'ResourceId' && name.includes('/')) {
      return name.split('/').pop() || name;
    }
    return name;
  };

  const label = BREAKDOWN_OPTIONS.find(o => o.value === currentBreakdown)?.label || currentBreakdown;
  const indentClass = level === 1 ? 'pl-8' : level === 2 ? 'pl-14' : 'pl-20';
  const bgClass = level === 1 ? 'bg-gray-50/50 dark:bg-gray-800/30' : level === 2 ? 'bg-gray-50/30 dark:bg-gray-800/20' : 'bg-gray-50/20 dark:bg-gray-800/10';

  if (isLoading) {
    return (
      <tr className={bgClass}>
        <td colSpan={4} className={clsx('px-4 py-2', indentClass)}>
          <div className="flex items-center gap-2 text-gray-500">
            <ArrowPathIcon className="w-3 h-3 animate-spin" />
            <span className="text-xs">Loading {label}...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <tr className={bgClass}>
        <td colSpan={4} className={clsx('px-4 py-2 text-xs text-gray-400', indentClass)}>
          No {label.toLowerCase()} data
        </td>
      </tr>
    );
  }

  return (
    <>
      {data.items.slice(0, 10).map((item, idx) => {
        const pct = totalCost > 0 ? (item.cost / totalCost) * 100 : 0;
        const hasChildren = remainingBreakdowns.length > 0;
        const isExpanded = expandedItems.has(item.name);
        const displayName = formatName(item.name);

        return (
          <React.Fragment key={`${item.name}-${idx}`}>
            <tr
              className={clsx(
                bgClass,
                hasChildren && 'cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30'
              )}
              onClick={hasChildren ? () => toggleExpand(item.name) : undefined}
            >
              <td className={clsx('px-4 py-2 text-xs text-gray-600 dark:text-gray-400', indentClass)}>
                <div className="flex items-center gap-2">
                  {hasChildren && (
                    isExpanded ? (
                      <ChevronDownIcon className="w-3 h-3 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-3 h-3 text-gray-400" />
                    )
                  )}
                  {!hasChildren && <span className="w-3" />}
                  <span className="truncate" title={item.name}>{displayName}</span>
                  <span className="text-[10px] text-gray-400 uppercase">{label}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-xs text-right text-gray-600 dark:text-gray-400 font-mono">
                {formatCurrency(item.cost, item.currency)}
              </td>
              <td className="px-4 py-2 text-xs text-right text-gray-400">
                {pct.toFixed(1)}%
              </td>
              <td className="px-4 py-2">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                  <div
                    className="bg-azure-400 h-1.5 rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </td>
            </tr>
            {hasChildren && isExpanded && (
              <BreakdownRows
                resourceGroupName={resourceGroupName}
                dateRange={dateRange}
                breakdownTypes={remainingBreakdowns}
                formatCurrency={formatCurrency}
                totalCost={totalCost}
                level={level + 1}
              />
            )}
          </React.Fragment>
        );
      })}
      {data.items.length > 10 && (
        <tr className={bgClass}>
          <td colSpan={4} className={clsx('px-4 py-1 text-[10px] text-gray-400', indentClass)}>
            +{data.items.length - 10} more {label.toLowerCase()} items
          </td>
        </tr>
      )}
    </>
  );
}

// Expandable Row Component for Resource Group
function ExpandableResourceGroupRow({
  item,
  dateRange,
  formatCurrency,
  getPercentage,
  totalCost,
  breakdownTypes,
  isExpanded,
  onToggle,
}: {
  item: { name: string; cost: number; currency: string };
  dateRange: DateRange;
  formatCurrency: (value: number, currency?: string) => string;
  getPercentage: (cost: number) => number;
  totalCost: number;
  breakdownTypes: CostGrouping[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const percentage = getPercentage(item.cost);
  const hasBreakdowns = breakdownTypes.length > 0;

  return (
    <>
      <tr
        className={clsx(
          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
          hasBreakdowns && 'cursor-pointer'
        )}
        onClick={hasBreakdowns ? onToggle : undefined}
      >
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2">
            {hasBreakdowns ? (
              isExpanded ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium">{item.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100 font-mono">
          {formatCurrency(item.cost, item.currency)}
        </td>
        <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
          {percentage.toFixed(1)}%
        </td>
        <td className="px-4 py-3">
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className="bg-azure-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </td>
      </tr>
      {isExpanded && hasBreakdowns && (
        <BreakdownRows
          resourceGroupName={item.name}
          dateRange={dateRange}
          breakdownTypes={breakdownTypes}
          formatCurrency={formatCurrency}
          totalCost={totalCost}
        />
      )}
    </>
  );
}

export function CostManagement() {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('last30days');
  const [trendGroupBy, setTrendGroupBy] = useState<CostGrouping | 'None'>('None');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [showTooltip, setShowTooltip] = useState(true);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [selectedBreakdowns, setSelectedBreakdowns] = useState<CostGrouping[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const dateRange: DateRange = useMemo(() => ({
    ...getDateRangeFromPreset(datePreset),
    preset: datePreset,
  }), [datePreset]);

  // Always use ResourceGroup for the breakdown table
  const { data: costData, isLoading, error, refetch, exportToCSV } = useCostData(dateRange, 'ResourceGroup');
  const { data: trendData, isLoading: trendLoading } = useCostTrend(dateRange);
  const { data: groupedTrendData, isLoading: groupedTrendLoading } = useCostTrendGrouped(
    dateRange,
    trendGroupBy === 'None' ? 'None' : trendGroupBy,
    5
  );
  const { comparison, isLoading: comparisonLoading } = useCostComparison(dateRange, 'ResourceGroup');

  // Determine if we're using grouped or ungrouped trend data
  const isGroupedTrend = trendGroupBy !== 'None';
  const effectiveTrendLoading = isGroupedTrend ? groupedTrendLoading : trendLoading;

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!costData?.items) return [];
    if (!searchQuery) return costData.items;

    const query = searchQuery.toLowerCase();
    return costData.items.filter((item) =>
      item.name.toLowerCase().includes(query)
    );
  }, [costData?.items, searchQuery]);

  // Breakdown management
  const addBreakdown = (type: CostGrouping) => {
    if (!selectedBreakdowns.includes(type)) {
      setSelectedBreakdowns([...selectedBreakdowns, type]);
    }
  };

  const removeBreakdown = (type: CostGrouping) => {
    setSelectedBreakdowns(selectedBreakdowns.filter(t => t !== type));
  };

  const availableBreakdowns = BREAKDOWN_OPTIONS.filter(
    opt => !selectedBreakdowns.includes(opt.value)
  );

  const toggleGroup = (name: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(filteredItems.map(item => item.name)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Format currency
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate percentage of total
  const getPercentage = (cost: number) => {
    if (!costData?.totalCost || costData.totalCost === 0) return 0;
    return (cost / costData.totalCost) * 100;
  };

  // Render chart based on type - supports both simple and grouped data
  const renderChart = (height: string = 'h-64') => {
    const xAxisProps = {
      dataKey: 'date',
      tick: { fontSize: 11 },
      tickFormatter: (value: string) => {
        const date = new Date(value);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      },
    };

    const yAxisProps = {
      tick: { fontSize: 11 },
      tickFormatter: (value: number) => `$${value.toFixed(0)}`,
      width: 60,
    };

    const tooltipComponent = showTooltip ? (
      <Tooltip
        formatter={(value: number, name: string) => [formatCurrency(value), name] as [string, string]}
        labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
      />
    ) : null;

    // Render grouped multi-series chart
    if (isGroupedTrend && groupedTrendData) {
      const { data, groups } = groupedTrendData;
      const commonProps = { data };

      switch (chartType) {
        case 'line':
          return (
            <div className={height}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart {...commonProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis {...xAxisProps} />
                  <YAxis {...yAxisProps} />
                  {tooltipComponent}
                  {groups.map((group, index) => (
                    <Line
                      key={group}
                      type="monotone"
                      dataKey={group}
                      stroke={TREND_COLORS[index % TREND_COLORS.length]}
                      strokeWidth={2}
                      dot={{ fill: TREND_COLORS[index % TREND_COLORS.length], strokeWidth: 1, r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        case 'bar':
          return (
            <div className={height}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart {...commonProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis {...xAxisProps} />
                  <YAxis {...yAxisProps} />
                  {tooltipComponent}
                  {groups.map((group, index) => (
                    <Bar
                      key={group}
                      dataKey={group}
                      stackId="cost"
                      fill={TREND_COLORS[index % TREND_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        case 'area':
        default:
          return (
            <div className={height}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart {...commonProps}>
                  <defs>
                    {groups.map((group, index) => (
                      <linearGradient key={group} id={`color-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={TREND_COLORS[index % TREND_COLORS.length]} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={TREND_COLORS[index % TREND_COLORS.length]} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis {...xAxisProps} />
                  <YAxis {...yAxisProps} />
                  {tooltipComponent}
                  {groups.map((group, index) => (
                    <Area
                      key={group}
                      type="monotone"
                      dataKey={group}
                      stackId="cost"
                      stroke={TREND_COLORS[index % TREND_COLORS.length]}
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill={`url(#color-${index})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
      }
    }

    // Render simple single-series chart (ungrouped)
    const commonProps = { data: trendData };

    switch (chartType) {
      case 'line':
        return (
          <div className={height}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                {showTooltip && (
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Cost'] as [string, string]}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#0078d4"
                  strokeWidth={2}
                  dot={{ fill: '#0078d4', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      case 'bar':
        return (
          <div className={height}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                {showTooltip && (
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Cost'] as [string, string]}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                  />
                )}
                <Bar dataKey="cost" fill="#0078d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case 'area':
      default:
        return (
          <div className={height}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart {...commonProps}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0078d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0078d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis {...xAxisProps} />
                <YAxis {...yAxisProps} />
                {showTooltip && (
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Cost'] as [string, string]}
                    labelFormatter={(label: string) => new Date(label).toLocaleDateString()}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#0078d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
    }
  };

  // Render legend for grouped charts
  const renderLegend = () => {
    if (!isGroupedTrend || !groupedTrendData?.groups) return null;

    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {groupedTrendData.groups.map((group, index) => (
          <div key={group} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: TREND_COLORS[index % TREND_COLORS.length] }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-32" title={group}>
              {group}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Cost Management" />

      <main className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
                className="input-field py-1.5 pr-8"
              >
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="btn-secondary py-1.5 px-3"
            >
              <ArrowPathIcon className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
            </button>

            <button
              onClick={exportToCSV}
              disabled={!costData?.items.length}
              className="btn-secondary py-1.5 px-3 flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {isLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  formatCurrency(costData?.totalCost || 0, costData?.currency)
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {dateRange.from} to {dateRange.to}
              </p>
            </div>

            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Resource Groups</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {isLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  costData?.items.length || 0
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">with costs</p>
            </div>

            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily Average</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {isLoading || trendLoading ? (
                  <span className="text-gray-400">Loading...</span>
                ) : (
                  formatCurrency(
                    trendData.length > 0
                      ? trendData.reduce((sum, d) => sum + d.cost, 0) / trendData.length
                      : 0,
                    costData?.currency
                  )
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">per day</p>
            </div>

            {/* Period Comparison Card */}
            <div className="card p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">vs Previous Period</p>
              {comparisonLoading ? (
                <p className="text-2xl font-semibold text-gray-400 mt-1">Loading...</p>
              ) : comparison ? (
                <>
                  <div className="flex items-center gap-2 mt-1">
                    {comparison.delta >= 0 ? (
                      <ArrowTrendingUpIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-5 h-5 text-green-500" />
                    )}
                    <span className={clsx(
                      'text-2xl font-semibold',
                      comparison.delta >= 0 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {comparison.percentageChange >= 0 ? '+' : ''}{comparison.percentageChange.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatCurrency(Math.abs(comparison.delta), comparison.currency)} {comparison.delta >= 0 ? 'increase' : 'savings'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-1">No data</p>
              )}
            </div>
          </div>

          {/* Cost Trend Chart - Full Width */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Cost Trend
                {isGroupedTrend && (
                  <span className="text-xs text-gray-400 ml-2">(Top 5 + Others)</span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                {/* Trend Grouping Selector */}
                <select
                  value={trendGroupBy}
                  onChange={(e) => setTrendGroupBy(e.target.value as CostGrouping | 'None')}
                  className="input-field py-1 text-xs pr-6"
                >
                  {TREND_GROUPING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Chart Type Selector */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {CHART_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setChartType(type.value)}
                      className={clsx(
                        'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                        chartType === type.value
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* Tooltip Toggle */}
                <button
                  onClick={() => setShowTooltip(!showTooltip)}
                  className={clsx(
                    'p-1.5 rounded-md transition-colors',
                    showTooltip
                      ? 'bg-azure-100 dark:bg-azure-900/30 text-azure-600 dark:text-azure-400'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  )}
                  title={showTooltip ? 'Hide tooltip' : 'Show tooltip'}
                >
                  {showTooltip ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                </button>

                {/* Expand Chart */}
                <button
                  onClick={() => setIsChartExpanded(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
                  title="Expand chart"
                >
                  <ArrowsPointingOutIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {effectiveTrendLoading ? (
              <div className="h-64 flex items-center justify-center">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (isGroupedTrend ? groupedTrendData?.data?.length : trendData.length) ? (
              <>
                {renderChart('h-64')}
                {renderLegend()}
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No trend data available
              </div>
            )}
          </div>

          {/* Cost Breakdown Table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cost by Resource Group
                  </h3>
                  {/* Breakdown selector at table level */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedBreakdowns.map((type) => {
                      const label = BREAKDOWN_OPTIONS.find(o => o.value === type)?.label || type;
                      return (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300 rounded text-xs"
                        >
                          {label}
                          <button
                            onClick={() => removeBreakdown(type)}
                            className="hover:text-azure-900 dark:hover:text-azure-100"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    {availableBreakdowns.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            addBreakdown(e.target.value as CostGrouping);
                          }
                        }}
                        className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-gray-600 dark:text-gray-400"
                      >
                        <option value="">+ Add breakdown</option>
                        {availableBreakdowns.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedBreakdowns.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={expandAll}
                        className="text-xs text-azure-600 dark:text-azure-400 hover:underline"
                      >
                        Expand all
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <button
                        onClick={collapseAll}
                        className="text-xs text-azure-600 dark:text-azure-400 hover:underline"
                      >
                        Collapse all
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field py-1.5 w-48"
                  />
                </div>
              </div>
              {selectedBreakdowns.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Click a resource group to show breakdown by: {selectedBreakdowns.map(b => BREAKDOWN_OPTIONS.find(o => o.value === b)?.label).join(' → ')}
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Resource Group
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">
                      % of Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">
                      Distribution
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          <span>Loading costs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'No matching results' : 'No cost data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, index) => (
                      <ExpandableResourceGroupRow
                        key={`${item.name}-${index}`}
                        item={item}
                        dateRange={dateRange}
                        formatCurrency={formatCurrency}
                        getPercentage={getPercentage}
                        totalCost={costData?.totalCost || 0}
                        breakdownTypes={selectedBreakdowns}
                        isExpanded={expandedGroups.has(item.name)}
                        onToggle={() => toggleGroup(item.name)}
                      />
                    ))
                  )}
                </tbody>
                {filteredItems.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white font-mono">
                        {formatCurrency(costData?.totalCost || 0, costData?.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                        100%
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full bg-azure-500 rounded-full h-2" />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Expanded Chart Modal */}
      {isChartExpanded && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Cost Trend
                {isGroupedTrend && (
                  <span className="text-sm text-gray-400 ml-2">(Top 5 + Others)</span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                {/* Trend Grouping Selector */}
                <select
                  value={trendGroupBy}
                  onChange={(e) => setTrendGroupBy(e.target.value as CostGrouping | 'None')}
                  className="input-field py-1 text-sm pr-6"
                >
                  {TREND_GROUPING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* Chart Type Selector */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {CHART_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setChartType(type.value)}
                      className={clsx(
                        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                        chartType === type.value
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* Tooltip Toggle */}
                <button
                  onClick={() => setShowTooltip(!showTooltip)}
                  className={clsx(
                    'p-2 rounded-md transition-colors',
                    showTooltip
                      ? 'bg-azure-100 dark:bg-azure-900/30 text-azure-600 dark:text-azure-400'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  )}
                  title={showTooltip ? 'Hide tooltip' : 'Show tooltip'}
                >
                  {showTooltip ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>

                {/* Close */}
                <button
                  onClick={() => setIsChartExpanded(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {effectiveTrendLoading ? (
                <div className="h-[60vh] flex items-center justify-center">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (isGroupedTrend ? groupedTrendData?.data?.length : trendData.length) ? (
                <>
                  {renderChart('h-[60vh]')}
                  {renderLegend()}
                </>
              ) : (
                <div className="h-[60vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
                  No trend data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CostManagement;
