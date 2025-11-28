// 資料作成フォーム管理のカスタムフック

import type { CategoryNormalized, MaterialNormalized } from '@/features/materials/types';
import type { User } from '@/features/auth/types';
import { useMaterialFormState } from './useMaterialFormState';
import { useMaterialFormValidation } from './useMaterialFormValidation';
import { useMaterialFormSubmit } from './useMaterialFormSubmit';

interface UseMaterialFormProps {
  user: User | null;
  categories: CategoryNormalized[];
  initialFolderPath?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  editMaterial?: MaterialNormalized | null;
  isOpen?: boolean;
  getRevisionReason?: () => string;
}

export function useMaterialForm({
  user,
  categories,
  initialFolderPath = '',
  onSuccess,
  onError,
  editMaterial = null,
  isOpen = false,
  getRevisionReason,
}: UseMaterialFormProps) {
  // 状態管理
  const state = useMaterialFormState({
    editMaterial,
    initialFolderPath,
    isOpen,
  });

  // バリデーション
  const validation = useMaterialFormValidation({
    formData: state.formData,
    onError,
  });

  // 送信処理
  const submit = useMaterialFormSubmit({
    formData: state.formData,
    uploadedFiles: state.uploadedFiles,
    user,
    isEditMode: state.isEditMode,
    editMaterial,
    onSuccess,
    onError,
    resetForm: state.resetForm,
    getRevisionReason,
  });

  // 送信ハンドラー（バリデーションを含む）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.validateForm()) return;
    await submit.handleSubmit(e);
  };

  return {
    formData: state.formData,
    setFormData: state.setFormData,
    uploadedFiles: state.uploadedFiles,
    setUploadedFiles: state.setUploadedFiles,
    isUploading: submit.isUploading,
    uploadMessage: submit.uploadMessage,
    uploadProgress: submit.uploadProgress,
    folders: state.folders,
    handleInputChange: state.handleInputChange,
    handleSubmit,
    resetForm: state.resetForm,
    isEditMode: state.isEditMode,
  };
}

// 型エクスポート（後方互換性のため）
export type { MaterialFormData, UploadedFile } from './useMaterialFormState';

