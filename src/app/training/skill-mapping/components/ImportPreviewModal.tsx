// インポートプレビューモーダル

'use client';

import { useState } from 'react';
import type { ComparisonResult } from './utils/compareData';
import type { SkillPhaseItem } from './types';

interface ImportPreviewData {
  items: SkillPhaseItem[];
  errors?: string[];
  rowCount: number;
  errorCount: number;
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: ImportPreviewData | null;
  isExecuting: boolean;
}

export default function ImportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  isExecuting
}: ImportPreviewModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['errors', 'statistics']));

  if (!isOpen || !previewData) return null;

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const hasErrors = previewData.errors && previewData.errors.length > 0;
  const hasChanges = previewData.items.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">インポート確認</h2>
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold disabled:opacity-50"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 space-y-4 flex-1">
          {/* 統計情報 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">統計情報</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">総行数:</span>
                <span className="ml-2 font-semibold">{previewData.rowCount}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">有効行数:</span>
                <span className="ml-2 font-semibold text-green-600 dark:text-green-400">{previewData.items.length}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">エラー行数:</span>
                <span className="ml-2 font-semibold text-red-600 dark:text-red-400">{previewData.errorCount}</span>
              </div>
            </div>
          </div>

          {/* エラー */}
          {hasErrors && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <button
                onClick={() => toggleSection('errors')}
                className="w-full px-4 py-3 flex justify-between items-center text-left"
              >
                <h3 className="font-semibold text-red-800 dark:text-red-200">
                  ✗ エラー ({previewData.errors!.length}件)
                </h3>
                <span className="text-red-600 dark:text-red-400">
                  {expandedSections.has('errors') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('errors') && (
                <div className="px-4 pb-4">
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300 max-h-60 overflow-y-auto">
                    {previewData.errors!.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* プレビューデータ（最初の10件） */}
          {hasChanges && (
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
              <button
                onClick={() => toggleSection('preview')}
                className="w-full px-4 py-3 flex justify-between items-center text-left"
              >
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  プレビュー ({previewData.items.length}件)
                </h3>
                <span className="text-gray-600 dark:text-gray-400">
                  {expandedSections.has('preview') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('preview') && (
                <div className="px-4 pb-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-2 py-1 text-left">大分類</th>
                          <th className="px-2 py-1 text-left">項目</th>
                          <th className="px-2 py-1 text-left">中分類</th>
                          <th className="px-2 py-1 text-left">小分類</th>
                          <th className="px-2 py-1 text-center">フェーズ</th>
                          <th className="px-2 py-1 text-left">取り組み名</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.items.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-gray-600">
                            <td className="px-2 py-1">{item.category}</td>
                            <td className="px-2 py-1">{item.item}</td>
                            <td className="px-2 py-1">{item.subCategory}</td>
                            <td className="px-2 py-1">{item.smallCategory}</td>
                            <td className="px-2 py-1 text-center">{item.phase}</td>
                            <td className="px-2 py-1">{item.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.items.length > 10 && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        ...他 {previewData.items.length - 10} 件
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 変更がない場合 */}
          {!hasChanges && !hasErrors && (
            <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center text-gray-600 dark:text-gray-400">
              データに変更はありません。
            </div>
          )}
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={isExecuting || hasErrors}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? '実行中...' : 'インポート実行'}
          </button>
        </div>
      </div>
    </div>
  );
}

