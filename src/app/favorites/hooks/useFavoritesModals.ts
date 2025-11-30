// お気に入りページのモーダル管理フック

import { useState, useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';

export function useFavoritesModals() {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [commentMaterial, setCommentMaterial] = useState<MaterialNormalized | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<MaterialNormalized | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notificationMaterial, setNotificationMaterial] = useState<MaterialNormalized | null>(null);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [infoMaterial, setInfoMaterial] = useState<MaterialNormalized | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const openMaterialModal = useCallback((material: MaterialNormalized) => {
    setSelectedMaterial(material);
    setIsMaterialModalOpen(true);
  }, []);

  const closeMaterialModal = useCallback(() => {
    setIsMaterialModalOpen(false);
    setSelectedMaterial(null);
  }, []);

  const openCommentModal = useCallback((material: MaterialNormalized) => {
    setCommentMaterial(material);
    setIsCommentModalOpen(true);
  }, []);

  const closeCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
    setCommentMaterial(null);
  }, []);

  const openEditModal = useCallback((material: MaterialNormalized) => {
    setEditMaterial(material);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditMaterial(null);
  }, []);

  const openNotificationModal = useCallback((material: MaterialNormalized) => {
    setNotificationMaterial(material);
    setIsNotificationModalOpen(true);
  }, []);

  const closeNotificationModal = useCallback(() => {
    setIsNotificationModalOpen(false);
    setNotificationMaterial(null);
  }, []);

  const openInfoModal = useCallback((material: MaterialNormalized) => {
    setInfoMaterial(material);
    setIsInfoModalOpen(true);
  }, []);

  const closeInfoModal = useCallback(() => {
    setIsInfoModalOpen(false);
    setInfoMaterial(null);
  }, []);

  return {
    // MaterialModal
    selectedMaterial,
    isMaterialModalOpen,
    openMaterialModal,
    closeMaterialModal,
    // CommentModal
    commentMaterial,
    isCommentModalOpen,
    openCommentModal,
    closeCommentModal,
    // EditModal
    editMaterial,
    isEditModalOpen,
    openEditModal,
    closeEditModal,
    // NotificationModal
    notificationMaterial,
    isNotificationModalOpen,
    openNotificationModal,
    closeNotificationModal,
    // InfoModal
    infoMaterial,
    isInfoModalOpen,
    openInfoModal,
    closeInfoModal,
  };
}
