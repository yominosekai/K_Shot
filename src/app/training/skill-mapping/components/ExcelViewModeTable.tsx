// エクセル形式表示モードテーブルコンポーネント

'use client';

import { useState, useEffect, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import type { SkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';
import { useAuth } from '@/contexts/AuthContext';
import { checkPermission } from '@/features/auth/utils';
import SkillRelatedMaterialsModal from '@/components/SkillRelatedMaterialsModal';
import type { MaterialNormalized } from '@/features/materials/types';

interface ExcelViewModeTableProps {
  data: SkillPhaseItem[];
  onMaterialClick?: (material: MaterialNormalized) => void;
  allowUnlink?: boolean;
  highlightedSkillIds?: Set<number>;
  onHighlightSkills?: (materialTitle: string) => void;
}

export default function ExcelViewModeTable({ data, onMaterialClick, allowUnlink = true, highlightedSkillIds = new Set(), onHighlightSkills }: ExcelViewModeTableProps) {
  const [linkedItemIds, setLinkedItemIds] = useState<Set<number>>(new Set());
  const [isRelatedMaterialsModalOpen, setIsRelatedMaterialsModalOpen] = useState(false);
  const [selectedSkillPhaseItem, setSelectedSkillPhaseItem] = useState<SkillPhaseItem | null>(null);
  const { user } = useAuth();
  const hasTrainingPermission = useMemo(() => checkPermission(user, 'training'), [user]);

  // 関連付け情報を取得
  useEffect(() => {
    if (!hasTrainingPermission || data.length === 0) {
      setLinkedItemIds(new Set());
      return;
    }

    const fetchLinkedItems = async () => {
      try {
        const skillPhaseItemIds = data.map((item) => item.id);
        const response = await fetch('/api/skill-mapping/items/materials/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ skillPhaseItemIds }),
        });

        if (!response.ok) {
          throw new Error('関連付け情報の取得に失敗しました');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || '関連付け情報の取得に失敗しました');
        }

        const linkedIds = new Set<number>((result.linkedItemIds || []).map((id: number) => id));
        setLinkedItemIds(linkedIds);
      } catch (err) {
        console.error('関連付け情報取得エラー:', err);
      }
    };

    fetchLinkedItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTrainingPermission, data.length]);
  // データを階層ごとにグループ化
  const grouped: Record<string, SkillPhaseItem[]> = {};
  data.forEach((row) => {
    const key = `${row.category}|${row.item}|${row.subCategory}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(row);
  });

  // 大分類ごとにグループ化
  const categoryGroups: Record<string, string[]> = {};
  Object.keys(grouped).forEach((key) => {
    const [category] = key.split('|');
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(key);
  });

  const rows: Array<{
    category: string | null;
    categoryRowspan: number;
    item: string | null;
    itemRowspan: number;
    subCategory: string;
    phase1: SkillPhaseItem[];
    phase2: SkillPhaseItem[];
    phase3: SkillPhaseItem[];
    phase4: SkillPhaseItem[];
    phase5: SkillPhaseItem[];
  }> = [];

  // displayOrderを取得するヘルパー関数
  const getDisplayOrder = (key: string): number => {
    return grouped[key]?.[0]?.displayOrder ?? 999999;
  };

  // 大分類の順序（displayOrderに基づいてソート）
  const categories = Object.keys(categoryGroups).sort((a, b) => {
    const firstKeyA = categoryGroups[a][0];
    const firstKeyB = categoryGroups[b][0];
    const aOrder = getDisplayOrder(firstKeyA);
    const bOrder = getDisplayOrder(firstKeyB);
    if (aOrder !== bOrder) return aOrder - bOrder;
    // displayOrderが同じ場合はアルファベット順
    return a.localeCompare(b);
  });

  categories.forEach((category) => {
    if (!categoryGroups[category]) return;

    // 項目ごとにグループ化（displayOrderに基づいてソート）
    const itemGroups: Record<string, string[]> = {};
    categoryGroups[category].forEach((key) => {
      const [, item] = key.split('|');
      if (!itemGroups[item]) {
        itemGroups[item] = [];
      }
      itemGroups[item].push(key);
    });
    
    // 各項目グループをdisplayOrderでソート
    const sortedItemKeys = Object.keys(itemGroups).sort((itemA, itemB) => {
      const keyA = itemGroups[itemA][0];
      const keyB = itemGroups[itemB][0];
      const itemAOrder = getDisplayOrder(keyA);
      const itemBOrder = getDisplayOrder(keyB);
      if (itemAOrder !== itemBOrder) return itemAOrder - itemBOrder;
      return itemA.localeCompare(itemB);
    });

    let categoryRowspan = 0;
    sortedItemKeys.forEach((item) => {
      let itemRowspan = 0;
      itemGroups[item].forEach((key) => {
        itemRowspan += 1; // 中分類ごとに1行
      });
      categoryRowspan += itemRowspan;
    });

    let categoryRowspanUsed = 0;
    sortedItemKeys.forEach((item, itemIdx) => {
      let itemRowspan = 0;
      // 中分類をdisplayOrderでソート
      const sortedSubCategoryKeys = itemGroups[item].sort((keyA, keyB) => {
        const orderA = getDisplayOrder(keyA);
        const orderB = getDisplayOrder(keyB);
        if (orderA !== orderB) return orderA - orderB;
        return keyA.localeCompare(keyB);
      });
      
      sortedSubCategoryKeys.forEach((key) => {
        itemRowspan += 1; // 中分類ごとに1行
      });

      let itemRowspanUsed = 0;
      sortedSubCategoryKeys.forEach((key, subIdx) => {
        const [, , subCategory] = key.split('|');
        const subCategoryData = grouped[key];

        // フェーズごとにグループ化
        const phaseGroups: Record<number, SkillPhaseItem[]> = {};
        subCategoryData.forEach((row) => {
          if (!phaseGroups[row.phase]) {
            phaseGroups[row.phase] = [];
          }
          phaseGroups[row.phase].push(row);
        });

        // フェーズ1～5のデータを準備（個々のスキル項目を保持）
        const phaseData: Record<number, SkillPhaseItem[]> = {};
        for (let phase = 1; phase <= 5; phase++) {
          if (phaseGroups[phase]) {
            phaseData[phase] = phaseGroups[phase];
          } else {
            phaseData[phase] = [];
          }
        }

        const isFirstCategoryRow = categoryRowspanUsed === 0 && itemIdx === 0 && subIdx === 0;
        const isFirstItemRow = itemRowspanUsed === 0 && subIdx === 0;

        rows.push({
          category: isFirstCategoryRow ? category : null,
          categoryRowspan: isFirstCategoryRow ? categoryRowspan : 0,
          item: isFirstItemRow ? item : null,
          itemRowspan: isFirstItemRow ? itemRowspan : 0,
          subCategory: subCategory,
          phase1: phaseData[1],
          phase2: phaseData[2],
          phase3: phaseData[3],
          phase4: phaseData[4],
          phase5: phaseData[5],
        });

        categoryRowspanUsed++;
        itemRowspanUsed++;
      });
    });
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate text-sm" style={{ borderSpacing: 0 }}>
          <thead>
            <tr className="bg-orange-200 dark:bg-orange-800">
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center rounded-tl-lg"
                rowSpan={2}
              >
                大分類
              </th>
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center"
                rowSpan={2}
              >
                項目
              </th>
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center"
                rowSpan={2}
              >
                中分類
              </th>
              <th
                className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center rounded-tr-lg"
                colSpan={5}
              >
                スキルフェーズ
              </th>
            </tr>
            <tr className="bg-orange-50 dark:bg-orange-900">
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                1
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                2
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                3
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                4
              </th>
              <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center">
                5
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {rows.map((row, idx) => {
              const isLastRow = idx === rows.length - 1;
              // 最後の行で最初に表示されるセルを特定
              // row.categoryが存在する場合、それはrowSpanで最初の行から最後の行まで続いているので、最後の行でもそのセルが最初
              // row.categoryが存在しない場合、row.itemが最初
              // row.itemも存在しない場合、row.subCategoryが最初
              const isLastRowFirstCell = isLastRow && row.category;
              const isLastRowFirstCellIfNoCategory = isLastRow && !row.category && row.item;
              const isLastRowFirstCellIfNoCategoryAndItem = isLastRow && !row.category && !row.item;
              return (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {row.category && (
                    <td
                      rowSpan={row.categoryRowspan}
                      className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white font-semibold text-center align-middle bg-gray-100 dark:bg-gray-800 ${isLastRowFirstCell ? 'rounded-bl-lg' : ''}`}
                    >
                      {row.category}
                    </td>
                  )}
                  {row.item && (
                    <td
                      rowSpan={row.itemRowspan}
                      className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-left align-middle bg-gray-100 dark:bg-gray-800 ${isLastRowFirstCellIfNoCategory ? 'rounded-bl-lg' : ''}`}
                    >
                      {row.item}
                    </td>
                  )}
                  <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-left align-middle bg-gray-50 dark:bg-gray-700 ${isLastRowFirstCellIfNoCategoryAndItem ? 'rounded-bl-lg' : ''}`}>
                    {row.subCategory}
                  </td>
                  {[1, 2, 3, 4, 5].map((phase) => {
                    const phaseItems = row[`phase${phase}` as keyof typeof row] as SkillPhaseItem[];
                    const isLastPhase = phase === 5;
                    return (
                      <td
                        key={phase}
                        className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-xs text-gray-900 dark:text-white align-top ${isLastRow && isLastPhase ? 'rounded-br-lg' : ''}`}
                      >
                        {phaseItems && phaseItems.length > 0 && (
                          <div className="space-y-1">
                            {(() => {
                              // 小分類ごとにグループ化
                              const smallCategoryGroups: Record<string, SkillPhaseItem[]> = {};
                              phaseItems.forEach((phaseItem) => {
                                if (!smallCategoryGroups[phaseItem.smallCategory]) {
                                  smallCategoryGroups[phaseItem.smallCategory] = [];
                                }
                                smallCategoryGroups[phaseItem.smallCategory].push(phaseItem);
                              });
                              return Object.entries(smallCategoryGroups).map(([smallCategory, items]) =>
                                items.map((phaseItem) => {
                                  const hasRelatedMaterials = hasTrainingPermission && linkedItemIds.has(phaseItem.id);
                                  const isHighlighted = highlightedSkillIds.has(phaseItem.id);
                                    return (
                                      <div key={phaseItem.id} className="flex items-center gap-2 group">
                                        <span className={`flex-1 min-w-0 whitespace-nowrap ${isHighlighted ? 'font-semibold bg-yellow-200 dark:bg-yellow-900/30 rounded' : ''}`}>{smallCategory}: {phaseItem.name}</span>
                                        {hasRelatedMaterials && (
                                          <button
                                            className="skill-material-icon p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors flex-shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSkillPhaseItem(phaseItem);
                                              setIsRelatedMaterialsModalOpen(true);
                                            }}
                                            title="関連資料を表示"
                                            aria-label="関連資料を表示"
                                          >
                                            <BookOpen className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    );
                                })
                              );
                            })()}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 関連資料表示モーダル */}
      {selectedSkillPhaseItem && (
        <SkillRelatedMaterialsModal
          isOpen={isRelatedMaterialsModalOpen}
          onClose={() => {
            setIsRelatedMaterialsModalOpen(false);
            setSelectedSkillPhaseItem(null);
          }}
          skillPhaseItemId={selectedSkillPhaseItem.id}
          skillPhaseItemName={`${selectedSkillPhaseItem.category} > ${selectedSkillPhaseItem.item} > フェーズ${selectedSkillPhaseItem.phase}`}
          onMaterialClick={onMaterialClick || (() => {})}
          readOnly={true}
          allowUnlink={allowUnlink}
          onHighlightSkills={onHighlightSkills}
        />
      )}
    </div>
  );
}

