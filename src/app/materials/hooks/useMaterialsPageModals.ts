// 資料ページのモーダル管理フック

import { useState, useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';

export function useMaterialsPageModals() {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentMaterial, setCommentMaterial] = useState<MaterialNormalized | null>(null);
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isFolderCreationModalOpen, setIsFolderCreationModalOpen] = useState(false);
  const [creationModalFolderPath, setCreationModalFolderPath] = useState<string>('');
  const [folderCreationModalPath, setFolderCreationModalPath] = useState<string>('');

  const openMaterialModal = useCallback((material: MaterialNormalized) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  }, []);

  const closeMaterialModal = useCallback(() => {
    setIsModalOpen(false);
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

  const openCreationModal = useCallback((folderPath: string = '') => {
    setCreationModalFolderPath(folderPath);
    setIsCreationModalOpen(true);
  }, []);

  const closeCreationModal = useCallback(() => {
    setIsCreationModalOpen(false);
    setCreationModalFolderPath('');
  }, []);

  const openFolderCreationModal = useCallback((currentPath: string = '') => {
    setFolderCreationModalPath(currentPath);
    setIsFolderCreationModalOpen(true);
  }, []);

  const closeFolderCreationModal = useCallback(() => {
    setIsFolderCreationModalOpen(false);
    setFolderCreationModalPath('');
  }, []);

  return {
    selectedMaterial,
    isModalOpen,
    openMaterialModal,
    closeMaterialModal,
    isCommentModalOpen,
    commentMaterial,
    openCommentModal,
    closeCommentModal,
    isCreationModalOpen,
    creationModalFolderPath,
    openCreationModal,
    closeCreationModal,
    isFolderCreationModalOpen,
    folderCreationModalPath,
    openFolderCreationModal,
    closeFolderCreationModal,
  };
}

