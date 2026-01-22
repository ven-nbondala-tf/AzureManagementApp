import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useSubscriptionStore } from '../store';
import {
  queryCosts,
  queryResourceGroupCosts,
  queryCostTrend,
  queryCostTrendGrouped,
  exportCostsToCSV,
  exportTrendToCSV,
  type CostSummary,
  type CostGrouping,
  type GroupedTrendResult,
} from '../services/cost-api';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, differenceInDays } from 'date-fns';

export type DateRangePreset = 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth' | 'last3months' | 'last6months' | 'thisYear' | 'lastYear' | 'custom';

export interface DateRange {
  from: string;
  to: string;
  preset: DateRangePreset;
}

/**
 * Get date range based on preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): { from: string; to: string } {
  const today = new Date();

  switch (preset) {
    case 'last7days':
      return {
        from: format(subDays(today, 7), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'last30days':
      return {
        from: format(subDays(today, 30), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'last90days':
      return {
        from: format(subDays(today, 90), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'thisMonth':
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return {
        from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    }
    case 'last3months':
      return {
        from: format(subMonths(today, 3), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'last6months':
      return {
        from: format(subMonths(today, 6), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'thisYear':
      return {
        from: format(startOfYear(today), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'lastYear': {
      const lastYear = subMonths(today, 12);
      return {
        from: format(startOfYear(lastYear), 'yyyy-MM-dd'),
        to: format(endOfMonth(subMonths(startOfYear(today), 1)), 'yyyy-MM-dd'),
      };
    }
    default:
      return {
        from: format(subDays(today, 30), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
  }
}

/**
 * Get previous period range for comparison
 */
export function getPreviousPeriodRange(currentRange: DateRange): { from: string; to: string } {
  const fromDate = new Date(currentRange.from);
  const toDate = new Date(currentRange.to);
  const days = differenceInDays(toDate, fromDate) + 1;

  const previousTo = subDays(fromDate, 1);
  const previousFrom = subDays(previousTo, days - 1);

  return {
    from: format(previousFrom, 'yyyy-MM-dd'),
    to: format(previousTo, 'yyyy-MM-dd'),
  };
}

/**
 * Hook for querying subscription costs
 */
