// スキルマッピングモーダルコンポーネント（最大化機能付き）

'use client';

import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import SkillMappingView from './SkillMappingView';

interface SkillMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function SkillMappingModal({
  isOpen,
  onClose,
  userId,
}: SkillMappingModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // モーダルが閉じられたら最大化状態をリセット
  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
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
      onClick={onClose}
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
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto">
          <SkillMappingView userId={userId} />
        </div>
      </div>
    </div>
  );
}

