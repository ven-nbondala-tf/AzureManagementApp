/**
 * Azure Cost Management API Service
 * Handles cost queries and analysis
 */

import { getAzureToken } from './azure-auth';
import { apiFetch } from './api-fetch';

const AZURE_API_BASE = 'https://management.azure.com';

interface AuthConfig {
  clientId: string;
  tenantId: string;
  clientSecret: string;
}

export interface CostQueryResult {
  id: string;
  name: string;
  type: string;
  location: string | null;
  sku: string | null;
  properties: {
    nextLink: string | null;
    columns: Array<{ name: string; type: string }>;
    rows: Array<Array<string | number>>;
  };
}

export interface CostItem {
  name: string;
  cost: number;
  currency: string;
  resourceGroup?: string;
  resourceType?: string;
  resourceId?: string;
  serviceName?: string;
  date?: string;
}

export interface CostSummary {
  totalCost: number;
  currency: string;
  items: CostItem[];
  dateRange: {
    from: string;
    to: string;
  };
}

export type CostGrouping =
  | 'ResourceGroup'
  | 'ServiceName'
  | 'ServiceFamily'
  | 'ResourceType'
  | 'ResourceId'
  | 'MeterCategory'
  | 'MeterSubCategory'
  | 'ChargeType'
  | 'PublisherType'
  | 'None';
export type CostGranularity = 'None' | 'Daily' | 'Monthly';

/**
 * Make an authenticated request to Azure Cost Management API
 */
