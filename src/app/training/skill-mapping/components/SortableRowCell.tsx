// 並び替え可能な行のセルコンポーネント（ドラッグハンドル付き）

'use client';

interface SortableRowCellProps {
  id: string;
  displayIndex: number;
  isLastRow?: boolean;
  dragHandleProps?: {
    [key: string]: any;
  };
}

export default function SortableRowCell({ id, displayIndex, isLastRow = false, dragHandleProps }: SortableRowCellProps) {
  return (
    <td
      className={`border border-gray-400 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white text-center align-middle bg-gray-50 dark:bg-gray-700 ${isLastRow ? 'rounded-bl-lg' : ''}`}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-gray-600 font-semibold">{displayIndex + 1}</span>
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-lg"
          title="ドラッグして並び替え"
        >
          ⋮⋮
        </div>
      </div>
    </td>
  );
}

