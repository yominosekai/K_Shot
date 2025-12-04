// 並び替え可能な行のセルコンポーネント（ドラッグハンドル付き）

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowCellProps {
  id: string;
  displayIndex: number;
  isLastRow?: boolean;
}

export default function SortableRowCell({ id, displayIndex, isLastRow = false }: SortableRowCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <td
      ref={setNodeRef}
      style={style}
      className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-center align-middle bg-gray-50 dark:bg-gray-700 ${isLastRow ? 'rounded-bl-lg' : ''} ${isDragging ? 'opacity-50 z-50' : ''}`}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-600 font-semibold">{displayIndex + 1}</span>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-lg"
          title="ドラッグして並び替え"
        >
          ⋮⋮
        </div>
      </div>
    </td>
  );
}

