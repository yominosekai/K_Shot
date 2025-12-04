// 並び替え可能な行コンポーネント

'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ReactNode } from 'react';

interface SortableRowProps {
  id: string;
  children: (dragHandleProps: { [key: string]: any }) => ReactNode;
  className?: string;
}

export default function SortableRow({ id, children, className = '' }: SortableRowProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  // ドラッグハンドルのプロップスを準備
  const dragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'z-50' : ''}`}
    >
      {children(dragHandleProps)}
    </tr>
  );
}

