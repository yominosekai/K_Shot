'use client';

import MaterialModal from '@/components/MaterialModal';
import MaterialCreationModal from '@/components/MaterialCreationModal';
import MaterialMoveModal from '@/components/MaterialMoveModal';
import MaterialInfoModal from '@/components/MaterialInfoModal';
import NotificationSendModal from '@/components/NotificationSendModal';
import FolderPropertiesModal from '@/components/FolderPropertiesModal';
import FolderRenameModal from '@/components/FolderRenameModal';
import FolderMoveModal from '@/components/FolderMoveModal';
import type { MaterialNormalized, FolderNormalized } from '@/features/materials/types';
import type { Category } from '@/features/materials/types';

interface MaterialLibraryModalsProps {
  selectedMaterial: MaterialNormalized | null;
  isModalOpen: boolean;
  closeMaterialModal: () => void;
  onBookmark?: (materialId: string) => void;
  isBookmarked: boolean;
  onCommentClick?: (material: MaterialNormalized) => void;
  creatorCache: Map<string, any>;
  setCreatorCache: (cache: Map<string, any>) => void;
  isPropertiesModalOpen: boolean;
  closeFolderPropertiesModal: () => void;
  selectedFolder: FolderNormalized | null;
  isEditModalOpen: boolean;
  closeEditModal: () => void;
  editMaterial: MaterialNormalized | null;
  currentPath: string | null;
  categories: Category[];
  isMoveModalOpen: boolean;
  closeMoveModal: () => void;
  moveMaterial: MaterialNormalized | null;
  handleMove: (materialId: string, targetFolderPath: string) => Promise<void>;
  showToast: (message: string) => void;
  isInfoModalOpen: boolean;
  closeInfoModal: () => void;
  infoMaterial: MaterialNormalized | null;
  isNotificationSendModalOpen: boolean;
  closeNotificationSendModal: () => void;
  notificationMaterial: MaterialNormalized | null;
  isRenameModalOpen: boolean;
  closeRenameModal: () => void;
  renameFolder: FolderNormalized | null;
  isMoveFolderModalOpen: boolean;
  closeMoveFolderModal: () => void;
  moveFolder: FolderNormalized | null;
  handleFolderMove: (folderId: string, targetParentId: string) => Promise<void>;
}

export default function MaterialLibraryModals({
  selectedMaterial,
  isModalOpen,
  closeMaterialModal,
  onBookmark,
  isBookmarked,
  onCommentClick,
  creatorCache,
  setCreatorCache,
  isPropertiesModalOpen,
  closeFolderPropertiesModal,
  selectedFolder,
  isEditModalOpen,
  closeEditModal,
  editMaterial,
  currentPath,
  categories,
  isMoveModalOpen,
  closeMoveModal,
  moveMaterial,
  handleMove,
  showToast,
  isInfoModalOpen,
  closeInfoModal,
  infoMaterial,
  isNotificationSendModalOpen,
  closeNotificationSendModal,
  notificationMaterial,
  isRenameModalOpen,
  closeRenameModal,
  renameFolder,
  isMoveFolderModalOpen,
  closeMoveFolderModal,
  moveFolder,
  handleFolderMove,
}: MaterialLibraryModalsProps) {
  return (
    <>
      {/* 資料詳細モーダル */}
      <MaterialModal
        material={selectedMaterial}
        isOpen={isModalOpen}
        onClose={closeMaterialModal}
        onBookmark={onBookmark}
        isBookmarked={isBookmarked}
        onCommentClick={selectedMaterial && onCommentClick ? (materialId) => onCommentClick(selectedMaterial!) : undefined}
        creatorCache={creatorCache}
        onCreatorCacheUpdate={setCreatorCache}
      />

      {/* フォルダプロパティモーダル */}
      <FolderPropertiesModal
        isOpen={isPropertiesModalOpen}
        onClose={closeFolderPropertiesModal}
        folder={selectedFolder}
      />

      {/* 資料編集モーダル */}
      <MaterialCreationModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSuccess={closeEditModal}
        categories={categories as any}
        editMaterial={editMaterial}
        initialFolderPath={editMaterial?.folder_path || currentPath || undefined}
      />

      {/* 資料移動モーダル */}
      <MaterialMoveModal
        isOpen={isMoveModalOpen}
        onClose={closeMoveModal}
        material={moveMaterial}
        currentFolderPath={moveMaterial?.folder_path || ''}
        onMove={async (materialId, targetFolderPath) => {
          await handleMove(materialId, targetFolderPath);
          showToast('資料を移動しました');
        }}
      />

      {/* ファイル情報モーダル */}
      <MaterialInfoModal
        isOpen={isInfoModalOpen}
        onClose={closeInfoModal}
        material={infoMaterial}
      />

      {/* 通知送信モーダル */}
      <NotificationSendModal
        isOpen={isNotificationSendModalOpen}
        onClose={closeNotificationSendModal}
        material={notificationMaterial}
        onSuccess={() => {
          showToast('通知を送信しました');
        }}
      />

      {/* フォルダ名変更モーダル */}
      <FolderRenameModal
        isOpen={isRenameModalOpen}
        onClose={closeRenameModal}
        onSuccess={closeRenameModal}
        folder={renameFolder}
      />

      {/* フォルダ移動モーダル */}
      <FolderMoveModal
        isOpen={isMoveFolderModalOpen}
        onClose={closeMoveFolderModal}
        folder={moveFolder}
        onMove={handleFolderMove}
        currentParentId={moveFolder?.parent_id || ''}
      />
    </>
  );
}


