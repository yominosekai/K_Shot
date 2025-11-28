// 階層ブラウザコンポーネント

'use client';

import { useState, useCallback, useEffect } from 'react';
import CommentModal from './CommentModal';
import ContextMenu from './ContextMenu';
import Toast from './Toast';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import TrashProgressModal from './TrashProgressModal';
import MaterialBrowserContent from './MaterialLibraryBrowser/components/MaterialBrowserContent';
import MaterialLibraryModals from './MaterialLibraryBrowser/components/MaterialLibraryModals';
import { useCreatorCache } from '@/shared/hooks/useCreatorCache';
import { useFolderNavigation } from '@/shared/hooks/useFolderNavigation';
import { useTrashOperation } from '@/shared/hooks/useTrashOperation';
import { useMaterialContextMenu } from '@/shared/hooks/useMaterialContextMenu';
import { useMaterialModals } from '@/shared/hooks/useMaterialModals';
import { downloadMaterialAsZip } from '@/shared/lib/utils/material-download';
import { useMaterialPathManager } from './MaterialLibraryBrowser/hooks/useMaterialPathManager';
import { useMaterialBrowserToast } from './MaterialLibraryBrowser/hooks/useMaterialBrowserToast';
import { useMaterialBrowserHandlers } from './MaterialLibraryBrowser/hooks/useMaterialBrowserHandlers';
import { useCategories } from '@/contexts/CategoriesContext';
import type { MaterialNormalized, FolderNormalized } from '@/features/materials/types';
import { useAuth } from '@/contexts/AuthContext';

interface MaterialLibraryBrowserProps {
  viewMode: 'grid' | 'list';
  onMaterialClick: (material: MaterialNormalized) => void;
  onBookmark?: (materialId: string) => void;
  bookmarkedIds?: Set<string>;
  onCreateMaterial?: (folderPath: string) => void;
  onCreateFolder?: (currentPath: string) => void;
  onRefresh?: () => void;
  refreshTrigger?: number;
  onPathChange?: (path: string) => void;
  onLikesUpdate?: (materialId: string, likes: number) => void;
  onBookmarksUpdate?: (materialId: string, bookmarks: number) => void;
  onCommentClick?: (material: MaterialNormalized) => void;
  onCommentCountUpdateRef?: React.MutableRefObject<((materialId: string) => void) | null>;
  onBookmarkCountUpdateRef?: React.MutableRefObject<((materialId: string, bookmarkCount: number) => void) | null>;
}

