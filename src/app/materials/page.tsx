// ナレッジ一覧ページ

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Grid, List, Search, FolderTree } from 'lucide-react';
import MaterialModal from '@/components/MaterialModal';
import MaterialCreationModal from '@/components/MaterialCreationModal';
import MaterialLibraryBrowser from '@/components/MaterialLibraryBrowser';
import FolderCreationModal from '@/components/FolderCreationModal';
import MaterialsSearchTab from '@/components/MaterialsSearchTab';
import CommentModal from '@/components/CommentModal';
import { useMaterialsPage } from '@/shared/hooks/useMaterialsPage';
import { useMaterialsPageTabs } from './hooks/useMaterialsPageTabs';
import { useMaterialsViewMode } from './hooks/useMaterialsViewMode';
import { useMaterialsPageModals } from './hooks/useMaterialsPageModals';
import { useMaterialsBrowser } from './hooks/useMaterialsBrowser';
import type { MaterialNormalized } from '@/features/materials/types';

export default function MaterialsPage() {
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const browserCommentCountUpdateRef = useRef<((materialId: string) => void) | null>(null);
  const browserViewsUpdateRef = useRef<((materialId: string, views: number) => void) | null>(null);

  // ビューモード管理
  const { viewMode, setViewMode, mounted } = useMaterialsViewMode();

  // 資料ページの状態管理
  const {
    materials,
    categories,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    selectedType,
    setSelectedType,
    selectedCreator,
    setSelectedCreator,
    selectedFilter,
    setSelectedFilter,
    bookmarkedIds,
    creatorCache,
    setCreatorCache,
    fetchMaterialDetail,
    handleBookmark,
    refreshMaterials,
    fetchMaterials,
    updateMaterialCommentCount,
    updateMaterialViews,
  } = useMaterialsPage();

  // ブラウザ管理
  const browser = useMaterialsBrowser();

  // モーダル管理
  const modals = useMaterialsPageModals();

  // タブ管理
  const { activeTab, setActiveTab } = useMaterialsPageTabs(
    mounted,
    fetchMaterials,
    fetchMaterialDetail,
    setSearchTerm,
    searchTerm,
    selectedCategory,
    selectedType,
    selectedCreator
  );

  // URLパラメータのmaterial処理
  useEffect(() => {
    if (!mounted) return;
    const materialParam = searchParams.get('material');
    if (materialParam) {
      const openMaterialModal = async () => {
        const detail = await fetchMaterialDetail(materialParam);
        if (detail) {
          modals.openMaterialModal(detail);
        }
      };
      openMaterialModal();
    }
  }, [mounted, searchParams, fetchMaterialDetail, modals]);

  // 資料カード/リストアイテムのクリック処理
  const handleMaterialClick = useCallback(
    async (material: MaterialNormalized) => {
      const detail = await fetchMaterialDetail(material.id);
      if (detail) {
        modals.openMaterialModal(detail);
      } else {
        modals.openMaterialModal(material);
      }
    },
    [fetchMaterialDetail, modals]
  );

  // コメントをクリック
  const handleCommentClick = useCallback((material: MaterialNormalized) => {
    modals.openCommentModal(material);
  }, [modals]);

  // いいね数更新ハンドラー
  const handleLikesUpdate = useCallback((materialId: string, newLikes: number) => {
    // 資料一覧のいいね数を更新（必要に応じて）
    // 現在はMaterialCardとMaterialListItemで直接管理しているため、ここでは何もしない
  }, []);


  return (
    <div className="p-4 sm:p-4 lg:p-6 h-full w-full">
      <div className="w-full h-full flex flex-col">
        {/* ヘッダー */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ナレッジ</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">チームの知見を探索・整理</p>
            </div>
          </div>
        </div>

        {/* タブ切り替え */}
        <div className="mb-4 flex gap-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-5 py-2.5 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'browse'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>階層表示</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-5 py-2.5 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'search'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>検索</span>
          </button>
        </div>

        {/* タブに応じたコンテンツ表示 */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'browse' ? (
            /* 階層表示 */
            <MaterialLibraryBrowser
              viewMode={viewMode}
              onMaterialClick={handleMaterialClick}
              onBookmark={handleBookmark}
              bookmarkedIds={bookmarkedIds}
              onLikesUpdate={handleLikesUpdate}
              onCreateMaterial={modals.openCreationModal}
              onCreateFolder={modals.openFolderCreationModal}
              onRefresh={browser.handleRefresh}
              refreshTrigger={browser.browserRefreshTrigger}
              onPathChange={browser.handlePathChange}
              onCommentClick={handleCommentClick}
              onCommentCountUpdateRef={browserCommentCountUpdateRef}
              onViewsUpdateRef={browserViewsUpdateRef}
            />
          ) : (
            /* 検索タブ */
            <MaterialsSearchTab
              viewMode={viewMode}
              materials={materials}
              categories={categories}
              loading={loading}
              error={error}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedType={selectedType}
              onTypeChange={setSelectedType}
              selectedCreator={selectedCreator}
              onCreatorChange={setSelectedCreator}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              bookmarkedIds={bookmarkedIds}
              creatorCache={creatorCache}
              onMaterialClick={handleMaterialClick}
              onBookmark={handleBookmark}
              onLikesUpdate={handleLikesUpdate}
              onRefresh={refreshMaterials}
              onCommentClick={handleCommentClick}
            />
          )}
        </div>

        {/* 表示切り替えボタン（両方のタブで共通） */}
        <div className="fixed bottom-8 right-8 flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label="グリッド表示"
          >
            <Grid className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list'
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label="リスト表示"
          >
            <List className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* 資料詳細モーダル */}
        <MaterialModal
          material={modals.selectedMaterial}
          isOpen={modals.isModalOpen}
          onClose={modals.closeMaterialModal}
          onBookmark={handleBookmark}
          isBookmarked={modals.selectedMaterial ? bookmarkedIds.has(modals.selectedMaterial.id) : false}
          onCommentClick={modals.selectedMaterial ? () => {
            modals.openCommentModal(modals.selectedMaterial!);
          } : undefined}
          creatorCache={creatorCache}
          onCreatorCacheUpdate={setCreatorCache}
          onViewsUpdate={(materialId, views) => {
            // 検索タブの更新
            updateMaterialViews(materialId, views);
            // 階層表示の更新（MaterialLibraryBrowserのupdateMaterialViewsを呼ぶ）
            if (browserViewsUpdateRef.current) {
              console.log('[materials/page] 階層表示の閲覧数も更新');
              browserViewsUpdateRef.current(materialId, views);
            } else {
              console.warn('[materials/page] browserViewsUpdateRef.currentがnullです');
            }
          }}
        />

        {/* 資料作成モーダル */}
        <MaterialCreationModal
          isOpen={modals.isCreationModalOpen}
          onClose={modals.closeCreationModal}
          onSuccess={browser.handleRefresh}
          categories={categories}
          initialFolderPath={modals.creationModalFolderPath}
        />

        {/* フォルダ作成モーダル */}
        <FolderCreationModal
          isOpen={modals.isFolderCreationModalOpen}
          onClose={modals.closeFolderCreationModal}
          onSuccess={browser.handleRefresh}
          currentPath={modals.folderCreationModalPath}
        />

        {/* コメントモーダル */}
        <CommentModal
          material={modals.commentMaterial}
          isOpen={modals.isCommentModalOpen}
          onClose={modals.closeCommentModal}
          onCommentAdded={(materialId) => {
            // 該当する資料のコメント数だけを更新（負荷を最小限に）
            // 検索タブと階層表示の両方で更新
            console.log('[materials/page] onCommentAdded受信:', materialId);
            // 検索タブの更新
            updateMaterialCommentCount(materialId);
            // 階層表示の更新（MaterialLibraryBrowserのupdateMaterialCommentCountを呼ぶ）
            if (browserCommentCountUpdateRef.current) {
              console.log('[materials/page] 階層表示のコメント数も更新');
              browserCommentCountUpdateRef.current(materialId);
            } else {
              console.warn('[materials/page] browserCommentCountUpdateRef.currentがnullです');
            }
          }}
        />
      </div>
    </div>
  );
}
