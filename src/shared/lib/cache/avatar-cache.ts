// アバター画像のサーバー側メモリキャッシュ

interface CachedAvatar {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1時間
const cache = new Map<string, CachedAvatar>();

/**
 * アバター画像をキャッシュから取得
 * @param userId ユーザーID
 * @returns キャッシュされた画像データ、またはnull
 */
export function getCachedAvatar(userId: string): CachedAvatar | null {
  const cached = cache.get(userId);
  if (!cached) {
    return null;
  }

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL_MS) {
    // キャッシュが期限切れ
    cache.delete(userId);
    return null;
  }

  return cached;
}

/**
 * アバター画像をキャッシュに保存
 * @param userId ユーザーID
 * @param buffer 画像バッファ
 * @param contentType Content-Type
 */
export function setCachedAvatar(userId: string, buffer: Buffer, contentType: string): void {
  cache.set(userId, {
    buffer,
    contentType,
    timestamp: Date.now(),
  });
}

/**
 * アバター画像のキャッシュを無効化
 * @param userId ユーザーID
 */
export function invalidateAvatarCache(userId: string): void {
  cache.delete(userId);
}

/**
 * 期限切れのキャッシュをクリーンアップ
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [userId, cached] of cache.entries()) {
    if (now - cached.timestamp > CACHE_TTL_MS) {
      cache.delete(userId);
    }
  }
}

