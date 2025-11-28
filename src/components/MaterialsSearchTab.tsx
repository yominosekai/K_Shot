// 検索タブコンポーネント

'use client';

import { useState } from 'react';
import MaterialsFilterPanel from './MaterialsFilterPanel';
import MaterialMoveModal from './MaterialMoveModal';
import MaterialInfoModal from './MaterialInfoModal';
import NotificationSendModal from './NotificationSendModal';
import MaterialCreationModal from './MaterialCreationModal';
import ContextMenu from './ContextMenu';
import Toast from './Toast';
import TrashProgressModal from './TrashProgressModal';
import MaterialsSearchHeader from './MaterialsSearchTab/components/MaterialsSearchHeader';
import MaterialsSearchResults from './MaterialsSearchTab/components/MaterialsSearchResults';
import { useMaterialsSearchContextMenu } from './MaterialsSearchTab/hooks/useMaterialsSearchContextMenu';
import { useMaterialsSearchModals } from './MaterialsSearchTab/hooks/useMaterialsSearchModals';
import { useMaterialDownload } from './MaterialsSearchTab/hooks/useMaterialDownload';
import { useTrashOperation } from '@/shared/hooks/useTrashOperation';
import { useMaterialPathManager } from './MaterialLibraryBrowser/hooks/useMaterialPathManager';
import { useAuth } from '@/contexts/AuthContext';
import type { MaterialNormalized, CategoryNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';

interface MaterialsSearchTabProps {
  viewMode: 'grid' | 'list';
  materials: MaterialNormalized[];
  categories: CategoryNormalized[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedCreator: string;
  onCreatorChange: (creator: string) => void;
  selectedFilter: 'all' | 'starred';
  onFilterChange: (filter: 'all' | 'starred') => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  bookmarkedIds: Set<string>;
  creatorCache: Map<string, User>;
  onMaterialClick: (material: MaterialNormalized) => void;
  onBookmark: (materialId: string) => void;
  onLikesUpdate?: (materialId: string, likes: number) => void;
  onBookmarksUpdate?: (materialId: string, bookmarks: number) => void;
  onRefresh?: () => Promise<void>;
  onCommentClick?: (material: MaterialNormalized) => void;
}

export default function MaterialsSearchTab({
  viewMode,
  materials,
  categories,
  loading,
  error,
  searchTerm,
  onSearchTermChange,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  selectedCreator,
  onCreatorChange,
  selectedFilter,
  onFilterChange,
  showFilters,
  onToggleFilters,
  bookmarkedIds,
  creatorCache,
  onMaterialClick,
  onBookmark,
  onLikesUpdate,
  onBookmarksUpdate,
  onRefresh,
  onCommentClick,
}: MaterialsSearchTabProps) {
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const { user } = useAuth();

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
  };

  // パス管理
  const { buildRelativePath } = useMaterialPathManager();

  // ゴミ箱操作
  const {
    isMovingToTrash,
    trashProgress,
    trashMessage,
    moveMaterialToTrash,
  } = useTrashOperation({
    user,
    buildFullPath: buildRelativePath, // 相対パスを使用（API側で完全なパスに変換）
    onSuccess: () => {
      showToast('ゴミ箱に移動しました');
      if (onRefresh) {
        onRefresh();
      }
    },
    onError: (message) => {
      showToast(message);
    },
  });

  // モーダル管理
  const modals = useMaterialsSearchModals();

  // ダウンロード処理
  const { downloadMaterial } = useMaterialDownload(showToast);

  // コンテキストメニュー
  const {
    contextMenu,
    setContextMenu,
    handleBackgroundContextMenu,
    handleContextMenu,
  } = useMaterialsSearchContextMenu({
    onRefresh,
    onMoveMaterial: modals.openMoveModal,
    onShowMaterialInfo: modals.openInfoModal,
    onSendNotification: modals.openNotificationModal,
    onDownloadMaterial: downloadMaterial,
    onEditMaterial: modals.openEditModal,
    onMoveToTrash: moveMaterialToTrash,
    showToast,
  });

  return (
    <div
      onContextMenu={handleBackgroundContextMenu}
      className="h-full"
    >
      {/* 検索バー */}
      <MaterialsSearchHeader
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
      />

      {/* フィルター */}
      <MaterialsFilterPanel
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
        selectedType={selectedType}
        onTypeChange={onTypeChange}
        selectedCreator={selectedCreator}
        onCreatorChange={onCreatorChange}
        selectedFilter={selectedFilter}
        onFilterChange={onFilterChange}
        categories={categories}
      />

      {/* ローディング */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">データを読み込み中...</p>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* 資料一覧 */}
      {!loading && !error && (
        <MaterialsSearchResults
          viewMode={viewMode}
          materials={materials}
          bookmarkedIds={bookmarkedIds}
          creatorCache={creatorCache}
          onMaterialClick={onMaterialClick}
          onBookmark={onBookmark}
          onLikesUpdate={onLikesUpdate}
          onBookmarksUpdate={onBookmarksUpdate}
          onCommentClick={onCommentClick}
          onContextMenu={handleContextMenu}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
        />
      )}

      {/* 右クリックメニュー */}
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

      {/* 資料移動モーダル */}
      <MaterialMoveModal
        isOpen={modals.isMoveModalOpen}
        onClose={modals.closeMoveModal}
        material={modals.moveMaterial}
        currentFolderPath={modals.moveMaterial?.folder_path || ''}
        onMove={async (materialId, targetFolderPath) => {
          const response = await fetch(`/api/materials/${materialId}/move`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target_folder_path: targetFolderPath }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '移動に失敗しました');
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error || '移動に失敗しました');
          }

          showToast('資料を移動しました');
        }}
      />

      {/* ファイル情報モーダル */}
      <MaterialInfoModal
        isOpen={modals.isInfoModalOpen}
        onClose={modals.closeInfoModal}
        material={modals.infoMaterial}
      />

      {/* 通知送信モーダル */}
      <NotificationSendModal
        isOpen={modals.isNotificationSendModalOpen}
        onClose={modals.closeNotificationModal}
        material={modals.notificationMaterial}
        onSuccess={() => {
          showToast('通知を送信しました');
        }}
      />

      {/* 資料編集モーダル */}
      <MaterialCreationModal
        isOpen={modals.isEditModalOpen}
        onClose={modals.closeEditModal}
        onSuccess={async () => {
          modals.closeEditModal();
          if (onRefresh) {
            await onRefresh();
          }
          showToast('資料を更新しました');
        }}
        categories={categories}
        editMaterial={modals.editMaterial}
        initialFolderPath={modals.editMaterial?.folder_path || ''}
      />

      {/* ゴミ箱移動中のプログレスバー */}
      <TrashProgressModal
        isVisible={isMovingToTrash}
        progress={trashProgress}
        message={trashMessage}
      />
    </div>
  );
}

