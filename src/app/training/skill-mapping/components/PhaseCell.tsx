// スキルフェーズセルコンポーネント（ドラッグ&ドロップ対応）

'use client';

import { useMemo, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SkillPhaseItem } from './types';
import SortablePhaseItem from './SortablePhaseItem';

// 各項目をラップするコンポーネント（useCallbackを使用するため）
function PhaseItemWrapper({
  item,
  isDisabled,
  data,
  onDataChange
}: {
  item: SkillPhaseItem;
  isDisabled: boolean;
  data: SkillPhaseItem[];
  onDataChange: (data: SkillPhaseItem[]) => void;
}) {
  const handleUpdate = useCallback((field: 'smallCategory' | 'name', value: string) => {
    const newData = data.map(r => 
      r.id === item.id 
        ? { ...r, [field]: value }
        : r
    );
    onDataChange(newData);
  }, [data, item.id, onDataChange]);
  
  const handleDelete = useCallback(() => {
    const newData = data.filter(r => r.id !== item.id);
    onDataChange(newData);
  }, [data, item.id, onDataChange]);
  
  return (
    <SortablePhaseItem
      item={item}
      isDisabled={isDisabled}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}

interface PhaseCellProps {
  rowId: string;
  rowCategory: string;
  rowItem: string;
  rowSubCategory: string;
  phase: number;
  phaseData: SkillPhaseItem[];
  isDisabled: boolean;
  cellHasError: boolean;
  isNewRow: boolean;
  sensors: any;
  onPhaseItemsReorder: (rowId: string, phase: number, activeId: number, overId: number) => void;
  onDataChange: (data: SkillPhaseItem[]) => void;
  data: SkillPhaseItem[];
  onAddItem: () => void;
  originalPhaseData?: SkillPhaseItem[]; // 編集前のフェーズデータ（変更検出用）
}

export default function PhaseCell({
  rowId,
  phase,
  phaseData,
  isDisabled,
  cellHasError,
  isNewRow,
  rowCategory,
  rowItem,
  rowSubCategory,
  sensors,
  onPhaseItemsReorder,
  onDataChange,
  data,
  onAddItem,
  originalPhaseData = []
}: PhaseCellProps) {
  // phaseDataのID配列をメモ化
  const phaseItemIds = useMemo(() => phaseData.map(item => item.id), [phaseData]);

  // 変更検出：編集前のデータと比較
  const isPhaseChanged = useMemo(() => {
    // 新規行の場合は、項目があれば変更として扱う
    if (isNewRow) {
      return phaseData.length > 0;
    }
    
    // 編集前のデータがない場合は、変更として扱わない（大分類・項目・中分類が変更された場合など）
    if (originalPhaseData.length === 0) {
      return false;
    }
    
    // 項目の追加・削除・変更を検出
    if (phaseData.length !== originalPhaseData.length) {
      return true;
    }
    
    // 各項目の内容が変更されたかチェック
    return phaseData.some(currentItem => {
      const originalItem = originalPhaseData.find(orig => orig.id === currentItem.id);
      if (!originalItem) return true; // 新規追加
      
      return (
        originalItem.smallCategory !== currentItem.smallCategory ||
        originalItem.name !== currentItem.name ||
        originalItem.description !== currentItem.description
      );
    });
  }, [phaseData, originalPhaseData, isNewRow]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onPhaseItemsReorder(
        rowId,
        phase,
        active.id as number,
        over.id as number
      );
    }
  }, [rowId, phase, onPhaseItemsReorder]);

  return (
    <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white align-middle ${cellHasError ? 'bg-red-50 dark:bg-red-900' : ''} ${isPhaseChanged && !cellHasError ? 'bg-green-50 dark:bg-green-900' : ''}`} style={{ width: '250px', minWidth: '250px', maxWidth: '250px' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={phaseItemIds}
          strategy={verticalListSortingStrategy}
        >
          <div className={`space-y-2 ${isDisabled ? 'opacity-50' : ''}`} style={{ width: '100%' }}>
            {phaseData.map((item) => (
              <PhaseItemWrapper
                key={item.id}
                item={item}
                isDisabled={isDisabled}
                data={data}
                onDataChange={onDataChange}
              />
            ))}
            {/* フェードインで表示される追加エリア */}
            {!isDisabled && (
              <div
                onClick={onAddItem}
                className="relative flex gap-0.5 items-center border border-dashed border-blue-400 rounded py-0.5 px-0.5 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200"
                title="クリックして項目を追加"
                style={{ width: '100%', minWidth: 0 }}
              >
                {/* ドラッグハンドルの位置（空白） */}
                <div className="flex-shrink-0" style={{ width: '16px' }}></div>
                {/* 小分類入力欄の位置 */}
                <div className="flex-shrink-0 border border-dashed border-blue-300 rounded py-0.5 px-1 flex items-center justify-center dark:border-blue-600" style={{ width: '55px', minWidth: '55px' }}>
                  <span className="text-blue-500 dark:text-blue-400 text-xs whitespace-nowrap">小分類</span>
                </div>
                {/* 取り組み名入力欄の位置 */}
                <div className="flex-1 border border-dashed border-blue-300 rounded py-0.5 px-1 flex items-center justify-center dark:border-blue-600" style={{ minWidth: 0 }}>
                  <span className="text-blue-500 dark:text-blue-400 text-xs whitespace-nowrap">取り組み名</span>
                </div>
                {/* 削除ボタンの位置（空白） */}
                <div className="flex-shrink-0" style={{ width: '20px' }}></div>
                {/* 右端に「+」を表示 */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10">
                  <span className="text-blue-500 dark:text-blue-400 text-base font-semibold">+</span>
                </div>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
      {cellHasError && (
        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
          ⚠ エラーあり
        </div>
      )}
      {isNewRow && (!rowCategory || !rowItem || !rowSubCategory) && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          大分類・項目・中分類を入力してください
        </div>
      )}
    </td>
  );
}

