// 資料関連モーダルの管理フック

import { useState, useCallback } from 'react';
import { useFolders } from '@/contexts/FoldersContext';
import type { MaterialNormalized, FolderNormalized } from '@/features/materials/types';

interface UseMaterialModalsProps {
  onRefresh?: () => void;
  currentPath: string;
  showToast?: (message: string) => void;
}

export function useMaterialModals({ onRefresh, currentPath, showToast }: UseMaterialModalsProps) {
  const { invalidateCache: invalidateFoldersCache } = useFolders();
  // 資料詳細モーダル
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // フォルダプロパティモーダル
  const [selectedFolder, setSelectedFolder] = useState<FolderNormalized | null>(null);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);

  // 資料編集モーダル
  const [editMaterial, setEditMaterial] = useState<MaterialNormalized | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 資料移動モーダル
  const [moveMaterial, setMoveMaterial] = useState<MaterialNormalized | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  // ファイル情報モーダル
  const [infoMaterial, setInfoMaterial] = useState<MaterialNormalized | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // 通知送信モーダル
  const [notificationMaterial, setNotificationMaterial] = useState<MaterialNormalized | null>(null);
  const [isNotificationSendModalOpen, setIsNotificationSendModalOpen] = useState(false);

  // 資料詳細モーダル
  const openMaterialModal = useCallback((material: MaterialNormalized) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  }, []);

  const closeMaterialModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedMaterial(null);
  }, []);

  // フォルダプロパティモーダル
  const openFolderPropertiesModal = useCallback((folder: FolderNormalized) => {
    setSelectedFolder(folder);
    setIsPropertiesModalOpen(true);
  }, []);

  const closeFolderPropertiesModal = useCallback(() => {
    setIsPropertiesModalOpen(false);
    setSelectedFolder(null);
  }, []);

  // 資料編集モーダル
  const openEditModal = useCallback(async (material: MaterialNormalized) => {
    // 詳細情報（document、attachments）を取得
    try {
      const response = await fetch(`/api/materials/${material.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.material) {
          setEditMaterial(data.material);
          setIsEditModalOpen(true);
          return;
        }
      }
      // 詳細取得に失敗した場合は基本情報のみで編集
      setEditMaterial(material);
      setIsEditModalOpen(true);
    } catch (err) {
      console.error('資料詳細取得エラー:', err);
      // エラーが発生した場合は基本情報のみで編集
      setEditMaterial(material);
      setIsEditModalOpen(true);
    }
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditMaterial(null);
  }, []);

  const closeEditModalWithRefresh = useCallback(() => {
    setIsEditModalOpen(false);
    setEditMaterial(null);
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  // 資料移動モーダル
  const openMoveModal = useCallback(async (material: MaterialNormalized) => {
    // 詳細情報を取得してから移動モーダルを開く
    try {
      const response = await fetch(`/api/materials/${material.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.material) {
          setMoveMaterial(data.material);
          setIsMoveModalOpen(true);
          return;
        }
      }
      setMoveMaterial(material);
      setIsMoveModalOpen(true);
    } catch (err) {
      console.error('資料詳細取得エラー:', err);
      setMoveMaterial(material);
      setIsMoveModalOpen(true);
    }
  }, []);

  const closeMoveModal = useCallback(() => {
    setIsMoveModalOpen(false);
    setMoveMaterial(null);
  }, []);

  // ファイル情報モーダル
  const openInfoModal = useCallback(async (material: MaterialNormalized) => {
    // 詳細情報を取得してからファイル情報モーダルを開く
    try {
      const response = await fetch(`/api/materials/${material.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.material) {
          // 既存のmaterialオブジェクトの統計情報（bookmark_count, views, likes）を保持
          setInfoMaterial({
            ...data.material,
            bookmark_count: material.bookmark_count ?? data.material.bookmark_count ?? 0,
            views: material.views ?? data.material.views ?? 0,
            likes: material.likes ?? data.material.likes ?? 0,
          });
          setIsInfoModalOpen(true);
          return;
        }
      }
      setInfoMaterial(material);
      setIsInfoModalOpen(true);
    } catch (err) {
      console.error('資料詳細取得エラー:', err);
      setInfoMaterial(material);
      setIsInfoModalOpen(true);
    }
  }, []);

  const closeInfoModal = useCallback(() => {
    setIsInfoModalOpen(false);
    setInfoMaterial(null);
  }, []);

  // 通知送信モーダル
  const openNotificationSendModal = useCallback((material: MaterialNormalized) => {
    setNotificationMaterial(material);
    setIsNotificationSendModalOpen(true);
  }, []);

  const closeNotificationSendModal = useCallback(() => {
    setIsNotificationSendModalOpen(false);
    setNotificationMaterial(null);
  }, []);

  // 移動処理
  const handleMove = useCallback(
    async (materialId: string, targetFolderPath: string) => {
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

      if (onRefresh) {
        onRefresh();
      }
    },
    [onRefresh]
  );

  // フォルダ名変更モーダル
  const [renameFolder, setRenameFolder] = useState<FolderNormalized | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  const openRenameModal = useCallback((folder: FolderNormalized) => {
    setRenameFolder(folder);
    setIsRenameModalOpen(true);
  }, []);

  const closeRenameModal = useCallback(() => {
    setIsRenameModalOpen(false);
    setRenameFolder(null);
    // キャッシュを無効化
    invalidateFoldersCache();
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh, invalidateFoldersCache]);

  // フォルダ移動モーダル
  const [moveFolder, setMoveFolder] = useState<FolderNormalized | null>(null);
  const [isMoveFolderModalOpen, setIsMoveFolderModalOpen] = useState(false);

  const openMoveFolderModal = useCallback((folder: FolderNormalized) => {
    setMoveFolder(folder);
    setIsMoveFolderModalOpen(true);
  }, []);

  const closeMoveFolderModal = useCallback(() => {
    setIsMoveFolderModalOpen(false);
    setMoveFolder(null);
  }, []);

  // フォルダ移動処理
  const handleFolderMove = useCallback(
    async (folderId: string, targetParentId: string) => {
      const response = await fetch(`/api/materials/folders/${folderId}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_parent_id: targetParentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '移動に失敗しました');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '移動に失敗しました');
      }

      // キャッシュを無効化
      invalidateFoldersCache();

      if (showToast) {
        showToast('フォルダを移動しました');
      }

      if (onRefresh) {
        onRefresh();
      }
    },
    [onRefresh, showToast, invalidateFoldersCache]
  );

  return {
    // 資料詳細モーダル
    selectedMaterial,
    isModalOpen,
    openMaterialModal,
    closeMaterialModal,
    // フォルダプロパティモーダル
    selectedFolder,
    isPropertiesModalOpen,
    openFolderPropertiesModal,
    closeFolderPropertiesModal,
    // 資料編集モーダル
    editMaterial,
    isEditModalOpen,
    openEditModal,
    closeEditModal,
    closeEditModalWithRefresh,
    // 資料移動モーダル
    moveMaterial,
    isMoveModalOpen,
    openMoveModal,
    closeMoveModal,
    handleMove,
    // ファイル情報モーダル
    infoMaterial,
    isInfoModalOpen,
    openInfoModal,
    closeInfoModal,
    // 通知送信モーダル
    notificationMaterial,
    isNotificationSendModalOpen,
    openNotificationSendModal,
    closeNotificationSendModal,
    // 現在のパス（編集モーダルで使用）
    currentPath: currentPath || '',
    // フォルダ名変更モーダル
    renameFolder,
    isRenameModalOpen,
    openRenameModal,
    closeRenameModal,
    // フォルダ移動モーダル
    moveFolder,
    isMoveFolderModalOpen,
    openMoveFolderModal,
    closeMoveFolderModal,
    handleFolderMove,
  };
}

