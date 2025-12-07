// スキルマップ選択モーダルコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { X, Check, Search, Maximize2, Minimize2 } from 'lucide-react';
import type { SkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';

interface SkillMappingSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialTitle: string;
  onLinkToggle: (skillPhaseItemId: number, linked: boolean) => void;
}

export default function SkillMappingSelectionModal({
  isOpen,
  onClose,
  materialId,
  materialTitle,
  onLinkToggle,
}: SkillMappingSelectionModalProps) {
  const [items, setItems] = useState<SkillPhaseItem[]>([]);
  const [linkedItemIds, setLinkedItemIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);

  // スキルマップと関連付け情報を取得
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // スキルマップを取得
        const itemsResponse = await fetch('/api/skill-mapping/items');
        if (!itemsResponse.ok) {
          throw new Error('スキルマップの取得に失敗しました');
        }
        const itemsData = await itemsResponse.json();
        if (!itemsData.success) {
          throw new Error(itemsData.error || 'スキルマップの取得に失敗しました');
        }

        // 関連付け情報を取得
        const skillsResponse = await fetch(`/api/materials/${materialId}/skills`);
        if (!skillsResponse.ok) {
          throw new Error('関連付け情報の取得に失敗しました');
        }
        const skillsData = await skillsResponse.json();
        if (!skillsData.success) {
          throw new Error(skillsData.error || '関連付け情報の取得に失敗しました');
        }

        setItems(itemsData.items || []);
        const linkedIds = new Set<number>((skillsData.skillPhaseItems || []).map((item: SkillPhaseItem) => item.id));
        setLinkedItemIds(linkedIds);
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, materialId]);

  // モーダルが閉じられたら最大化状態をリセット
  useEffect(() => {
    if (!isOpen) {
      setIsMaximized(false);
    }
  }, [isOpen]);

  // スキル項目のクリック処理（関連付けのトグル）
  const handleItemClick = async (itemId: number) => {
    try {
      const response = await fetch(`/api/materials/${materialId}/skills/${itemId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '関連付けの更新に失敗しました');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '関連付けの更新に失敗しました');
      }

      // ローカル状態を更新
      setLinkedItemIds((prev) => {
        const newSet = new Set(prev);
        if (data.linked) {
          newSet.add(itemId);
        } else {
          newSet.delete(itemId);
        }
        return newSet;
      });

      onLinkToggle(itemId, data.linked);
    } catch (err) {
      console.error('関連付け更新エラー:', err);
      alert(err instanceof Error ? err.message : '関連付けの更新に失敗しました');
    }
  };


  // 検索でフィルタリング
  const filteredItems = items.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.category.toLowerCase().includes(term) ||
      item.item.toLowerCase().includes(term) ||
      item.name.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term)
    );
  });

  // データをカテゴリ・項目・フェーズでグループ化（SkillMappingViewと同じ形式）
  const groupedData = filteredItems.reduce((acc, item) => {
    const key = `${item.category}|${item.item}`;
    if (!acc[key]) {
      acc[key] = {
        category: item.category,
        item: item.item,
        subCategory: item.subCategory,
        phases: {} as Record<number, SkillPhaseItem[]>,
      };
    }
    if (!acc[key].phases[item.phase]) {
      acc[key].phases[item.phase] = [];
    }
    acc[key].phases[item.phase].push(item);
    return acc;
  }, {} as Record<string, {
    category: string;
    item: string;
    subCategory: string;
    phases: Record<number, SkillPhaseItem[]>;
  }>);

  const groupedArray = Object.values(groupedData);

  if (!isOpen) return null;

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
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">スキルマップに関連付け</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{materialTitle}</p>
          </div>
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

        {/* 検索バー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="スキル項目を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 dark:text-red-400">{error}</p>
            </div>
          ) : groupedArray.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">スキル項目が見つかりませんでした</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-left">
                        大分類
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-left">
                        項目
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-left">
                        中分類
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                        フェーズ1
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                        フェーズ2
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                        フェーズ3
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                        フェーズ4
                      </th>
                      <th className="border border-gray-300 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700 text-center">
                        フェーズ5
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedArray.map((group, groupIndex) => (
                      <tr key={`${group.category}-${group.item}-${groupIndex}`}>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          {group.category}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          {group.item}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2">
                          {group.subCategory}
                        </td>
                        {[1, 2, 3, 4, 5].map((phase) => {
                          const phaseItems = group.phases[phase] || [];
                          if (phaseItems.length === 0) {
                            return (
                              <td
                                key={phase}
                                className="border border-gray-300 dark:border-gray-600 p-2"
                              />
                            );
                          }

                          return (
                            <td
                              key={phase}
                              className="border border-gray-300 dark:border-gray-600 p-2"
                            >
                              {phaseItems.map((item) => {
                                const isLinked = linkedItemIds.has(item.id);
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item.id)}
                                    className={`mb-1 last:mb-0 p-2 rounded transition-colors cursor-pointer hover:opacity-80 relative ${
                                      isLinked
                                        ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-400'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500'
                                    }`}
                                    title={`${item.name}${isLinked ? ' (関連付け済み - クリックで解除)' : ' (クリックで関連付け)'}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                          {item.name}
                                        </div>
                                        {item.description && (
                                          <div className="text-xs mt-1 opacity-75 text-gray-600 dark:text-gray-400 line-clamp-2">
                                            {item.description}
                                          </div>
                                        )}
                                      </div>
                                      {isLinked && (
                                        <Check className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