export default function MaterialLibraryBrowser({
  viewMode,
  onMaterialClick,
  onBookmark,
  bookmarkedIds = new Set(),
  onLikesUpdate,
  onCreateMaterial,
  onCreateFolder,
  onRefresh,
  refreshTrigger = 0,
  onPathChange,
  onCommentClick,
  onBookmarksUpdate,
  onCommentCountUpdateRef,
  onBookmarkCountUpdateRef,
}: MaterialLibraryBrowserProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: any[] } | null>(null);
  const { categories } = useCategories(); // Contextから取得
  const { user } = useAuth();

  // トースト管理
  const toast = useMaterialBrowserToast();

  // 作成者情報キャッシュ
  const { creatorCache, setCreatorCache, fetchCreators } = useCreatorCache();

  // フォルダ階層管理
  const {
    currentPath,
    entries,
    materials,
    breadcrumb,
    loading,
    folders,
    handleFolderClick,
    handleBreadcrumbClick,
    updateMaterialCommentCount,
    updateMaterialBookmarkCount,
  } = useFolderNavigation({
    refreshTrigger,
    onPathChange,
    fetchCreators,
  });

  // 親から呼び出せるように、updateMaterialCommentCountをrefに公開
  useEffect(() => {
    if (onCommentCountUpdateRef) {
      onCommentCountUpdateRef.current = updateMaterialCommentCount;
    }
  }, [onCommentCountUpdateRef, updateMaterialCommentCount]);

  // 親から呼び出せるように、updateMaterialBookmarkCountをrefに公開
  useEffect(() => {
    if (onBookmarkCountUpdateRef) {
      onBookmarkCountUpdateRef.current = updateMaterialBookmarkCount;
    }
  }, [onBookmarkCountUpdateRef, updateMaterialBookmarkCount]);

  // パス管理
  const { buildRelativePath, copyPath } = useMaterialPathManager();

  // モーダル管理
  const modals = useMaterialModals({
    onRefresh,
    currentPath,
    showToast: toast.showToast,
  });

  // ハンドラー管理
  const handlers = useMaterialBrowserHandlers({
    userSid: user?.sid,
    onMaterialClick: modals.openMaterialModal,
    showToast: toast.showToast,
  });

  // ゴミ箱操作
  const {
    isMovingToTrash,
    trashProgress,
    trashMessage,
    moveMaterialToTrash,
    moveFolderToTrash,
  } = useTrashOperation({
    user,
    buildFullPath: buildRelativePath, // 相対パスを使用（API側で完全なパスに変換）
    onSuccess: () => {
      toast.showToast('ゴミ箱に移動しました');
      if (onRefresh) {
        onRefresh();
      }
    },
    onError: (message) => {
      toast.showToast(message);
    },
  });

  // コンテキストメニュー管理
  const { handleContextMenu: createContextMenu } = useMaterialContextMenu({
    currentPath: currentPath || '',
    userSid: user?.sid,
    copyPath: (folder?: FolderNormalized, material?: MaterialNormalized) => copyPath(folder, material, toast.showToast),
    moveMaterialToTrash,
    moveFolderToTrash,
    onCreateMaterial,
    onCreateFolder,
    onEditMaterial: modals.openEditModal,
    onMoveMaterial: modals.openMoveModal,
    onShowMaterialInfo: modals.openInfoModal,
    onShowFolderProperties: modals.openFolderPropertiesModal,
    onSendNotification: modals.openNotificationSendModal,
    onDownloadMaterial: handlers.handleDownloadMaterial,
    onRenameFolder: modals.openRenameModal,
    onMoveFolder: modals.openMoveFolderModal,
    showToast: toast.showToast,
  });

  // 右クリックメニューの処理
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, folder?: FolderNormalized, material?: MaterialNormalized) => {
      const menuData = createContextMenu(e, folder, material);
      if (menuData) {
        setContextMenu(menuData);
      }
    },
    [createContextMenu]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full" onContextMenu={(e) => handleContextMenu(e)}>
      {/* パンくずナビゲーション */}
      <BreadcrumbNavigation breadcrumb={breadcrumb} onBreadcrumbClick={handleBreadcrumbClick} />

      {/* エントリ一覧 */}
      <MaterialBrowserContent
        viewMode={viewMode}
        entries={entries}
        folders={folders}
        materials={materials}
        loading={loading}
        currentPath={currentPath}
        bookmarkedIds={bookmarkedIds}
        creatorCache={creatorCache}
        onFolderClick={handleFolderClick}
        onMaterialClick={handlers.handleMaterialClick}
        onBookmark={onBookmark}
        onCommentClick={onCommentClick}
        onLikesUpdate={onLikesUpdate}
        onBookmarksUpdate={onBookmarksUpdate}
        onContextMenu={handleContextMenu}
        formatDate={formatDate}
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

      {/* モーダル群 */}
      <MaterialLibraryModals
        selectedMaterial={modals.selectedMaterial}
        isModalOpen={modals.isModalOpen}
        closeMaterialModal={modals.closeMaterialModal}
        onBookmark={onBookmark}
        isBookmarked={modals.selectedMaterial ? bookmarkedIds.has(modals.selectedMaterial.id) : false}
        onCommentClick={modals.selectedMaterial && onCommentClick ? (materialId) => onCommentClick(modals.selectedMaterial!) : undefined}
        creatorCache={creatorCache}
        setCreatorCache={setCreatorCache}
        isPropertiesModalOpen={modals.isPropertiesModalOpen}
        closeFolderPropertiesModal={modals.closeFolderPropertiesModal}
        selectedFolder={modals.selectedFolder}
        isEditModalOpen={modals.isEditModalOpen}
        closeEditModal={modals.closeEditModal}
        editMaterial={modals.editMaterial}
        currentPath={modals.currentPath}
        categories={categories as any}
        isMoveModalOpen={modals.isMoveModalOpen}
        closeMoveModal={modals.closeMoveModal}
        moveMaterial={modals.moveMaterial}
        handleMove={modals.handleMove}
        showToast={toast.showToast}
        isInfoModalOpen={modals.isInfoModalOpen}
        closeInfoModal={modals.closeInfoModal}
        infoMaterial={modals.infoMaterial}
        isNotificationSendModalOpen={modals.isNotificationSendModalOpen}
        closeNotificationSendModal={modals.closeNotificationSendModal}
        notificationMaterial={modals.notificationMaterial}
        isRenameModalOpen={modals.isRenameModalOpen}
        closeRenameModal={modals.closeRenameModal}
        renameFolder={modals.renameFolder}
        isMoveFolderModalOpen={modals.isMoveFolderModalOpen}
        closeMoveFolderModal={modals.closeMoveFolderModal}
        moveFolder={modals.moveFolder}
        handleFolderMove={modals.handleFolderMove}
      />

      {/* トースト通知 */}
      <Toast
        message={toast.toastMessage}
        isVisible={toast.isToastVisible}
        onClose={toast.hideToast}
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
