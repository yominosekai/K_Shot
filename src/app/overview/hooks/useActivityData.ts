// 活動データ取得フック

import { useState, useEffect, useCallback } from 'react';
import type { ActivityStatsResponse, IndividualStatsResponse, Period, CustomDateRange } from '@/app/overview/types';

interface UseActivityDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useActivityData(options: UseActivityDataOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  
  const [overallData, setOverallData] = useState<ActivityStatsResponse | null>(null);
  const [individualData, setIndividualData] = useState<IndividualStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverallData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/activity/stats?type=overall');
      if (!response.ok) {
        throw new Error('統計データの取得に失敗しました');
      }
      const data = await response.json() as ActivityStatsResponse;
      setOverallData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      console.error('統計データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIndividualData = useCallback(async (userSid: string, period: Period = '1month', customRange?: CustomDateRange) => {
    try {
      setLoading(true);
      setError(null);
      let url = `/api/activity/stats?type=individual&userSid=${userSid}&period=${period}`;
      if (period === 'custom' && customRange) {
        url += `&startDate=${customRange.startDate}&endDate=${customRange.endDate}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('個別統計データの取得に失敗しました');
      }
      const data = await response.json() as IndividualStatsResponse;
      setIndividualData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      console.error('個別統計データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverallData();
  }, [fetchOverallData]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOverallData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOverallData]);

  return {
    overallData,
    individualData,
    loading,
    error,
    fetchOverallData,
    fetchIndividualData,
    refetch: fetchOverallData,
  };
}

