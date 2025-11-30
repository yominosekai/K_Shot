'use client';

import { useEffect, useState, useMemo, FormEvent } from 'react';
import { Heart, Grid, List, Search, RefreshCw } from 'lucide-react';
import MaterialCard from '@/components/MaterialCard';
import MaterialListItem from '@/components/MaterialListItem';
import MaterialModal from '@/components/MaterialModal';
import CommentModal from '@/components/CommentModal';
import Toast from '@/components/Toast';
import ContextMenu from '@/components/ContextMenu';
import MaterialCreationModal from '@/components/MaterialCreationModal';
import NotificationSendModal from '@/components/NotificationSendModal';
import MaterialInfoModal from '@/components/MaterialInfoModal';
import type { MaterialNormalized } from '@/features/materials/types';
import { useMaterialsPage } from '@/shared/hooks/useMaterialsPage';
import { useCategories } from '@/contexts/CategoriesContext';
import { useFavoritesViewMode } from './hooks/useFavoritesViewMode';
import { useFavoritesModals } from './hooks/useFavoritesModals';
import { useFavoritesContextMenu } from './hooks/useFavoritesContextMenu';
import { useFavoritesCleanup } from './hooks/useFavoritesCleanup';
import { useFavoritesToast } from './hooks/useFavoritesToast';