export function useCostData(
  dateRange: DateRange,
  groupBy: CostGrouping = 'ResourceGroup'
) {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();

  const query = useQuery({
    queryKey: [
      'costs',
      selectedSubscription?.subscriptionId,
      dateRange.from,
      dateRange.to,
      groupBy,
    ],
    queryFn: async (): Promise<CostSummary> => {
      if (!config || !selectedSubscription) {
        throw new Error('Not authenticated or no subscription selected');
      }
      return queryCosts(
        config,
        selectedSubscription.subscriptionId,
        dateRange.from,
        dateRange.to,
        groupBy
      );
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const exportToCSV = () => {
    if (!query.data) return;

    const csv = exportCostsToCSV(query.data, groupBy);
    downloadCSV(csv, `costs-${dateRange.from}-to-${dateRange.to}.csv`);
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    exportToCSV,
  };
}

/**
 * Hook for querying resource group costs
 */
export function useResourceGroupCostData(
  resourceGroupName: string | null,
  dateRange: DateRange,
  groupBy: CostGrouping = 'ServiceName'
) {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();

  const query = useQuery({
    queryKey: [
      'resourceGroupCosts',
      selectedSubscription?.subscriptionId,
      resourceGroupName,
      dateRange.from,
      dateRange.to,
      groupBy,
    ],
    queryFn: async (): Promise<CostSummary> => {
      if (!config || !selectedSubscription || !resourceGroupName) {
        throw new Error('Missing required parameters');
      }
      return queryResourceGroupCosts(
        config,
        selectedSubscription.subscriptionId,
        resourceGroupName,
        dateRange.from,
        dateRange.to,
        groupBy
      );
    },
    enabled: !!config && !!selectedSubscription && !!resourceGroupName,
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

/**
 * Hook for querying cost trend data
 */
export function useCostTrend(dateRange: DateRange) {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();

  const query = useQuery({
    queryKey: [
      'costTrend',
      selectedSubscription?.subscriptionId,
      dateRange.from,
      dateRange.to,
    ],
    queryFn: async () => {
      if (!config || !selectedSubscription) {
        throw new Error('Not authenticated or no subscription selected');
      }
      return queryCostTrend(
        config,
        selectedSubscription.subscriptionId,
        dateRange.from,
        dateRange.to
      );
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5,
  });

  const exportToCSV = () => {
    if (!query.data) return;

    const csv = exportTrendToCSV(query.data);
    downloadCSV(csv, `cost-trend-${dateRange.from}-to-${dateRange.to}.csv`);
  };

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    exportToCSV,
  };
}

/**
 * Hook for querying grouped cost trend data (multi-series)
 */
export function useCostTrendGrouped(
  dateRange: DateRange,
  groupBy: CostGrouping = 'None',
  topN: number = 5
) {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();

  const query = useQuery({
    queryKey: [
      'costTrendGrouped',
      selectedSubscription?.subscriptionId,
      dateRange.from,
      dateRange.to,
      groupBy,
      topN,
    ],
    queryFn: async (): Promise<GroupedTrendResult> => {
      if (!config || !selectedSubscription) {
        throw new Error('Not authenticated or no subscription selected');
      }
      return queryCostTrendGrouped(
        config,
        selectedSubscription.subscriptionId,
        dateRange.from,
        dateRange.to,
        groupBy,
        topN
      );
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
  };
}

/**
 * Helper to download CSV file
 */
function downloadCSV(content: string, filename: string) {
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

export interface CostComparisonResult {
  currentTotal: number;
  previousTotal: number;
  delta: number;
  percentageChange: number;
  currency: string;
}

/**
 * Hook for comparing costs between current and previous period
 * Reuses the same query key as useCostData for current period to avoid duplicate API calls
 */
export function useCostComparison(
  dateRange: DateRange,
  groupBy: CostGrouping = 'ResourceGroup'
) {
  const { config } = useAuthStore();
  const { selectedSubscription } = useSubscriptionStore();

  const previousRange = getPreviousPeriodRange(dateRange);

  // Use the SAME query key as useCostData to share cached data
  const currentQuery = useQuery({
    queryKey: [
      'costs',
      selectedSubscription?.subscriptionId,
      dateRange.from,
      dateRange.to,
      groupBy,
    ],
    queryFn: async (): Promise<CostSummary> => {
      if (!config || !selectedSubscription) {
        throw new Error('Not authenticated or no subscription selected');
      }
      return queryCosts(
        config,
        selectedSubscription.subscriptionId,
        dateRange.from,
        dateRange.to,
        groupBy
      );
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5,
  });

  // Only fetch previous period - this is the only additional query
  const previousQuery = useQuery({
    queryKey: [
      'costs',
      selectedSubscription?.subscriptionId,
      previousRange.from,
      previousRange.to,
      groupBy,
    ],
    queryFn: async (): Promise<CostSummary> => {
      if (!config || !selectedSubscription) {
        throw new Error('Not authenticated or no subscription selected');
      }
      return queryCosts(
        config,
        selectedSubscription.subscriptionId,
        previousRange.from,
        previousRange.to,
        groupBy
      );
    },
    enabled: !!config && !!selectedSubscription,
    staleTime: 1000 * 60 * 5,
  });

  const comparison: CostComparisonResult | null =
    currentQuery.data && previousQuery.data
      ? {
          currentTotal: currentQuery.data.totalCost,
          previousTotal: previousQuery.data.totalCost,
          delta: currentQuery.data.totalCost - previousQuery.data.totalCost,
          percentageChange:
            previousQuery.data.totalCost > 0
              ? ((currentQuery.data.totalCost - previousQuery.data.totalCost) /
                  previousQuery.data.totalCost) *
                100
              : 0,
          currency: currentQuery.data.currency,
        }
      : null;

  return {
    comparison,
    currentPeriod: currentQuery.data,
    previousPeriod: previousQuery.data,
    previousRange,
    isLoading: currentQuery.isLoading || previousQuery.isLoading,
    error: currentQuery.error?.message || previousQuery.error?.message || null,
  };
}
