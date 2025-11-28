// フォルダ一覧のグローバルキャッシュContext

'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { FolderNormalized } from '@/features/materials/types';

interface FoldersContextType {
  folders: FolderNormalized[];
  loading: boolean;
  error: string | null;
  fetchFolders: (force?: boolean) => Promise<FolderNormalized[]>;
  invalidateCache: () => void;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5分
const CACHE_KEY = 'folders_cache';
const CACHE_TIMESTAMP_KEY = 'folders_cache_timestamp';

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<FolderNormalized[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // キャッシュからフォルダ一覧を読み込む
  const loadFromCache = useCallback((): FolderNormalized[] | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cached && timestamp) {
        const cacheTime = parseInt(timestamp, 10);
        const now = Date.now();
        
        // キャッシュが有効期限内かチェック
        if (now - cacheTime < CACHE_DURATION) {
          return JSON.parse(cached);
        } else {
          // 期限切れのキャッシュを削除
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        }
      }
    } catch (err) {
      console.error('フォルダキャッシュ読み込みエラー:', err);
    }
    
    return null;
  }, []);

  // キャッシュにフォルダ一覧を保存
  const saveToCache = useCallback((foldersData: FolderNormalized[]) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(foldersData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error('フォルダキャッシュ保存エラー:', err);
    }
  }, []);

  // フォルダ一覧を取得
  const fetchFolders = useCallback(async (force = false): Promise<FolderNormalized[]> => {
    // 強制取得でない場合、キャッシュを確認
    if (!force) {
      const cached = loadFromCache();
      if (cached) {
        setFolders(cached);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/materials/folders?flat=true');
      if (!response.ok) {
        throw new Error('フォルダ一覧の取得に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        const foldersData = data.folders || [];
        setFolders(foldersData);
        saveToCache(foldersData);
        return foldersData;
      } else {
        throw new Error(data.error || 'フォルダ一覧の取得に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'フォルダ一覧の取得に失敗しました';
      setError(errorMessage);
      console.error('フォルダ取得エラー:', err);
      
      // エラー時はキャッシュがあれば返す
      const cached = loadFromCache();
      if (cached) {
        return cached;
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, saveToCache]);

  // キャッシュを無効化
  const invalidateCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
    // 次回のfetchFoldersで再取得される
  }, []);

  // 初回読み込み時にキャッシュから復元
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setFolders(cached);
    } else {
      // キャッシュがない場合は取得
      fetchFolders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行

  return (
    <FoldersContext.Provider
      value={{
        folders,
        loading,
        error,
        fetchFolders,
        invalidateCache,
      }}
    >
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders(): FoldersContextType {
  const context = useContext(FoldersContext);
  if (context === undefined) {
    throw new Error('useFolders must be used within a FoldersProvider');
  }
  return context;
}

