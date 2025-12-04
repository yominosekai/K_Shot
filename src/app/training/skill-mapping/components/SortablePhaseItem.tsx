// 並び替え可能なスキルフェーズ項目コンポーネント

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SkillPhaseItem } from './types';

interface SortablePhaseItemProps {
  item: SkillPhaseItem;
  isDisabled: boolean;
  onUpdate: (field: 'smallCategory' | 'name', value: string) => void;
  onDelete: () => void;
}

export default function SortablePhaseItem({ 
  item, 
  isDisabled, 
  onUpdate, 
  onDelete 
}: SortablePhaseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-0.5 items-center ${isDragging ? 'z-50' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
        title="ドラッグして並び替え"
        style={{ width: '16px', fontSize: '10px', lineHeight: '1' }}
      >
        ⋮⋮
      </div>
      <input
        type="text"
        className="p-0.5 text-xs border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 flex-shrink-0"
        style={{ width: '55px', minWidth: '55px', fontSize: '11px' }}
        value={item.smallCategory}
        onChange={(e) => onUpdate('smallCategory', e.target.value)}
        placeholder="小分類"
        disabled={isDisabled}
      />
      <input
        type="text"
        className="flex-1 p-0.5 text-xs border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
        style={{ minWidth: 0, fontSize: '11px' }}
        value={item.name}
        onChange={(e) => onUpdate('name', e.target.value)}
        placeholder="取り組み名"
        disabled={isDisabled}
      />
      <button
        onClick={onDelete}
        className="bg-red-500 text-white rounded text-xs hover:bg-red-600 whitespace-nowrap flex-shrink-0"
        style={{ width: '20px', minWidth: '20px', height: '20px', padding: 0, fontSize: '14px', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        disabled={isDisabled}
        title="削除"
      >
        ×
      </button>
    </div>
  );
}

