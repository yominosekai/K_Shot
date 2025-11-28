'use client';

import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import MaterialModal from '@/components/MaterialModal';
import ContextMenu, { type ContextMenuItem } from '@/components/ContextMenu';
import Toast from '@/components/Toast';
import { useHomePageData } from './hooks/useHomePageData';
import { useHomePageModals } from './hooks/useHomePageModals';
import { useOverviewRankings } from './overview/hooks/useOverviewRankings';
import HomeQuickActions from './components/HomeQuickActions';
import HomeRecentMaterials from './components/HomeRecentMaterials';
import HomeActivityHistory from './components/HomeActivityHistory';
import OverviewRankingsSection from './overview/components/OverviewRankingsSection';

export default function HomePage() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // データ取得とモーダル管理
  const {
    myActivities,
    recentMaterials,
    loading,
    creatorCache,
    handleRemoveActivity,
    refresh,
  } = useHomePageData();

  const {
    selectedMaterial,
    isMaterialModalOpen,
    handleMaterialClick,
    closeModal,
  } = useHomePageModals();

  // ランキングデータ
  const [rankingType, setRankingType] = useState<'likes' | 'bookmarks' | 'views'>('likes');
  const { rankings, loading: rankingLoading, cached: rankingCached, refresh: refreshRankings } = useOverviewRankings(rankingType);

  // リフレッシュ処理
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      setToastMessage('情報を更新しました');
      setIsToastVisible(true);
    } catch (err) {
      console.error('更新エラー:', err);
      setToastMessage('更新に失敗しました');
      setIsToastVisible(true);
    }
  }, [refresh]);

  // 右クリックメニューの処理
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
    <div className="p-4 sm:p-6 lg:p-8 w-full" onContextMenu={handleContextMenu}>
      <div className="w-full">
        {/* ヘッダー */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            ナレッジデータベースへようこそ
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            共有された資料の閲覧、メンバー管理、ナレッジの蓄積と活用ができます
          </p>
        </div>

        {/* クイックアクセスカード */}
        <HomeQuickActions />

        {/* 最近のアクティビティ */}
        <div className="space-y-6">
          {/* 最近のナレッジ */}
          <HomeRecentMaterials
            recentMaterials={recentMaterials}
            loading={loading}
            creatorCache={creatorCache}
            onMaterialClick={handleMaterialClick}
          />

          {/* 閲覧履歴 */}
          <HomeActivityHistory
            activities={myActivities}
            onMaterialClick={handleMaterialClick}
            onRemoveActivity={handleRemoveActivity}
          />
        </div>

        {/* 資料ランキング */}
        <div className="mt-6">
          <OverviewRankingsSection
            rankingType={rankingType}
            onRankingTypeChange={setRankingType}
            rankings={rankings}
            loading={rankingLoading}
            cached={rankingCached}
            onRefresh={refreshRankings}
          />
        </div>
      </div>

      {/* 資料モーダル */}
      <MaterialModal
        material={selectedMaterial}
        isOpen={isMaterialModalOpen}
        onClose={closeModal}
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
