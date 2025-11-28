// 資料検索結果のキャッシュ管理フック

import { useRef, useCallback } from 'react';
import type { MaterialNormalized } from '@/features/materials/types';

// キャッシュの型定義
interface CacheEntry {
  materials: MaterialNormalized[];
  timestamp: number;
}

const CACHE_TTL = 3 * 60 * 1000; // 3分（ミリ秒）
const MAX_CACHE_SIZE = 50; // 最大キャッシュ数（メモリリーク防止）

export function useMaterialsCache() {
  // メモリキャッシュ（useRefで管理）
  const searchCacheRef = useRef<Map<string, CacheEntry>>(new Map());

  // キャッシュから古いエントリを削除（メモリリーク防止）
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const cache = searchCacheRef.current;
    
    // 期限切れのエントリを削除
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
    
    // キャッシュサイズが上限を超えた場合、最も古いエントリを削除
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }, []);

  // キャッシュから取得
  const getFromCache = useCallback((key: string): MaterialNormalized[] | null => {
    const cached = searchCacheRef.current.get(key);
    if (cached) {
      const now = Date.now();
      // キャッシュが有効な場合
      if (now - cached.timestamp < CACHE_TTL) {
        return cached.materials;
      } else {
        // 期限切れのキャッシュを削除
        searchCacheRef.current.delete(key);
      }
    }
    return null;
  }, []);

  // キャッシュに保存
  const setToCache = useCallback((key: string, materials: MaterialNormalized[]) => {
    searchCacheRef.current.set(key, {
      materials,
      timestamp: Date.now(),
    });
    cleanupCache();
  }, [cleanupCache]);

  // キャッシュから削除
  const deleteFromCache = useCallback((key: string) => {
    searchCacheRef.current.delete(key);
  }, []);

  // キャッシュをクリア
  const clearCache = useCallback(() => {
    searchCacheRef.current.clear();
  }, []);

  return {
    getFromCache,
    setToCache,
    deleteFromCache,
    clearCache,
  };
}

