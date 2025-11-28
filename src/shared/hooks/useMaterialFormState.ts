// 資料フォームの状態管理フック

import { useState, useEffect, useCallback } from 'react';
import type { CategoryNormalized, FolderNormalized, MaterialNormalized } from '@/features/materials/types';

export interface MaterialFormData {
  title: string;
  description: string;
  type: string;
  category_id: string;
  difficulty: string;
  estimated_hours: number;
  tags: string;
  content: string;
  folder_path: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
}

interface UseMaterialFormStateProps {
  editMaterial?: MaterialNormalized | null;
  initialFolderPath?: string;
  isOpen?: boolean;
}

export function useMaterialFormState({
  editMaterial = null,
  initialFolderPath = '',
  isOpen = false,
}: UseMaterialFormStateProps) {
  const isEditMode = !!editMaterial;
  
  const [formData, setFormData] = useState<MaterialFormData>(() => {
    if (editMaterial) {
      return {
        title: editMaterial.title || '',
        description: editMaterial.description || '',
        type: editMaterial.type || '',
        category_id: editMaterial.category_id || '',
        difficulty: editMaterial.difficulty || '',
        estimated_hours: editMaterial.estimated_hours || 1,
        tags: editMaterial.tags?.join(',') || '',
        content: editMaterial.document || '',
        folder_path: editMaterial.folder_path || initialFolderPath || '',
      };
    }
    return {
      title: '',
      description: '',
      type: '',
      category_id: '',
      difficulty: '',
      estimated_hours: 1,
      tags: '',
      content: '',
      folder_path: initialFolderPath || '',
    };
  });

  // 編集モードの場合、editMaterialが変更されたときにフォームデータを更新
  useEffect(() => {
    if (editMaterial) {
      setFormData({
        title: editMaterial.title || '',
        description: editMaterial.description || '',
        type: editMaterial.type || '',
        category_id: editMaterial.category_id || '',
        difficulty: editMaterial.difficulty || '',
        estimated_hours: editMaterial.estimated_hours || 1,
        tags: editMaterial.tags?.join(',') || '',
        content: editMaterial.document || '',
        folder_path: editMaterial.folder_path || initialFolderPath || '',
      });
    }
  }, [editMaterial, initialFolderPath]);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [folders, setFolders] = useState<FolderNormalized[]>([]);

  // フォルダ一覧を取得（モーダルが開かれたときに取得）
  useEffect(() => {
    if (isOpen) {
      const fetchFolders = async () => {
        try {
          const response = await fetch('/api/materials/folders?flat=true');
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setFolders(data.folders || []);
            }
          }
        } catch (err) {
          console.error('フォルダ取得エラー:', err);
        }
      };
      fetchFolders();
    }
  }, [isOpen]);

  // 編集モードの場合、既存の添付ファイルを読み込む
  useEffect(() => {
    if (editMaterial && editMaterial.attachments && editMaterial.attachments.length > 0) {
      // 既存の添付ファイルを表示用オブジェクトに変換
      const existingFiles: UploadedFile[] = editMaterial.attachments.map((att, index) => ({
        id: `existing-${att.filename}-${index}`,
        file: new File([], att.original_filename || att.filename, { type: att.type }),
        name: att.original_filename || att.filename,
        size: att.size,
        type: att.type,
        relativePath: att.relativePath,
      }));
      setUploadedFiles(existingFiles);
    } else if (!editMaterial) {
      // 新規作成モードの場合は空にする
      setUploadedFiles([]);
    }
  }, [editMaterial]);

  // フォームをリセット
  const resetForm = useCallback(() => {
    if (editMaterial) {
      setFormData({
        title: editMaterial.title || '',
        description: editMaterial.description || '',
        type: editMaterial.type || '',
        category_id: editMaterial.category_id || '',
        difficulty: editMaterial.difficulty || '',
        estimated_hours: editMaterial.estimated_hours || 1,
        tags: editMaterial.tags?.join(',') || '',
        content: editMaterial.document || '',
        folder_path: editMaterial.folder_path || initialFolderPath || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: '',
        category_id: '',
        difficulty: '',
        estimated_hours: 1,
        tags: '',
        content: '',
        folder_path: initialFolderPath || '',
      });
    }
    setUploadedFiles([]);
  }, [editMaterial, initialFolderPath]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return {
    formData,
    setFormData,
    uploadedFiles,
    setUploadedFiles,
    folders,
    isEditMode,
    handleInputChange,
    resetForm,
  };
}

