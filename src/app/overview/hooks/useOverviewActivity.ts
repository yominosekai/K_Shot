// アクティビティデータ取得フック

import { useState, useEffect, useCallback } from 'react';
import { getJSTTodayString } from '@/shared/lib/utils/timezone';

interface ActivityData {
  date: string;
  activeUsers?: number;
  newUsers?: number;
  created?: number;
  updated?: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5分
const CACHE_KEY_PREFIX = 'analytics:users:';

interface CacheData {
  data: ActivityData[];
  date: string;
  timestamp: number;
}

function getCacheKey(period: string, granularity: string): string {
  return `${CACHE_KEY_PREFIX}${period}:${granularity}`;
}

function getCachedData(cacheKey: string): CacheData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as CacheData;
    const now = Date.now();
    const today = getJSTTodayString();
    
    // キャッシュが期限切れ、または日付が変わった場合は無効
    if (now - parsed.timestamp > CACHE_TTL || parsed.date !== today) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setCachedData(cacheKey: string, data: ActivityData[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cacheData: CacheData = {
      data,
      date: getJSTTodayString(),
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (err) {
    // localStorageの容量制限などでエラーが発生した場合は無視
    console.warn('Failed to cache user activity data:', err);
  }
}

export function useOverviewActivity(
  period: '7' | '30' | '90' | '365',
  granularity: 'daily' | 'weekly' | 'monthly'
) {
  const [userActivityData, setUserActivityData] = useState<ActivityData[]>([]);
  const [materialActivityData, setMaterialActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserActivity = useCallback(async () => {
    const cacheKey = getCacheKey(period, granularity);
    const cached = getCachedData(cacheKey);
    
    // キャッシュがある場合はそれを使用
    if (cached) {
      setUserActivityData(cached.data);
      setLoading(false);
      // バックグラウンドで最新データを取得（キャッシュを更新）
      fetch(`/api/analytics/users?period=${period}&granularity=${granularity}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            setUserActivityData(data.data);
            setCachedData(cacheKey, data.data);
          }
        })
        .catch(() => {
          // エラーは無視（キャッシュデータを使用）
        });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/users?period=${period}&granularity=${granularity}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserActivityData(data.data);
          setCachedData(cacheKey, data.data);
        }
      }
    } catch (err) {
      console.error('ユーザーアクティビティデータ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [period, granularity]);

  const fetchMaterialActivity = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/materials?period=${period}&granularity=${granularity}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMaterialActivityData(data.data);
        }
      }
    } catch (err) {
      console.error('資料アクティビティデータ取得エラー:', err);
    }
  }, [period, granularity]);

  useEffect(() => {
    fetchUserActivity();
  }, [fetchUserActivity]);

  useEffect(() => {
    fetchMaterialActivity();
  }, [fetchMaterialActivity]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchUserActivity(), fetchMaterialActivity()]);
  }, [fetchUserActivity, fetchMaterialActivity]);

  return {
    userActivityData,
    materialActivityData,
    loading,
    refetch,
  };
}