async function costRequest<T>(
  config: AuthConfig,
  path: string,
  body: object
): Promise<T> {
  const token = await getAzureToken(config);

  const response = await apiFetch(`${AZURE_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(
      error.error?.message || `Cost API error: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Query costs for a subscription
 */
export async function queryCosts(
  config: AuthConfig,
  subscriptionId: string,
  fromDate: string,
  toDate: string,
  groupBy: CostGrouping = 'ResourceGroup',
  granularity: CostGranularity = 'None'
): Promise<CostSummary> {
  const grouping = groupBy !== 'None' ? [
    {
      type: 'Dimension',
      name: groupBy,
    },
  ] : [];

  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: {
      from: fromDate,
      to: toDate,
    },
    dataset: {
      granularity,
      aggregation: {
        totalCost: {
          name: 'Cost',
          function: 'Sum',
        },
      },
      grouping,
    },
  };

  const result = await costRequest<CostQueryResult>(
    config,
    `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`,
    body
  );

  return parseCostQueryResult(result, fromDate, toDate, groupBy, granularity);
}

/**
 * Query costs for a resource group
 */
export async function queryResourceGroupCosts(
  config: AuthConfig,
  subscriptionId: string,
  resourceGroupName: string,
  fromDate: string,
  toDate: string,
  groupBy: CostGrouping = 'ServiceName'
): Promise<CostSummary> {
  const grouping = groupBy !== 'None' ? [
    {
      type: 'Dimension',
      name: groupBy,
    },
  ] : [];

  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: {
      from: fromDate,
      to: toDate,
    },
    dataset: {
      granularity: 'None',
      aggregation: {
        totalCost: {
          name: 'Cost',
          function: 'Sum',
        },
      },
      grouping,
    },
  };

  const scope = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`;
  const result = await costRequest<CostQueryResult>(
    config,
    `${scope}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`,
    body
  );

  return parseCostQueryResult(result, fromDate, toDate, groupBy, 'None');
}

export interface TrendDataPoint {
  date: string;
  cost: number;
  currency: string;
}

export interface GroupedTrendDataPoint {
  date: string;
  [key: string]: number | string; // Dynamic keys for each group + total
}

export interface GroupedTrendResult {
  data: GroupedTrendDataPoint[];
  groups: string[];
  currency: string;
}

/**
 * Query daily cost trend for a subscription (ungrouped - total only)
 */
export async function queryCostTrend(
  config: AuthConfig,
  subscriptionId: string,
  fromDate: string,
  toDate: string
): Promise<TrendDataPoint[]> {
  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: {
      from: fromDate,
      to: toDate,
    },
    dataset: {
      granularity: 'Daily',
      aggregation: {
        totalCost: {
          name: 'Cost',
          function: 'Sum',
        },
      },
      grouping: [],
    },
  };

  const result = await costRequest<CostQueryResult>(
    config,
    `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`,
    body
  );

  const columns = result.properties.columns;
  const costIndex = columns.findIndex((c) => c.name === 'Cost');
  const dateIndex = columns.findIndex((c) => c.name === 'UsageDate');
  const currencyIndex = columns.findIndex((c) => c.name === 'Currency');

  return result.properties.rows.map((row) => ({
    date: formatUsageDate(row[dateIndex] as number),
    cost: row[costIndex] as number,
    currency: (row[currencyIndex] as string) || 'USD',
  })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Query daily cost trend grouped by a dimension
 * Returns data formatted for multi-series charts
 */
export async function queryCostTrendGrouped(
  config: AuthConfig,
  subscriptionId: string,
  fromDate: string,
  toDate: string,
  groupBy: CostGrouping,
  topN: number = 5
): Promise<GroupedTrendResult> {
  if (groupBy === 'None') {
    // Fall back to ungrouped query
    const ungrouped = await queryCostTrend(config, subscriptionId, fromDate, toDate);
    return {
      data: ungrouped.map((d) => ({ date: d.date, Total: d.cost })),
      groups: ['Total'],
      currency: ungrouped[0]?.currency || 'USD',
    };
  }

  const body = {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: {
      from: fromDate,
      to: toDate,
    },
    dataset: {
      granularity: 'Daily',
      aggregation: {
        totalCost: {
          name: 'Cost',
          function: 'Sum',
        },
      },
      grouping: [
        {
          type: 'Dimension',
          name: groupBy,
        },
      ],
    },
  };

  const result = await costRequest<CostQueryResult>(
    config,
    `/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-11-01`,
    body
  );

  const columns = result.properties.columns;
  const costIndex = columns.findIndex((c) => c.name === 'Cost');
  const dateIndex = columns.findIndex((c) => c.name === 'UsageDate');
  const groupIndex = columns.findIndex((c) => c.name === groupBy);
  const currencyIndex = columns.findIndex((c) => c.name === 'Currency');

  // First, aggregate total cost per group to find top N
  const groupTotals = new Map<string, number>();
  for (const row of result.properties.rows) {
    const groupName = (row[groupIndex] as string) || 'Unknown';
    const cost = row[costIndex] as number;
    groupTotals.set(groupName, (groupTotals.get(groupName) || 0) + cost);
  }

  // Sort and get top N groups
  const sortedGroups = Array.from(groupTotals.entries())
    .sort((a, b) => b[1] - a[1]);
  const topGroups = new Set(sortedGroups.slice(0, topN).map(([name]) => name));

  // Aggregate data by date, with top N groups + Others
  const dateMap = new Map<string, { [key: string]: number }>();
  let currency = 'USD';

  for (const row of result.properties.rows) {
    const date = formatUsageDate(row[dateIndex] as number);
    const groupName = (row[groupIndex] as string) || 'Unknown';
    const cost = row[costIndex] as number;
    currency = (row[currencyIndex] as string) || 'USD';

    if (!dateMap.has(date)) {
      dateMap.set(date, {});
    }

    const dateData = dateMap.get(date)!;
    const effectiveGroup = topGroups.has(groupName) ? groupName : 'Others';
    dateData[effectiveGroup] = (dateData[effectiveGroup] || 0) + cost;
  }

  // Convert to array format for Recharts
  const groups = [...topGroups];
  if (sortedGroups.length > topN) {
    groups.push('Others');
  }

  const data: GroupedTrendDataPoint[] = Array.from(dateMap.entries())
    .map(([date, values]) => ({
      date,
      ...Object.fromEntries(groups.map((g) => [g, values[g] || 0])),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { data, groups, currency };
}

/**
 * Parse cost query result into a structured format
 */
function parseCostQueryResult(
  result: CostQueryResult,
  fromDate: string,
  toDate: string,
  groupBy: CostGrouping,
  granularity: CostGranularity
): CostSummary {
  const columns = result.properties.columns;
  const rows = result.properties.rows;

  // Find column indices
  const costIndex = columns.findIndex((c) => c.name === 'Cost');
  const currencyIndex = columns.findIndex((c) => c.name === 'Currency');
  const groupIndex = groupBy !== 'None'
    ? columns.findIndex((c) => c.name === groupBy)
    : -1;
  const dateIndex = granularity !== 'None'
    ? columns.findIndex((c) => c.name === 'UsageDate')
    : -1;

  let totalCost = 0;
  let currency = 'USD';

  const items: CostItem[] = rows.map((row) => {
    const cost = row[costIndex] as number;
    const curr = (row[currencyIndex] as string) || 'USD';
    const name = groupIndex >= 0 ? (row[groupIndex] as string) || 'Unknown' : 'Total';
    const date = dateIndex >= 0 ? formatUsageDate(row[dateIndex] as number) : undefined;

    totalCost += cost;
    currency = curr;

    const item: CostItem = {
      name,
      cost,
      currency: curr,
    };

    if (date) {
      item.date = date;
    }

    // Add specific properties based on grouping
    if (groupBy === 'ResourceGroup') {
      item.resourceGroup = name;
    } else if (groupBy === 'ServiceName') {
      item.serviceName = name;
    } else if (groupBy === 'ResourceType') {
      item.resourceType = name;
    } else if (groupBy === 'ResourceId') {
      item.resourceId = name;
    }

    return item;
  });

  // Sort by cost descending
  items.sort((a, b) => b.cost - a.cost);

  return {
    totalCost,
    currency,
    items,
    dateRange: {
      from: fromDate,
      to: toDate,
    },
  };
}

/**
 * Format usage date from YYYYMMDD number to YYYY-MM-DD string
 */
function formatUsageDate(date: number): string {
  const dateStr = date.toString();
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * Export cost data to CSV format
 */
export function exportCostsToCSV(summary: CostSummary, groupBy: CostGrouping): string {
  const groupLabels: Record<CostGrouping, string> = {
    ResourceGroup: 'Resource Group',
    ServiceName: 'Service Name',
    ServiceFamily: 'Service Family',
    ResourceType: 'Resource Type',
    ResourceId: 'Resource ID',
    MeterCategory: 'Meter Category',
    MeterSubCategory: 'Meter Subcategory',
    ChargeType: 'Charge Type',
    PublisherType: 'Publisher Type',
    None: 'Name',
  };

  const headers = [groupLabels[groupBy] || 'Name', 'Cost', 'Currency'];

  const rows = summary.items.map((item) => [
    `"${item.name}"`,
    item.cost.toFixed(2),
    item.currency,
  ]);

  // Add total row
  rows.push(['Total', summary.totalCost.toFixed(2), summary.currency]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export trend data to CSV format
 */
export function exportTrendToCSV(
  trend: Array<{ date: string; cost: number; currency: string }>
): string {
  const headers = ['Date', 'Cost', 'Currency'];
  const rows = trend.map((item) => [
    item.date,
    item.cost.toFixed(2),
    item.currency,
  ]);

  const total = trend.reduce((sum, item) => sum + item.cost, 0);
  rows.push(['Total', total.toFixed(2), trend[0]?.currency || 'USD']);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
