// ナレッジ運用タブのコンテンツ（既存の全体状況ページの内容）

'use client';

import { RefreshCw } from 'lucide-react';
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu';
import Toast from '@/components/Toast';
import { useState, useCallback } from 'react';
import OverviewStatsCards from './OverviewStatsCards';
import OverviewPeriodSelector from './OverviewPeriodSelector';
import OverviewActivityChart from './OverviewActivityChart';
import OverviewCategoryTypeCharts from './OverviewCategoryTypeCharts';
import type { OverviewPageProps } from '../types';

export default function KnowledgeManagementView({
  stats,
  period,
  granularity,
  userActivityData,
  materialActivityData,
  activityLoading,
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
  onPeriodChange,
  onGranularityChange,
  onRefresh,
}: OverviewPageProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh();
      setToastMessage('情報を更新しました');
      setIsToastVisible(true);
    } catch (err) {
      console.error('更新エラー:', err);
      setToastMessage('更新に失敗しました');
      setIsToastVisible(true);
    }
  }, [onRefresh]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: '最新の情報に更新',
        icon: <RefreshCw className="w-4 h-4" />,
        onClick: handleRefresh,
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
    });
  }, [handleRefresh]);

  return (
    <div onContextMenu={handleContextMenu}>
      {/* 主要指標カード */}
      {stats && <OverviewStatsCards stats={stats} />}

      {/* 期間・粒度選択 */}
      <OverviewPeriodSelector
        period={period}
        granularity={granularity}
        onPeriodChange={onPeriodChange}
        onGranularityChange={onGranularityChange}
      />

      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverviewActivityChart
          title="ナレッジ利用者数"
          data={userActivityData}
          loading={activityLoading}
          granularity={granularity}
          dataKeys={[
            { key: 'activeUsers', name: 'アクティブユーザー', color: '#10b981' },
            { key: 'newUsers', name: '新規ユーザー', color: '#3b82f6' },
          ]}
        />
        <OverviewActivityChart
          title="資料アクティビティ推移"
          data={materialActivityData}
          loading={activityLoading}
          granularity={granularity}
          dataKeys={[
            { key: 'created', name: '新規作成', color: '#10b981' },
            { key: 'updated', name: '更新', color: '#3b82f6' },
          ]}
        />
      </div>

      {/* カテゴリ/タイプ別グラフ */}
      <OverviewCategoryTypeCharts
        types={types}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        categoryData={categoryData}
        typeData={typeData}
        categoryLoading={categoryLoading}
        typeLoading={typeLoading}
        categoryName={categoryName}
        granularity={granularity}
      />

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* トースト通知 */}
      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </div>
  );
}

