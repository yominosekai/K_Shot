// ホームページのデータ取得フック

import { useState, useEffect, useCallback } from 'react';
import { getActivityHistory, removeActivityItem, type ActivityHistoryItem } from '@/shared/lib/utils/activity-history';
import { useUsers } from '@/contexts/UsersContext';
import type { User as UserType } from '@/features/auth/types';

export interface RecentMaterialActivity {
  id: string;
  title: string;
  type: 'create' | 'update';
  created_by: string;
  created_by_name?: string;
  created_date: string;
  updated_date: string;
  folder_path?: string;
}

export function useHomePageData() {
  const { getUsers: getUsersFromContext } = useUsers();
  const [myActivities, setMyActivities] = useState<ActivityHistoryItem[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<RecentMaterialActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorCache, setCreatorCache] = useState<Map<string, UserType>>(new Map());

  // 自分の活動履歴を読み込む
  const loadMyActivities = useCallback(() => {
    const activities = getActivityHistory(10);
    setMyActivities(activities);
  }, []);

  useEffect(() => {
    loadMyActivities();
  }, [loadMyActivities]);

  // 活動履歴項目を削除
  const handleRemoveActivity = useCallback((materialId: string, viewedAt: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを防ぐ
    removeActivityItem(materialId, viewedAt);
    loadMyActivities(); // リストを更新
  }, [loadMyActivities]);

  // 最近の共有資料を取得
  const fetchRecentMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/materials/recent?limit=10');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentMaterials(data.activities || []);
          
          // 作成者情報を一括取得
          const uniqueCreatorSids = new Set<string>();
          data.activities.forEach((activity: RecentMaterialActivity) => {
            if (activity.created_by) {
              uniqueCreatorSids.add(activity.created_by);
            }
          });

          // 各作成者情報を取得（UsersContextを使用）
          const creatorResults = await getUsersFromContext(Array.from(uniqueCreatorSids));
          const newCache = new Map<string, UserType>();
          creatorResults.forEach((user, sid) => {
            if (user) {
              newCache.set(sid, user);
            }
          });
          setCreatorCache(newCache);
        }
      }
    } catch (err) {
      console.error('最近の資料取得エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [getUsersFromContext]);

  // 初回のみ実行
  useEffect(() => {
    fetchRecentMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 依存配列を空にして初回のみ実行

  // リフレッシュ処理
  const refresh = useCallback(async () => {
    await fetchRecentMaterials();
    loadMyActivities();
  }, [fetchRecentMaterials, loadMyActivities]);

  return {
    myActivities,
    recentMaterials,
    loading,
    creatorCache,
    handleRemoveActivity,
    refresh,
  };
}

