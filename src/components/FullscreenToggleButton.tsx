'use client';

import { Maximize2, Minimize2 } from 'lucide-react';
import { useFullscreen } from '@/contexts/FullscreenContext';

interface FullscreenToggleButtonProps {
  /** 追加のCSSクラス */
  className?: string;
  /** ラベルを表示するかどうか */
  showLabel?: boolean;
  /** ボタンのサイズ（sm, md, lg） */
  size?: 'sm' | 'md' | 'lg';
}

export default function FullscreenToggleButton({
  className = '',
  showLabel = false,
  size = 'md',
}: FullscreenToggleButtonProps) {
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <button
      onClick={toggleFullscreen}
      className={`${sizeClasses[size]} rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 ${className}`}
      aria-label={isFullscreen ? '最小化' : '最大化'}
      title={isFullscreen ? '最小化 (ESC)' : '最大化 (ESCで解除)'}
    >
      {isFullscreen ? (
        <Minimize2 className={iconSizes[size]} />
      ) : (
        <Maximize2 className={iconSizes[size]} />
      )}
      {showLabel && (
        <span className={textSizes[size]}>
          {isFullscreen ? '最小化' : '最大化'}
        </span>
      )}
    </button>
  );
}

