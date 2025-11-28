// ホームページのモーダル管理フック

'use client';

import { useState, useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/contexts/SearchContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

export function useHomePageModals() {
  const { user } = useAuth();
  const { setSearchValueAndFocus } = useSearch();
  const confirmDialog = useConfirmDialog();
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  // 資料を開く
  const handleMaterialClick = useCallback(async (materialId: string, materialTitle?: string) => {
    try {
      const promptMessage =
        '資料が見つかりません、削除されたか移動された可能性があります。\n\n「検索しますか？」に対して「はい」を選択すると、ヘッダーの検索欄に検索キーワードが設定され、検索画面にフォーカスが移動します。';
      const response = await fetch(`/api/materials/${materialId}${user?.sid ? `?user_sid=${user.sid}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.material) {
          setSelectedMaterial(data.material);
          setIsMaterialModalOpen(true);
        } else {
          const shouldSearch = await confirmDialog({
            title: '資料が見つかりません',
            message: promptMessage,
            confirmText: '検索する',
            cancelText: '閉じる',
          });
          if (shouldSearch && materialTitle && setSearchValueAndFocus) {
            // ヘッダーの検索欄に値を設定してフォーカス
            setSearchValueAndFocus(materialTitle);
          }
        }
      } else if (response.status === 404) {
        const shouldSearch = await confirmDialog({
          title: '資料が見つかりません',
          message: promptMessage,
          confirmText: '検索する',
          cancelText: '閉じる',
        });
        if (shouldSearch && materialTitle && setSearchValueAndFocus) {
          // ヘッダーの検索欄に値を設定してフォーカス
          setSearchValueAndFocus(materialTitle);
        }
      }
    } catch (err) {
      console.error('資料詳細取得エラー:', err);
    }
  }, [user?.sid, setSearchValueAndFocus, confirmDialog]);

  const closeModal = useCallback(() => {
    setIsMaterialModalOpen(false);
    setSelectedMaterial(null);
  }, []);

  return {
    selectedMaterial,
    isMaterialModalOpen,
    handleMaterialClick,
    closeModal,
  };
}

