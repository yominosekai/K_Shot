// 資料検索のモーダル管理フック

import { useState, useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';

/**
 * 資料の詳細情報を取得（共通関数）
 */
async function fetchMaterialDetail(materialId: string): Promise<MaterialNormalized | null> {
  try {
    const response = await fetch(`/api/materials/${materialId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.material) {
        return data.material;
      }
    }
  } catch (err) {
    console.error('資料詳細取得エラー:', err);
  }
  return null;
}

export function useMaterialsSearchModals() {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveMaterial, setMoveMaterial] = useState<MaterialNormalized | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoMaterial, setInfoMaterial] = useState<MaterialNormalized | null>(null);
  const [isNotificationSendModalOpen, setIsNotificationSendModalOpen] = useState(false);
  const [notificationMaterial, setNotificationMaterial] = useState<MaterialNormalized | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialNormalized | null>(null);

  const openMoveModal = useCallback(async (material: MaterialNormalized) => {
    // 詳細情報を取得してから移動モーダルを開く
    const detail = await fetchMaterialDetail(material.id);
    setMoveMaterial(detail || material);
    setIsMoveModalOpen(true);
  }, []);

  const openInfoModal = useCallback(async (material: MaterialNormalized) => {
    // 詳細情報を取得してからファイル情報モーダルを開く
    const detail = await fetchMaterialDetail(material.id);
    if (detail) {
      // 既存のmaterialオブジェクトの統計情報（views, likes）を保持
      setInfoMaterial({
        ...detail,
        views: material.views ?? detail.views ?? 0,
        likes: material.likes ?? detail.likes ?? 0,
      });
    } else {
      setInfoMaterial(material);
    }
    setIsInfoModalOpen(true);
  }, []);

  const openNotificationModal = useCallback((material: MaterialNormalized) => {
    setNotificationMaterial(material);
    setIsNotificationSendModalOpen(true);
  }, []);

  const closeMoveModal = useCallback(() => {
    setIsMoveModalOpen(false);
    setMoveMaterial(null);
  }, []);

  const closeInfoModal = useCallback(() => {
    setIsInfoModalOpen(false);
    setInfoMaterial(null);
  }, []);

  const closeNotificationModal = useCallback(() => {
    setIsNotificationSendModalOpen(false);
    setNotificationMaterial(null);
  }, []);

  const openEditModal = useCallback(async (material: MaterialNormalized) => {
    // 詳細情報（document、attachments）を取得
    const detail = await fetchMaterialDetail(material.id);
    setEditMaterial(detail || material);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditMaterial(null);
  }, []);

  return {
    isMoveModalOpen,
    moveMaterial,
    isInfoModalOpen,
    infoMaterial,
    isNotificationSendModalOpen,
    notificationMaterial,
    isEditModalOpen,
    editMaterial,
    openMoveModal,
    openInfoModal,
    openNotificationModal,
    openEditModal,
    closeMoveModal,
    closeInfoModal,
    closeNotificationModal,
    closeEditModal,
  };
}


