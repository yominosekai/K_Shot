// 資料フォームのバリデーションフック

import type { MaterialFormData } from './useMaterialFormState';

interface UseMaterialFormValidationProps {
  formData: MaterialFormData;
  onError: (message: string) => void;
}

export function useMaterialFormValidation({
  formData,
  onError,
}: UseMaterialFormValidationProps) {
  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      onError('タイトルを入力してください');
      return false;
    }
    if (!formData.description.trim()) {
      onError('説明を入力してください');
      return false;
    }
    if (!formData.category_id) {
      onError('カテゴリを選択してください');
      return false;
    }
    if (!formData.type) {
      onError('タイプを選択してください');
      return false;
    }
    if (!formData.difficulty) {
      onError('難易度を選択してください');
      return false;
    }
    return true;
  };

  return {
    validateForm,
  };
}

