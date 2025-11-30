// お気に入りページの表示モード管理フック

import { useState, useEffect } from 'react';

export function useFavoritesViewMode() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mounted, setMounted] = useState(false);

  // 表示モードの初期化
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('favorites_viewMode') as 'grid' | 'list' | null;
      if (savedViewMode === 'grid' || savedViewMode === 'list') {
        setViewMode(savedViewMode);
      }
    }
  }, []);

  // 表示モードを保存
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('favorites_viewMode', viewMode);
    }
  }, [viewMode, mounted]);

  return {
    viewMode,
    setViewMode,
    mounted,
  };
}
