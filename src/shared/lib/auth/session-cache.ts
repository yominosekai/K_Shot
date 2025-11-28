// 認証結果のセッションキャッシュ（メモリキャッシュ、TTL付き）

import type { User } from '@/features/auth/types';
import { debug, info } from '../logger';

const MODULE_NAME = 'session-cache';

interface CacheEntry {
  user: User;
  expiresAt: number;
}

// メモリキャッシュ（Map使用）
const cache = new Map<string, CacheEntry>();

// TTL: 1時間（ミリ秒）
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * キャッシュをクリーンアップ（期限切れのエントリを削除）
 */
function cleanupCache(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [sid, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(sid);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    debug(MODULE_NAME, `キャッシュクリーンアップ: ${cleanedCount}件の期限切れエントリを削除`);
  }
}

/**
 * 定期的にキャッシュをクリーンアップ（5分ごと）
 */
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, 5 * 60 * 1000); // 5分ごと
}

/**
 * 認証結果をキャッシュに保存
 * @param sid ユーザーSID
 * @param user ユーザー情報
 */
export function setAuthCache(sid: string, user: User): void {
  const expiresAt = Date.now() + CACHE_TTL_MS;
  cache.set(sid, {
    user,
    expiresAt,
  });
  debug(MODULE_NAME, `認証結果をキャッシュに保存: sid=${sid}, expiresAt=${new Date(expiresAt).toISOString()}`);
}

/**
 * 認証結果をキャッシュから取得
 * @param sid ユーザーSID
 * @returns ユーザー情報（キャッシュに存在し、有効期限内の場合）、それ以外はnull
 */
export function getAuthCache(sid: string): User | null {
  const entry = cache.get(sid);

  if (!entry) {
    debug(MODULE_NAME, `キャッシュに存在しない: sid=${sid}`);
    return null;
  }

  const now = Date.now();
  if (entry.expiresAt < now) {
    // 期限切れの場合は削除
    cache.delete(sid);
    debug(MODULE_NAME, `キャッシュが期限切れ: sid=${sid}`);
    return null;
  }

  debug(MODULE_NAME, `キャッシュから取得: sid=${sid}, 残り時間=${Math.round((entry.expiresAt - now) / 1000 / 60)}分`);
  return entry.user;
}

/**
 * 認証結果をキャッシュから削除
 * @param sid ユーザーSID
 */
export function clearAuthCache(sid: string): void {
  if (cache.delete(sid)) {
    debug(MODULE_NAME, `キャッシュを削除: sid=${sid}`);
  }
}

/**
 * すべてのキャッシュをクリア
 */
export function clearAllAuthCache(): void {
  const count = cache.size;
  cache.clear();
  debug(MODULE_NAME, `すべてのキャッシュをクリア: ${count}件`);
}

/**
 * キャッシュの統計情報を取得
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ sid: string; expiresAt: string; remainingMinutes: number }>;
} {
  const now = Date.now();
  const entries: Array<{ sid: string; expiresAt: string; remainingMinutes: number }> = [];

  for (const [sid, entry] of cache.entries()) {
    if (entry.expiresAt >= now) {
      entries.push({
        sid,
        expiresAt: new Date(entry.expiresAt).toISOString(),
        remainingMinutes: Math.round((entry.expiresAt - now) / 1000 / 60),
      });
    }
  }

  return {
    size: entries.length,
    entries,
  };
}


