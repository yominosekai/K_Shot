// 統計データ取得フック

import { useState, useEffect, useCallback } from 'react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalMaterials: number;
  newMaterialsThisMonth: number;
  updatedMaterialsThisMonth: number;
}

export function useOverviewStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('統計データ取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}



