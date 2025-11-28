// パスワードハッシュ化ユーティリティ

import crypto from 'crypto';

/**
 * パスワードをSHA-256でハッシュ化
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * パスワードを検証
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

