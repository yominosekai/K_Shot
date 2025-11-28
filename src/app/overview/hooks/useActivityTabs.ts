// 活動データタブの状態管理フック

import { useState, useEffect, useCallback } from 'react';
import { useActivityData } from './useActivityData';
import type { Period, UserActivityStats, CustomDateRange } from '@/app/overview/types';
import { getJSTDateString } from '@/shared/lib/utils/timezone';

interface UseActivityTabsOptions {
  activeTab: 'overall' | 'individual' | 'knowledge';
  onTabChange: (tab: 'overall' | 'individual') => void;
}

export function useActivityTabs({ activeTab, onTabChange }: UseActivityTabsOptions) {
  // 活動データタブ用の状態
  const [selectedUser, setSelectedUser] = useState<UserActivityStats | null>(null);
  const [activityPeriod, setActivityPeriod] = useState<Period>('1month');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    startDate: getJSTDateString(30), // デフォルトは1ヶ月前
    endDate: getJSTDateString(0),    // 今日
  });

  // 活動データ取得フック
  const {
    overallData,
    individualData,
    loading: activityDataLoading,
    error: activityDataError,
    fetchOverallData,
    fetchIndividualData,
  } = useActivityData({ autoRefresh: false });

  // 個別ビューのデータを取得
  useEffect(() => {
    if (activeTab === 'individual' && selectedUser) {
      fetchIndividualData(
        selectedUser.userSid,
        activityPeriod,
        activityPeriod === 'custom' ? customDateRange : undefined
      );
    }
  }, [activeTab, selectedUser, activityPeriod, customDateRange, fetchIndividualData]);

  // 全体タブが選択されたときにデータを取得
  useEffect(() => {
    if (activeTab === 'overall') {
      fetchOverallData();
    }
  }, [activeTab, fetchOverallData]);

  // ユーザー選択時の処理
  const handleUserSelect = useCallback((user: UserActivityStats) => {
    setSelectedUser(user);
    onTabChange('individual');
  }, [onTabChange]);

  // 全体ビューに戻る
  const handleBackToOverall = useCallback(() => {
    onTabChange('overall');
    setSelectedUser(null);
  }, [onTabChange]);

  return {
    // 状態
    selectedUser,
    activityPeriod,
    customDateRange,
    // データ
    overallData,
    individualData,
    activityDataLoading,
    activityDataError,
    // セッター
    setActivityPeriod,
    setCustomDateRange,
    // アクション
    onUserSelect: handleUserSelect,
    onBack: handleBackToOverall,
  };
}

