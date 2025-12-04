// ランキングデータ取得フック

import { useState, useEffect, useCallback } from 'react';

interface RankingItem {
  materialId: string;
  title: string;
  count: number;
  createdBy?: string;
  createdByName?: string;
  createdByAvatar?: string;
}

export function useOverviewRankings(rankingType: 'likes' | 'views') {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(false);

  const fetchRankings = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const url = `/api/analytics/rankings?type=${rankingType}&limit=10${forceRefresh ? '&force_refresh=true' : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRankings(data.rankings);
          setCached(data.cached || false);
        }
      }
    } catch (err) {
      console.error('ランキングデータ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [rankingType]);

  useEffect(() => {
    fetchRankings(false);
  }, [fetchRankings]);

  const refresh = useCallback(() => {
    fetchRankings(true);
  }, [fetchRankings]);

  return { rankings, loading, cached, refetch: fetchRankings, refresh };
}

