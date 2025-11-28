// ナレッジ運用タブの状態管理フック

import { useState, useEffect, useCallback } from 'react';
import { useOverviewStats } from './useOverviewStats';
import { useOverviewActivity } from './useOverviewActivity';
import { useOverviewCategoryType } from './useOverviewCategoryType';
import { getAvailableGranularities } from '../utils/dateUtils';

export function useKnowledgeManagementTab() {
  // ナレッジ運用タブ用の状態
  const [period, setPeriod] = useState<'7' | '30' | '90' | '365'>('7');
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // データ取得フック
  const { stats, refetch: refetchStats } = useOverviewStats();
  const { userActivityData, materialActivityData, loading: activityLoading, refetch: refetchActivity } = useOverviewActivity(period, granularity);
  const {
    types,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
    categoryData,
    typeData,
    categoryLoading,
    typeLoading,
    categoryName,
  } = useOverviewCategoryType(period, granularity);

  // 期間が変更されたときに粒度を調整
  useEffect(() => {
    const availableGranularities = getAvailableGranularities(period);
    if (!availableGranularities.includes(granularity)) {
      setGranularity(availableGranularities[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // リフレッシュ処理
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchStats(),
        refetchActivity(),
      ]);
    } catch (err) {
      console.error('更新エラー:', err);
    }
  }, [refetchStats, refetchActivity]);

  return {
    // 状態
    period,
    granularity,
    // データ
    stats,
    userActivityData,
    materialActivityData,
    activityLoading,
    types,
    selectedCategory,
    selectedType,
    categoryData,
    typeData,
    categoryLoading,
    typeLoading,
    categoryName,
    // セッター
    setPeriod,
    setGranularity,
    setSelectedCategory,
    setSelectedType,
    // アクション
    onRefresh: handleRefresh,
  };
}

