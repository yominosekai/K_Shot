// カテゴリ一覧のグローバルキャッシュContext

'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { CategoryNormalized } from '@/features/materials/types';

interface CategoriesContextType {
  categories: CategoryNormalized[];
  loading: boolean;
  error: string | null;
  fetchCategories: (force?: boolean) => Promise<CategoryNormalized[]>;
  invalidateCache: () => void;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

const CACHE_DURATION = 10 * 60 * 1000; // 10分（カテゴリは変更頻度が低いため長め）
const CACHE_KEY = 'categories_cache';
const CACHE_TIMESTAMP_KEY = 'categories_cache_timestamp';

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<CategoryNormalized[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // キャッシュからカテゴリ一覧を読み込む
  const loadFromCache = useCallback((): CategoryNormalized[] | null => {
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
      console.error('カテゴリキャッシュ読み込みエラー:', err);
    }
    
    return null;
  }, []);

  // キャッシュにカテゴリ一覧を保存
  const saveToCache = useCallback((categoriesData: CategoryNormalized[]) => {
    if (typeof window === 'undefined') return;

    // カテゴリ数が0件の場合はキャッシュしない（初期セットアップ時など）
    if (categoriesData.length === 0) {
      // 既存のキャッシュがあれば削除
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return;
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(categoriesData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error('カテゴリキャッシュ保存エラー:', err);
    }
  }, []);

  // カテゴリ一覧を取得
  const fetchCategories = useCallback(async (force = false): Promise<CategoryNormalized[]> => {
    // 強制取得でない場合、キャッシュを確認
    if (!force) {
      const cached = loadFromCache();
      if (cached) {
        setCategories(cached);
        return cached;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/materials/categories');
      if (!response.ok) {
        throw new Error('カテゴリ一覧の取得に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        const categoriesData = data.categories || [];
        setCategories(categoriesData);
        saveToCache(categoriesData);
        return categoriesData;
      } else {
        throw new Error(data.error || 'カテゴリ一覧の取得に失敗しました');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'カテゴリ一覧の取得に失敗しました';
      setError(errorMessage);
      console.error('カテゴリ取得エラー:', err);
      
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
    // 次回のfetchCategoriesで再取得される
  }, []);

  // 初回読み込み時にキャッシュから復元
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setCategories(cached);
    } else {
      // キャッシュがない場合は取得
      fetchCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ実行

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        loading,
        error,
        fetchCategories,
        invalidateCache,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): CategoriesContextType {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}