export default function FavoritesPage() {
  const [localSearch, setLocalSearch] = useState('');
  
  const { categories } = useCategories();
  
  // 表示モード管理
  const { viewMode, setViewMode, mounted } = useFavoritesViewMode();
  
  // トースト管理
  const toast = useFavoritesToast();
  
  // モーダル管理
  const modals = useFavoritesModals();

  const {
    materials,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    selectedFilter,
    setSelectedFilter,
    bookmarkedIds,
    creatorCache,
    setCreatorCache,
    handleBookmark,
    fetchMaterials,
    refreshMaterials,
    updateMaterialCommentCount,
    bookmarks,
  } = useMaterialsPage();

  // クリーンアップ処理
  const cleanup = useFavoritesCleanup({
    refreshMaterials,
    showToast: toast.showToast,
    bookmarks,
  });

  // コンテキストメニュー管理
  const contextMenu = useFavoritesContextMenu({
    showToast: toast.showToast,
    onEditMaterial: modals.openEditModal,
    onShowInfo: modals.openInfoModal,
    onSendNotification: modals.openNotificationModal,
    onRefresh: async () => {
      try {
        await refreshMaterials();
        toast.showToast('情報を更新しました');
      } catch (err) {
        console.error('更新エラー:', err);
        toast.showToast('更新に失敗しました');
      }
    },
    onCleanup: cleanup.handleCleanup,
  });

  // 初回にお気に入りフィルターを適用
  useEffect(() => {
    setSelectedFilter('starred');
  }, [setSelectedFilter]);

  // フィルター適用後に資料を取得
  useEffect(() => {
    if (selectedFilter === 'starred') {
      fetchMaterials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter]); // fetchMaterialsは依存配列から除外（再作成されるたびに再実行されるのを防ぐ）

  // お気に入りIDが取得された後に、お気に入りフィルターが適用されている場合は再取得
  useEffect(() => {
    if (selectedFilter === 'starred' && bookmarkedIds.size > 0) {
      // お気に入りIDが取得された後に再取得（フィルタリングが正しく動作するように）
      fetchMaterials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarkedIds.size, selectedFilter]); // bookmarkedIds.sizeを依存配列に追加

  // 検索語をローカル状態に同期
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(localSearch.trim());
  };

  const handleOpenMaterial = (material: MaterialNormalized) => {
    modals.openMaterialModal(material);
  };

  const favoriteCount = useMemo(() => materials.length, [materials]);

  return (
    <div className="flex-1 overflow-auto p-6" onContextMenu={contextMenu.handleBackgroundContextMenu}>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500" />
              お気に入り
              {favoriteCount > 0 && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({favoriteCount}件)
                </span>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              お気に入り登録した資料を一覧で確認できます。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="カード表示"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="リスト表示"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                type="text"
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="タイトル・キーワードで検索"
                className="flex-1 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
          </form>
        </section>

        {/* コンテンツエリア */}
        <div className="min-h-[calc(100vh-300px)]" onContextMenu={contextMenu.handleBackgroundContextMenu}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          )}

          {!loading && materials.length === 0 && (
            <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
              <Heart className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                お気に入りはまだありません
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                共有資料ページで気になる資料をお気に入りに追加すると、ここに表示されます。
              </p>
            </div>
          )}

          {!loading && materials.length > 0 && (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                  : 'space-y-3'
              }
            >
            {materials.map((material) =>
              viewMode === 'grid' ? (
                <div
                  key={material.id}
                  data-material-item
                  onContextMenu={(e) => contextMenu.handleMaterialContextMenu(e, material)}
                >
                  <MaterialCard
                    material={material}
                    onClick={() => handleOpenMaterial(material)}
                    onBookmark={handleBookmark}
                    isBookmarked={bookmarkedIds.has(material.id)}
                    onCommentClick={(materialId) => {
                      modals.openCommentModal(material);
                    }}
                  />
                </div>
              ) : (
                <div
                  key={material.id}
                  data-material-item
                  onContextMenu={(e) => contextMenu.handleMaterialContextMenu(e, material)}
                >
                  <MaterialListItem
                    material={material}
                    onClick={() => handleOpenMaterial(material)}
                    onBookmark={handleBookmark}
                    isBookmarked={bookmarkedIds.has(material.id)}
                    creatorCache={creatorCache}
                    onCommentClick={(materialId) => {
                      modals.openCommentModal(material);
                    }}
                  />
                </div>
              )
            )}
            </div>
          )}
        </div>
      </div>

      <MaterialModal
        material={modals.selectedMaterial}
        isOpen={modals.isMaterialModalOpen}
        onClose={modals.closeMaterialModal}
        onBookmark={handleBookmark}
        isBookmarked={modals.selectedMaterial ? bookmarkedIds.has(modals.selectedMaterial.id) : false}
        onCommentClick={
          modals.selectedMaterial
            ? () => {
                modals.openCommentModal(modals.selectedMaterial!);
              }
            : undefined
        }
        creatorCache={creatorCache}
        onCreatorCacheUpdate={setCreatorCache}
      />

      <CommentModal
        material={modals.commentMaterial}
        isOpen={modals.isCommentModalOpen}
        onClose={modals.closeCommentModal}
        onCommentAdded={(materialId) => {
          updateMaterialCommentCount(materialId);
        }}
      />

      {/* 資料編集モーダル */}
      <MaterialCreationModal
        isOpen={modals.isEditModalOpen}
        onClose={modals.closeEditModal}
        onSuccess={() => {
          modals.closeEditModal();
          refreshMaterials();
        }}
        categories={categories as any}
        editMaterial={modals.editMaterial}
        initialFolderPath={modals.editMaterial?.folder_path || undefined}
      />

      {/* 通知送信モーダル */}
      <NotificationSendModal
        isOpen={modals.isNotificationModalOpen}
        onClose={modals.closeNotificationModal}
        material={modals.notificationMaterial}
        onSuccess={() => {
          toast.showToast('通知を送信しました');
        }}
      />

      {/* ファイル情報モーダル */}
      <MaterialInfoModal
        isOpen={modals.isInfoModalOpen}
        onClose={modals.closeInfoModal}
        material={modals.infoMaterial}
      />

      <Toast
        message={toast.toastMessage}
        isVisible={toast.isToastVisible}
        onClose={toast.hideToast}
      />

      {/* コンテキストメニュー */}
      {contextMenu.contextMenu && (
        <ContextMenu
          x={contextMenu.contextMenu.x}
          y={contextMenu.contextMenu.y}
          items={contextMenu.contextMenu.items}
          onClose={contextMenu.closeContextMenu}
        />
      )}
    </div>
  );
}

