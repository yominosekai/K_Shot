// 新規追加項目表示モーダル（表記ゆれ検出）

'use client';

import type { ComparisonResult } from './utils/compareData';

interface NewItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparisonResult: ComparisonResult | null;
}

export default function NewItemsModal({ isOpen, onClose, comparisonResult }: NewItemsModalProps) {
  if (!isOpen || !comparisonResult) return null;

  const hasNewItems = 
    comparisonResult.newItems.categories.length > 0 ||
    comparisonResult.newItems.items.length > 0 ||
    comparisonResult.newItems.subCategories.length > 0 ||
    comparisonResult.newItems.smallCategories.length > 0;

  const hasSimilarItems = 
    comparisonResult.similarItems.categories.length > 0 ||
    comparisonResult.similarItems.items.length > 0 ||
    comparisonResult.similarItems.subCategories.length > 0 ||
    comparisonResult.similarItems.smallCategories.length > 0;

  if (!hasNewItems && !hasSimilarItems) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">新規追加項目の確認</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 space-y-6 flex-grow overflow-y-auto">
          {/* 新規追加項目 */}
          {hasNewItems && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b-2 border-blue-500 dark:border-blue-400 pb-2">
                新規追加される項目
              </h3>
              
              {comparisonResult.newItems.categories.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">大分類 ({comparisonResult.newItems.categories.length}件)</h4>
                  <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded">
                    <ul className="list-disc list-inside space-y-1">
                      {comparisonResult.newItems.categories.map((cat, idx) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{cat}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {comparisonResult.newItems.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">項目 ({comparisonResult.newItems.items.length}件)</h4>
                  <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded">
                    <ul className="list-disc list-inside space-y-1">
                      {comparisonResult.newItems.items.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {comparisonResult.newItems.subCategories.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">中分類 ({comparisonResult.newItems.subCategories.length}件)</h4>
                  <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded">
                    <ul className="list-disc list-inside space-y-1">
                      {comparisonResult.newItems.subCategories.map((sub, idx) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{sub}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {comparisonResult.newItems.smallCategories.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">小分類 ({comparisonResult.newItems.smallCategories.length}件)</h4>
                  <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded">
                    <ul className="list-disc list-inside space-y-1">
                      {comparisonResult.newItems.smallCategories.map((small, idx) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{small}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 類似項目（文字揺れの可能性） */}
          {hasSimilarItems && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-3 border-b-2 border-yellow-500 dark:border-yellow-400 pb-2">
                ⚠ 文字揺れの可能性がある項目
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                以下の項目は、既存の項目と似ているため、文字揺れの可能性があります。確認してください。
              </p>
              
              {comparisonResult.similarItems.categories.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">大分類 ({comparisonResult.similarItems.categories.length}件)</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded">
                    <div className="space-y-2">
                      {comparisonResult.similarItems.categories.map((item, idx) => (
                        <div key={idx} className="text-sm border-b border-yellow-200 dark:border-yellow-700 pb-2">
                          <span className="font-semibold text-yellow-800 dark:text-yellow-300">新規: </span>
                          <span className="text-yellow-700 dark:text-yellow-400">{item.new}</span>
                          <span className="mx-2">→</span>
                          <span className="font-semibold text-gray-600 dark:text-gray-400">既存: </span>
                          <span className="text-gray-700 dark:text-gray-300">{item.existing}</span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(類似度: {Math.round(item.similarity * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {comparisonResult.similarItems.items.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">項目 ({comparisonResult.similarItems.items.length}件)</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded">
                    <div className="space-y-2">
                      {comparisonResult.similarItems.items.map((item, idx) => (
                        <div key={idx} className="text-sm border-b border-yellow-200 dark:border-yellow-700 pb-2">
                          <span className="font-semibold text-yellow-800 dark:text-yellow-300">新規: </span>
                          <span className="text-yellow-700 dark:text-yellow-400">{item.new}</span>
                          <span className="mx-2">→</span>
                          <span className="font-semibold text-gray-600 dark:text-gray-400">既存: </span>
                          <span className="text-gray-700 dark:text-gray-300">{item.existing}</span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(類似度: {Math.round(item.similarity * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {comparisonResult.similarItems.subCategories.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">中分類 ({comparisonResult.similarItems.subCategories.length}件)</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded">
                    <div className="space-y-2">
                      {comparisonResult.similarItems.subCategories.map((item, idx) => (
                        <div key={idx} className="text-sm border-b border-yellow-200 dark:border-yellow-700 pb-2">
                          <span className="font-semibold text-yellow-800 dark:text-yellow-300">新規: </span>
                          <span className="text-yellow-700 dark:text-yellow-400">{item.new}</span>
                          <span className="mx-2">→</span>
                          <span className="font-semibold text-gray-600 dark:text-gray-400">既存: </span>
                          <span className="text-gray-700 dark:text-gray-300">{item.existing}</span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(類似度: {Math.round(item.similarity * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {comparisonResult.similarItems.smallCategories.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2">小分類 ({comparisonResult.similarItems.smallCategories.length}件)</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded">
                    <div className="space-y-2">
                      {comparisonResult.similarItems.smallCategories.map((item, idx) => (
                        <div key={idx} className="text-sm border-b border-yellow-200 dark:border-yellow-700 pb-2">
                          <span className="font-semibold text-yellow-800 dark:text-yellow-300">新規: </span>
                          <span className="text-yellow-700 dark:text-yellow-400">{item.new}</span>
                          <span className="mx-2">→</span>
                          <span className="font-semibold text-gray-600 dark:text-gray-400">既存: </span>
                          <span className="text-gray-700 dark:text-gray-300">{item.existing}</span>
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(類似度: {Math.round(item.similarity * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end z-10">
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

