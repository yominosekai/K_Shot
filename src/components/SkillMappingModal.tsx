// スキルマッピングモーダルコンポーネント（最大化機能付き）

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import SkillMappingView from './SkillMappingView';
import MaterialModal from './MaterialModal';
import type { MaterialNormalized } from '@/features/materials/types';

interface SkillMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  readOnly?: boolean; // 読み取り専用モード（進捗編集の制御）
  allowUnlink?: boolean; // 関連付け解除を許可するか（プロフィールページではfalse、管理ページではtrue）
}

export default function SkillMappingModal({
  isOpen,
  onClose,
  userId,
  readOnly = false,
  allowUnlink = true,
}: SkillMappingModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const confirmDialog = useConfirmDialog();

  // 閉じる処理（変更がある場合は確認）
  const handleClose = useCallback(async () => {
    if (hasChanges) {
      const confirmed = await confirmDialog({
        title: '変更が保存されていません',
        message: '編集中の変更が保存されていません。閉じてもよろしいですか？',
        confirmText: '閉じる',
        cancelText: 'キャンセル',
        variant: 'danger',
      });
      if (!confirmed) {
        return;
      }
    }
    onClose();
  }, [hasChanges, confirmDialog, onClose]);

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        await handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // モーダルが閉じられたら最大化状態と変更フラグをリセット
  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
      setHasChanges(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center ${
        isMaximized ? 'p-0' : 'p-4'
      } bg-black bg-opacity-50`}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col ${
          isMaximized
            ? 'w-full h-full rounded-none'
            : 'max-w-[95vw] w-full max-h-[90vh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            スキルマップ
          </h2>
          <div className="flex items-center space-x-2">
            {/* 最大化/最小化ボタン */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={isMaximized ? '最小化' : '最大化'}
            >
              {isMaximized ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
            {/* 閉じるボタン */}
            <button
              onClick={handleClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto">
          <SkillMappingView
            userId={userId}
            readOnly={readOnly}
            onHasChangesChange={setHasChanges}
            onMaterialClick={(material) => {
              setSelectedMaterial(material);
              setIsMaterialModalOpen(true);
            }}
            allowUnlink={allowUnlink}
          />
        </div>
      </div>

      {/* 資料詳細モーダル */}
      {selectedMaterial && (
        <MaterialModal
          material={selectedMaterial}
          isOpen={isMaterialModalOpen}
          onClose={() => {
            setIsMaterialModalOpen(false);
            setSelectedMaterial(null);
          }}
        />
      )}
    </div>
  );
}

