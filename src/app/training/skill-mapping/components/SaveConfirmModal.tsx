// 保存確認モーダル

'use client';

import React, { useState } from 'react';
import type { SkillPhaseItem } from './types';
import type { ComparisonResult } from './utils/compareData';

interface SaveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  originalData: SkillPhaseItem[];
  editedData: SkillPhaseItem[];
  validationErrors: string[];
  comparisonResult: ComparisonResult | null;
  isSaving: boolean;
}

export default function SaveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  originalData,
  editedData,
  validationErrors,
  comparisonResult,
  isSaving
}: SaveConfirmModalProps) {
  const [showNewItems, setShowNewItems] = useState(false);
  const [showSimilarItems, setShowSimilarItems] = useState(false);

  if (!isOpen) return null;

  // 新規項目・類似項目の有無をチェック
  const hasNewItems = comparisonResult && (
    comparisonResult.newItems.categories.length > 0 ||
    comparisonResult.newItems.items.length > 0 ||
    comparisonResult.newItems.subCategories.length > 0 ||
    comparisonResult.newItems.smallCategories.length > 0
  );

  const hasSimilarItems = comparisonResult && (
    comparisonResult.similarItems.categories.length > 0 ||
    comparisonResult.similarItems.items.length > 0 ||
    comparisonResult.similarItems.subCategories.length > 0 ||
    comparisonResult.similarItems.smallCategories.length > 0
  );

  // 変更内容を計算
  const getItemKey = (item: SkillPhaseItem) => 
    `${item.category}|${item.item}|${item.subCategory}|${item.smallCategory}|${item.phase}|${item.name}`;

  const originalMap = new Map<string, SkillPhaseItem>();
  originalData.forEach(item => originalMap.set(getItemKey(item), item));

  const editedMap = new Map<string, SkillPhaseItem>();
  editedData.forEach(item => editedMap.set(getItemKey(item), item));

  const added: SkillPhaseItem[] = [];
  const deleted: SkillPhaseItem[] = [];
  const changed: { old: SkillPhaseItem; new: SkillPhaseItem }[] = [];

  // 追加された項目
  editedData.forEach(newItem => {
    const key = getItemKey(newItem);
    if (!originalMap.has(key)) {
      added.push(newItem);
    } else {
      const oldItem = originalMap.get(key)!;
      // descriptionやdisplayOrderの変更を検出
      if (oldItem.description !== newItem.description || 
          oldItem.displayOrder !== newItem.displayOrder) {
        changed.push({ old: oldItem, new: newItem });
      }
    }
  });

  // 削除された項目
  originalData.forEach(oldItem => {
    const key = getItemKey(oldItem);
    if (!editedMap.has(key)) {
      deleted.push(oldItem);
    }
  });

  const hasErrors = validationErrors.length > 0;
  const hasChanges = added.length > 0 || deleted.length > 0 || changed.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">保存内容の確認</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
            disabled={isSaving}
          >
            ×
          </button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto">
          {/* エラー表示 */}
          {hasErrors && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-700">
              <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-3">エラー</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                エラーが{validationErrors.length}件あります。先にエラーを修正してください。
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-y-auto">
                {validationErrors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
                {validationErrors.length > 10 && (
                  <li>...他{validationErrors.length - 10}件のエラー</li>
                )}
              </ul>
            </div>
          )}

          {/* 変更サマリー */}
          {!hasErrors && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
              <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-3">変更内容のサマリー</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <div><strong>追加される項目:</strong> <span className="text-green-600 dark:text-green-400 font-semibold">{added.length}</span> 件</div>
                <div><strong>削除される項目:</strong> <span className="text-red-600 dark:text-red-400 font-semibold">{deleted.length}</span> 件</div>
                <div><strong>変更される項目:</strong> <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{changed.length}</span> 件</div>
                <div><strong>合計データ数:</strong> <span className="font-semibold">{editedData.length}</span> 件</div>
              </div>
            </div>
          )}

          {/* 変更がない場合 */}
          {!hasErrors && !hasChanges && !hasNewItems && !hasSimilarItems && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-gray-700 dark:text-gray-300">変更はありません。</p>
            </div>
          )}

          {/* 新規項目・類似項目の表示 */}
          {!hasErrors && comparisonResult && (hasNewItems || hasSimilarItems) && (
            <div className="mb-6">
              {hasNewItems && (
                <div className="mb-4">
                  <button 
                    onClick={() => setShowNewItems(!showNewItems)} 
                    className="w-full text-left p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-semibold rounded-md flex justify-between items-center hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  >
                    <span>新規追加される項目 ({comparisonResult.newItems.categories.length + comparisonResult.newItems.items.length + comparisonResult.newItems.subCategories.length + comparisonResult.newItems.smallCategories.length}件)</span>
                    <span>{showNewItems ? '▲' : '▼'}</span>
                  </button>
                  {showNewItems && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md">
                      {comparisonResult.newItems.categories.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">大分類:</h4>
                          <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-300 space-y-1">
                            {comparisonResult.newItems.categories.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparisonResult.newItems.items.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">項目:</h4>
                          <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-300 space-y-1">
                            {comparisonResult.newItems.items.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparisonResult.newItems.subCategories.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">中分類:</h4>
                          <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-300 space-y-1">
                            {comparisonResult.newItems.subCategories.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparisonResult.newItems.smallCategories.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">小分類:</h4>
                          <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-300 space-y-1">
                            {comparisonResult.newItems.smallCategories.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {hasSimilarItems && (
                <div className="mb-4">
                  <button 
                    onClick={() => setShowSimilarItems(!showSimilarItems)} 
                    className="w-full text-left p-3 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 font-semibold rounded-md flex justify-between items-center hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                  >
                    <span>類似する既存項目 ({comparisonResult.similarItems.categories.length + comparisonResult.similarItems.items.length + comparisonResult.similarItems.subCategories.length + comparisonResult.similarItems.smallCategories.length}件)</span>
                    <span>{showSimilarItems ? '▲' : '▼'}</span>
                  </button>
                  {showSimilarItems && (
                    <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-md">
                      {comparisonResult.similarItems.categories.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">大分類:</h4>
                          <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 space-y-1">
                            {comparisonResult.similarItems.categories.map((item, idx) => (
                              <li key={idx}>
                                {item.new} (類似: {item.existing} - {Math.round(item.similarity * 100)}%)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparisonResult.similarItems.items.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">項目:</h4>
                          <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 space-y-1">
                            {comparisonResult.similarItems.items.map((item, idx) => (
                              <li key={idx}>
                                {item.new} (類似: {item.existing} - {Math.round(item.similarity * 100)}%)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparisonResult.similarItems.subCategories.length > 0 && (
                        <div className="mb-3">
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">中分類:</h4>
                          <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 space-y-1">
                            {comparisonResult.similarItems.subCategories.map((item, idx) => (
                              <li key={idx}>
                                {item.new} (類似: {item.existing} - {Math.round(item.similarity * 100)}%)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {comparisonResult.similarItems.smallCategories.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">小分類:</h4>
                          <ul className="list-disc list-inside text-sm text-orange-700 dark:text-orange-300 space-y-1">
                            {comparisonResult.similarItems.smallCategories.map((item, idx) => (
                              <li key={idx}>
                                {item.new} (類似: {item.existing} - {Math.round(item.similarity * 100)}%)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 z-10">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
            disabled={isSaving}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 rounded transition-colors ${
              hasErrors 
                ? 'bg-red-500 text-white cursor-not-allowed opacity-50' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            disabled={isSaving || hasErrors}
          >
            {isSaving ? '同期中...' : '同期を開始'}
          </button>
        </div>
      </div>
    </div>
  );
}

