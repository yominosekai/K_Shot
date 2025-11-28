// 資料ページのブラウザ管理フック

import { useState, useCallback } from 'react';
import { useFolders } from '@/contexts/FoldersContext';

export function useMaterialsBrowser() {
  const [browserCurrentPath, setBrowserCurrentPath] = useState<string>('');
  const [browserRefreshTrigger, setBrowserRefreshTrigger] = useState(0);
  const { invalidateCache: invalidateFoldersCache } = useFolders();

  // パス変更ハンドラー
  const handlePathChange = useCallback((path: string) => {
    setBrowserCurrentPath(path);
  }, []);

  // リフレッシュハンドラー
  const handleRefresh = useCallback(() => {
    invalidateFoldersCache(); // フォルダキャッシュを無効化
    setBrowserRefreshTrigger((prev) => prev + 1);
  }, [invalidateFoldersCache]);

  return {
    browserCurrentPath,
    browserRefreshTrigger,
    handlePathChange,
    handleRefresh,
  };
}

