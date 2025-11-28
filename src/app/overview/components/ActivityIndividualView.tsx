// 個別ビューコンポーネント（ナレッジDB活用分析の個別タブ）

'use client';

import { Calendar, BookOpen, TrendingUp, Clock, ArrowLeft } from 'lucide-react';
import type { UserActivityStats, Period, CustomDateRange } from '@/app/overview/types';
import DateRangeSelector from './DateRangeSelector';
import OverviewActivityChart from './OverviewActivityChart';

interface ActivityIndividualViewProps {
  user: UserActivityStats;
  period: Period;
  customRange?: CustomDateRange;
  onBack: () => void;
  onPeriodChange: (period: Period) => void;
  onCustomRangeChange?: (range: CustomDateRange) => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const periodLabels: Record<Period, string> = {
  '1month': '1ヶ月',
  '3months': '3ヶ月',
  '6months': '半年',
  '1year': '1年',
  'custom': 'カスタム',
};

export default function ActivityIndividualView({ 
  user, 
  period, 
  customRange,
  onBack, 
  onPeriodChange,
  onCustomRangeChange,
}: ActivityIndividualViewProps) {
  // 期間から粒度を決定
  const getGranularity = (): 'daily' | 'weekly' | 'monthly' => {
    if (period === 'custom' && customRange) {
      const startDate = new Date(customRange.startDate);
      const endDate = new Date(customRange.endDate);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        return 'daily';
      } else if (daysDiff <= 90) {
        return 'weekly';
      } else {
        return 'monthly';
      }
    } else if (period === '1month') {
      return 'daily';
    } else if (period === '3months') {
      return 'weekly';
    } else if (period === '6months') {
      return 'weekly';
    } else {
      return 'monthly';
    }
  };

  const granularity = getGranularity();
  
  // activityDataを使用（なければdailyDataをフォールバック）
  const activityData = (user.activityData && user.activityData.length > 0) 
    ? user.activityData 
    : user.dailyData.map(item => ({
        date: item.date,
        viewCount: item.count || 0,
        uploadCount: 0, // dailyDataにはアップロード数がないため0
      }));
  
  // OverviewActivityChart用のデータ形式に変換
  const chartData = activityData.map(item => ({
    date: item.date,
    viewCount: item.viewCount || 0,
    uploadCount: item.uploadCount || 0,
  }));

  return (
    <div className="space-y-6">
      {/* ユーザー情報ヘッダー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{user.displayName}</h2>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            全体ビューに戻る
          </button>
        </div>
      </div>

      {/* 個人サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">資料閲覧回数</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{user.viewCount}</p>
            </div>
            <BookOpen className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">資料別閲覧回数</p>
              <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">{user.uniqueMaterials}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-pink-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">アップロード数</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{user.uploadedMaterials}</p>
            </div>
            <BookOpen className="w-12 h-12 text-indigo-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">アクティブ日数</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{user.activeDays}</p>
            </div>
            <Clock className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* 期間選択 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <DateRangeSelector
          period={period}
          customRange={customRange}
          onPeriodChange={onPeriodChange}
          onCustomRangeChange={onCustomRangeChange}
        />
      </div>

      {/* グラフエリア */}
      <OverviewActivityChart
        title="アクティビティ"
        data={chartData}
        loading={false}
        granularity={granularity}
        dataKeys={[
          { key: 'viewCount', name: '閲覧数', color: '#3b82f6' },
          { key: 'uploadCount', name: 'アップロード数', color: '#10b981' },
        ]}
      />

      {/* 資料別閲覧数 */}
      {user.materialData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">資料別閲覧回数（内訳）</h2>
          <div className="space-y-3">
            {user.materialData.map((material, index) => (
              <div key={material.materialId} className="flex items-center gap-4">
                <div className="w-64 text-sm text-gray-600 dark:text-gray-400 truncate" title={material.title}>
                  {material.title}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-8 overflow-hidden">
                    <div
                      className="h-full flex items-center justify-end px-3 text-white text-sm font-medium rounded-full transition-all"
                      style={{
                        width: `${user.viewCount > 0 ? (material.count / user.viewCount) * 100 : 0}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    >
                      {material.count}回
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {user.materialData.length === 0 && chartData.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">この期間のデータがありません</p>
        </div>
      )}
    </div>
  );
}

