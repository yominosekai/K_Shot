// 編集モードテーブルコンポーネント（結合セルを展開）

'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { SkillPhaseItem, NewRow } from './types';
import PhaseCell from './PhaseCell';
import SortableRowCell from './SortableRowCell';
import SortableRow from './SortableRow';

interface EditModeTableProps {
  data: SkillPhaseItem[];
  onDataChange: (data: SkillPhaseItem[]) => void;
  errorRowIds?: Set<string>;
  newRows?: NewRow[];
  onNewRowsChange?: (newRows: NewRow[]) => void;
  originalData?: SkillPhaseItem[]; // 編集前のデータ（変更検出用）
  onRowOrderChange?: (rowOrder: string[]) => void; // 行の順序が変わったときに呼ばれる
}

export default function EditModeTable({ 
  data, 
  onDataChange, 
  errorRowIds = new Set<string>(),
  newRows = [],
  onNewRowsChange,
  originalData = [],
  onRowOrderChange
}: EditModeTableProps) {
  // 行の順序を管理する状態
  const [rowOrder, setRowOrder] = useState<string[]>([]);

  const setNewRowsInternal = (rows: NewRow[]) => {
    if (onNewRowsChange) {
      onNewRowsChange(rows);
    }
  };

  // データを階層ごとにグループ化して編集用の行データに変換
  const editRows = (() => {
    // 新規行のデータと既存データを分離
    const existingData = data.filter(r => !r.newRowId);
    const newRowData = data.filter(r => r.newRowId);
    
    const grouped: Record<string, SkillPhaseItem[]> = {};
    existingData.forEach(row => {
      const key = `${row.category}|${row.item}|${row.subCategory}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(row);
    });

    const rows: Array<{
      id: string;
      category: string;
      item: string;
      subCategory: string;
      phase1: SkillPhaseItem[];
      phase2: SkillPhaseItem[];
      phase3: SkillPhaseItem[];
      phase4: SkillPhaseItem[];
      phase5: SkillPhaseItem[];
    }> = [];

    Object.keys(grouped).forEach(key => {
      const [category, item, subCategory] = key.split('|');
      const subCategoryData = grouped[key];
      
      const phaseGroups: Record<number, SkillPhaseItem[]> = {};
      subCategoryData.forEach(row => {
        if (!phaseGroups[row.phase]) {
          phaseGroups[row.phase] = [];
        }
        phaseGroups[row.phase].push(row);
      });

      rows.push({
        id: key,
        category,
        item,
        subCategory,
        phase1: phaseGroups[1] || [],
        phase2: phaseGroups[2] || [],
        phase3: phaseGroups[3] || [],
        phase4: phaseGroups[4] || [],
        phase5: phaseGroups[5] || []
      });
    });

    // displayOrderに基づいてソート（displayOrderが設定されている場合はそれを使用）
    const sortedRows = rows.sort((a, b) => {
      // 各行のdisplayOrderを取得（最初のデータのdisplayOrderを使用）
      const aDisplayOrder = grouped[a.id]?.[0]?.displayOrder ?? 999999;
      const bDisplayOrder = grouped[b.id]?.[0]?.displayOrder ?? 999999;
      
      // displayOrderでソート
      if (aDisplayOrder !== bDisplayOrder) {
        return aDisplayOrder - bDisplayOrder;
      }
      
      // displayOrderが同じ場合は既存のソートロジックを使用
      const categoryOrder = ['共通', 'RedTeam', 'PurpleTeam', 'BlueTeam', 'インフラ'];
      const aCatIdx = categoryOrder.indexOf(a.category);
      const bCatIdx = categoryOrder.indexOf(b.category);
      if (aCatIdx !== bCatIdx) return aCatIdx - bCatIdx;
      if (a.item !== b.item) return a.item.localeCompare(b.item);
      return a.subCategory.localeCompare(b.subCategory);
    });

    // 新規行を適切な位置に挿入
    newRows.forEach(newRow => {
      const newRowData = {
        id: newRow.id,
        category: newRow.category,
        item: newRow.item,
        subCategory: newRow.subCategory,
        phase1: [],
        phase2: [],
        phase3: [],
        phase4: [],
        phase5: []
      };

      if (newRow.insertAfter) {
        // 指定された行の後に挿入
        const insertIndex = sortedRows.findIndex(r => r.id === newRow.insertAfter);
        if (insertIndex >= 0) {
          sortedRows.splice(insertIndex + 1, 0, newRowData);
        } else {
          sortedRows.push(newRowData);
        }
      } else {
        // 末尾に追加
        sortedRows.push(newRowData);
      }
    });

    return sortedRows;
  })();

  // editRowsが変更されたときに順序を初期化
  useEffect(() => {
    // rowOrderが既に設定されている場合は、ドラッグ&ドロップで変更された可能性があるため上書きしない
    if (rowOrder.length > 0) {
      return;
    }
    
    // rowOrderが空の場合のみ初期化
    const currentOrder = editRows.map(row => row.id);
    const currentOrderStr = currentOrder.join(',');
    const existingOrderStr = rowOrder.join(',');
    
    // 順序が変わった場合のみ更新（無限ループを防ぐため）
    if (currentOrderStr !== existingOrderStr && currentOrder.length > 0) {
      setRowOrder(currentOrder);
      // 親コンポーネントに行の順序の変更を通知
      if (onRowOrderChange) {
        onRowOrderChange(currentOrder);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRows.length, newRows.length, data.length]);

  // 順序に従って行を並び替え
  const orderedRows = (() => {
    if (rowOrder.length === 0) {
      return editRows;
    }
    const rowMap = new Map(editRows.map(row => [row.id, row]));
    const ordered: typeof editRows = [];
    
    // 既存の順序に従って並び替え
    rowOrder.forEach(id => {
      const row = rowMap.get(id);
      if (row) {
        ordered.push(row);
        rowMap.delete(id);
      }
    });
    
    // 順序に含まれていない新しい行を末尾に追加
    rowMap.forEach(row => {
      ordered.push(row);
    });
    
    return ordered;
  })();

  // 行をドラッグ&ドロップで並び替える関数
  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeRow = editRows.find(r => r.id === activeId);
    const overRow = editRows.find(r => r.id === overId);

    if (!activeRow || !overRow) return;

    const currentIndex = rowOrder.indexOf(activeId);
    const newIndex = rowOrder.indexOf(overId);

    if (currentIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(rowOrder, currentIndex, newIndex);
    setRowOrder(newOrder);
    // 親コンポーネントに行の順序の変更を通知
    if (onRowOrderChange) {
      onRowOrderChange(newOrder);
    }
  };

  const handleAddRow = (insertAfterRowId?: string) => {
    const newRowId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRow = {
      id: newRowId,
      category: '',
      item: '',
      subCategory: ''
    };
    
    if (insertAfterRowId) {
      // 指定された行の後に挿入
      const insertIndex = editRows.findIndex(r => r.id === insertAfterRowId);
      if (insertIndex >= 0) {
        // 既存の行の後に新規行を挿入するため、newRowsの順序を管理
        // 実際の挿入位置はeditRowsの計算時に反映される
        setNewRowsInternal([...newRows, { ...newRow, insertAfter: insertAfterRowId }]);
      } else {
        setNewRowsInternal([...newRows, newRow]);
      }
    } else {
      // 末尾に追加
      setNewRowsInternal([...newRows, newRow]);
    }
  };

  const handleNewRowChange = (rowId: string, field: 'category' | 'item' | 'subCategory', value: string) => {
    setNewRowsInternal(newRows.map(row => 
      row.id === rowId ? { ...row, [field]: value } : row
    ));
  };

  // ドラッグ&ドロップのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // スキルフェーズ内の項目を並び替える関数
  const handlePhaseItemsReorder = (
    rowId: string,
    phase: number,
    activeId: number,
    overId: number | null
  ) => {
    if (overId === null) return;

    const row = orderedRows.find(r => r.id === rowId);
    if (!row) return;

    const isNewRow = newRows.some(r => r.id === rowId);
    const phaseData = isNewRow 
      ? data.filter(r => 
          r.newRowId === rowId && 
          r.phase === phase
        )
      : data.filter(r => 
          r.category === row.category && 
          r.item === row.item && 
          r.subCategory === row.subCategory && 
          r.phase === phase &&
          !r.newRowId
        );

    const oldIndex = phaseData.findIndex(item => item.id === activeId);
    const newIndex = phaseData.findIndex(item => item.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reorderedItems = arrayMove(phaseData, oldIndex, newIndex);
    
    // データを更新（このフェーズの項目を新しい順序で置き換え）
    const otherData = data.filter(r => {
      if (isNewRow) {
        return !(r.newRowId === rowId && r.phase === phase);
      } else {
        return !(r.category === row.category && 
                r.item === row.item && 
                r.subCategory === row.subCategory && 
                r.phase === phase &&
                !r.newRowId);
      }
    });

    onDataChange([...otherData, ...reorderedItems]);
  };

  // データが0行の場合は空状態を表示
  if (orderedRows.length === 0 && newRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-lg">
            データがありません。行を追加して編集を開始してください。
          </p>
          <button
            onClick={() => handleAddRow()}
            className="bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors shadow-lg"
          >
            + 行を追加
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleRowDragEnd}
        >
          <table className="min-w-full border-separate text-sm" style={{ minWidth: '1650px', width: '100%', borderSpacing: 0 }}>
            <thead>
              <tr className="bg-orange-200 dark:bg-orange-800">
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center rounded-tl-lg" style={{ width: '60px', minWidth: '60px' }}>順序</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '120px', minWidth: '120px' }}>大分類</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '120px', minWidth: '120px' }}>項目</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '150px', minWidth: '150px', maxWidth: '200px' }}>中分類</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '250px', minWidth: '250px' }}>スキルフェーズ1</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '250px', minWidth: '250px' }}>スキルフェーズ2</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '250px', minWidth: '250px' }}>スキルフェーズ3</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '250px', minWidth: '250px' }}>スキルフェーズ4</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center" style={{ width: '250px', minWidth: '250px' }}>スキルフェーズ5</th>
                <th className="border border-gray-400 dark:border-gray-600 px-4 py-3 text-left text-xs font-medium text-orange-900 dark:text-orange-100 uppercase tracking-wider text-center rounded-tr-lg" style={{ width: '100px', minWidth: '100px' }}>操作</th>
              </tr>
            </thead>
          <SortableContext
            items={orderedRows.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {orderedRows.map((row, displayIndex) => {
                const isLastRow = displayIndex === orderedRows.length - 1;
                // この行にエラーがあるかチェック
                const hasError = [1, 2, 3, 4, 5].some(phase => {
                  const rowId = `${row.category}|${row.item}|${row.subCategory}|${phase}`;
                  return errorRowIds.has(rowId);
                });

                const isNewRow = newRows.some(r => r.id === row.id);
                const categoryOptions = ['共通', 'RedTeam', 'PurpleTeam', 'BlueTeam', 'インフラ'];
                
                // 既存データから項目と中分類の候補を取得
                const existingItems = Array.from(new Set(data.map(d => d.item).filter(Boolean)));
                const existingSubCategories = Array.from(new Set(data.map(d => d.subCategory).filter(Boolean)));
                
                // 新規追加行のエラーチェック
                const newRowError = isNewRow ? errorRowIds.has(`new-${row.id}`) : false;

                // 変更検出：編集前のデータと比較
                // 編集前のデータから、この行（大分類・項目・中分類）に該当するデータを取得
                const originalRowKey = `${row.category}|${row.item}|${row.subCategory}`;
                const originalRowData = originalData.filter(r => 
                  `${r.category}|${r.item}|${r.subCategory}` === originalRowKey && !r.newRowId
                );

                // 大分類、項目、中分類の変更を検出（セル単位）
                const originalFirstItem = originalRowData.length > 0 ? originalRowData[0] : null;
                let categoryChanged = false;
                let itemChanged = false;
                let subCategoryChanged = false;

                if (originalFirstItem && !isNewRow) {
                  // 編集前の大分類・項目・中分類と現在の値を比較
                  categoryChanged = originalFirstItem.category !== row.category;
                  itemChanged = originalFirstItem.item !== row.item;
                  subCategoryChanged = originalFirstItem.subCategory !== row.subCategory;
                }

                // 新規追加行かどうか
                const isRowNew = isNewRow;

                // hover時の背景色を決定（変更がある場合は緑色を維持）
                const hoverClass = isRowNew && !newRowError ? 'hover:bg-green-100 dark:hover:bg-green-900' : 
                                   (hasError || newRowError) ? 'hover:bg-red-100 dark:hover:bg-red-900' : 
                                   'hover:bg-gray-50 dark:hover:bg-gray-800';

                return (
                  <SortableRow
                    key={row.id}
                    id={row.id}
                    className={`${hoverClass} ${hasError || newRowError ? 'bg-red-50 dark:bg-red-900' : ''} ${isRowNew && !newRowError ? 'bg-green-50 dark:bg-green-900' : ''}`}
                  >
                    {(dragHandleProps) => (
                      <>
                        <SortableRowCell
                          id={row.id}
                          displayIndex={displayIndex}
                          isLastRow={isLastRow}
                          dragHandleProps={dragHandleProps}
                        />
                    <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white font-semibold text-center align-middle ${categoryChanged && !hasError && !newRowError ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-800'}`} style={{ width: '120px', minWidth: '120px' }}>
                      {isNewRow ? (
                        <>
                          <input
                            type="text"
                            list={`category-list-${row.id}`}
                            className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
                            value={row.category}
                            onChange={(e) => handleNewRowChange(row.id, 'category', e.target.value)}
                            placeholder="大分類を入力または選択"
                            style={{ maxWidth: '100%' }}
                          />
                          <datalist id={`category-list-${row.id}`}>
                            {categoryOptions.map(opt => (
                              <option key={opt} value={opt} />
                            ))}
                          </datalist>
                        </>
                      ) : (
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.category}>
                          {row.category}
                        </div>
                      )}
                    </td>
                    <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-left align-middle ${itemChanged && !hasError && !newRowError ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-800'}`} style={{ width: '120px', minWidth: '120px' }}>
                      {isNewRow ? (
                        <>
                          <input
                            type="text"
                            list={`item-list-${row.id}`}
                            className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
                            value={row.item}
                            onChange={(e) => handleNewRowChange(row.id, 'item', e.target.value)}
                            placeholder="項目名を入力または選択"
                            style={{ maxWidth: '100%' }}
                          />
                          <datalist id={`item-list-${row.id}`}>
                            {existingItems.map(item => (
                              <option key={item} value={item} />
                            ))}
                          </datalist>
                        </>
                      ) : (
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.item}>
                          {row.item}
                        </div>
                      )}
                    </td>
                    <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-left align-middle ${subCategoryChanged && !hasError && !newRowError ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-50 dark:bg-gray-700'}`} style={{ width: '150px', minWidth: '150px', maxWidth: '200px' }}>
                      {isNewRow ? (
                        <>
                          <input
                            type="text"
                            list={`subcategory-list-${row.id}`}
                            className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
                            value={row.subCategory}
                            onChange={(e) => handleNewRowChange(row.id, 'subCategory', e.target.value)}
                            placeholder="中分類名を入力または選択"
                            style={{ maxWidth: '100%' }}
                          />
                          <datalist id={`subcategory-list-${row.id}`}>
                            {existingSubCategories.map(subCat => (
                              <option key={subCat} value={subCat} />
                            ))}
                          </datalist>
                        </>
                      ) : (
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.subCategory}>
                          {row.subCategory}
                        </div>
                      )}
                    </td>
                    {[1, 2, 3, 4, 5].map(phase => {
                      const rowId = `${row.category}|${row.item}|${row.subCategory}|${phase}`;
                      const cellHasError = errorRowIds.has(rowId);
                      
                      // このフェーズのデータを取得
                      const phaseData = isNewRow 
                        ? data.filter(r => 
                            r.newRowId === row.id && // 新規行のデータのみ（newRowIdで識別）
                            r.phase === phase
                          )
                        : (row[`phase${phase}` as keyof typeof row] as SkillPhaseItem[]) || [];
                      
                      // 編集前のフェーズデータを取得（変更検出用）
                      // 大分類・項目・中分類が変更されていない場合のみ、編集前のデータを取得
                      const originalPhaseData = (!categoryChanged && !itemChanged && !subCategoryChanged && !isNewRow)
                        ? originalData.filter(r => 
                            r.category === row.category && 
                            r.item === row.item && 
                            r.subCategory === row.subCategory && 
                            r.phase === phase &&
                            !r.newRowId
                          )
                        : [];
                      
                      // 新規行で大分類・項目・中分類が未入力の場合は無効化
                      const isDisabled = isNewRow && (!row.category || !row.item || !row.subCategory);
                      
                      return (
                        <PhaseCell
                          key={phase}
                          rowId={row.id}
                          rowCategory={row.category}
                          rowItem={row.item}
                          rowSubCategory={row.subCategory}
                          phase={phase}
                          phaseData={phaseData}
                          isDisabled={isDisabled}
                          cellHasError={cellHasError}
                          isNewRow={isNewRow}
                          originalPhaseData={originalPhaseData}
                          sensors={sensors}
                          onPhaseItemsReorder={handlePhaseItemsReorder}
                          onDataChange={onDataChange}
                          data={data}
                          onAddItem={() => {
                            if (isDisabled) return;
                            // 新規行の場合は一時的なIDを使用（負の値で識別）
                            const maxId = data.length > 0 ? Math.max(...data.map(r => Math.abs(r.id)), 0) : 0;
                            const newId = isNewRow 
                              ? -(maxId + 1) // 新規行のデータは負のID
                              : maxId + 1;
                            const newItem: SkillPhaseItem = {
                              id: newId,
                              category: row.category,
                              item: row.item,
                              subCategory: row.subCategory,
                              smallCategory: '',
                              phase,
                              name: '',
                              description: '',
                              newRowId: isNewRow ? row.id : undefined // 新規行のデータにはnewRowIdを設定
                            };
                            onDataChange([...data, newItem]);
                          }}
                        />
                      );
                    })}
                    <td className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white align-top ${isLastRow ? 'rounded-br-lg' : ''}`}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddRow(row.id)}
                          className="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs hover:bg-blue-700 transition-colors"
                          title="この行の下に行を追加"
                        >
                          +行
                        </button>
                        <button
                          onClick={() => {
                            // この行が新規追加行かチェック
                            if (isNewRow) {
                              // 新規追加行を削除
                              setNewRowsInternal(newRows.filter(r => r.id !== row.id));
                            } else {
                              // 既存行の場合は、その行のデータを全て削除
                              const newData = data.filter(r => 
                                !(r.category === row.category && r.item === row.item && r.subCategory === row.subCategory)
                              );
                              onDataChange(newData);
                            }
                          }}
                          className="bg-red-600 text-white px-2 py-1 rounded-lg text-xs hover:bg-red-700 transition-colors"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                      </>
                    )}
                  </SortableRow>
                );
              })}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
      </div>
      
      {/* テーブル下に常に「行を追加」ボタンを表示 */}
      <div className="mt-4 p-4 flex justify-center border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleAddRow()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          title="新しい行を追加"
        >
          + 行を追加
        </button>
      </div>
    </div>
  );
}

