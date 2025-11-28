// 重複リクエストを防止するカスタムフック

import { useState, useEffect, useRef, useCallback } from 'react';

// 進行中のリクエストを管理するMap（グローバル）
const pendingRequests = new Map<string, Promise<any>>();

interface UseFetchOnceOptions extends RequestInit {
  key?: string; // キャッシュキー（指定しない場合はURLが使用される）
  skip?: boolean; // trueの場合、リクエストをスキップ
}

interface UseFetchOnceResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 同じURLへの重複リクエストを防止するカスタムフック
 * 既に進行中のリクエストがあれば、その結果を待機する
 */
export function useFetchOnce<T = any>(
  url: string | null,
  options: UseFetchOnceOptions = {}
): UseFetchOnceResult<T> {
  const { key, skip = false, ...fetchOptions } = options;
  const cacheKey = key || url || '';
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!skip && !!url);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || skip) {
      setLoading(false);
      return;
    }

    // 既に進行中のリクエストがあれば待機
    if (pendingRequests.has(cacheKey)) {
      try {
        const existingData = await pendingRequests.get(cacheKey)!;
        setData(existingData);
        setLoading(false);
        return;
      } catch (err) {
        // 既存のリクエストがエラーでも、新しいリクエストを開始
      }
    }

    // 新しいリクエストを開始
    setLoading(true);
    setError(null);

    // AbortControllerを作成（クリーンアップ用）
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const promise = fetch(url, {
      ...fetchOptions,
      signal: abortController.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((jsonData) => {
        setData(jsonData);
        return jsonData;
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          // リクエストがキャンセルされた場合はエラーにしない
          return;
        }
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      })
      .finally(() => {
        setLoading(false);
        pendingRequests.delete(cacheKey);
      });

    pendingRequests.set(cacheKey, promise);

    try {
      await promise;
    } catch (err) {
      // エラーは既にsetErrorで設定されている
    }
  }, [url, skip, cacheKey]);

  useEffect(() => {
    fetchData();

    // クリーンアップ：コンポーネントがアンマウントされた場合、リクエストをキャンセル
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // pendingRequestsからは削除しない（他のコンポーネントが待機している可能性があるため）
    };
  }, [fetchData]);

  const refetch = async () => {
    // キャッシュをクリアして再取得
    pendingRequests.delete(cacheKey);
    await fetchData();
  };

  return { data, loading, error, refetch };
}

