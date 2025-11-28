import path from 'path';
import crypto from 'crypto';
import { DRIVE_CONFIG } from '@/config/drive';

const USERS_FOLDER_NAME = 'users';
const DEFAULT_KEY = 'system';

/**
 * usersディレクトリのルートパスを取得
 */
export function getUsersRootPath(): string {
  return path.join(DRIVE_CONFIG.DATA_DIR, USERS_FOLDER_NAME);
}

/**
 * ユーザーごとの保存用フォルダ名を生成（SIDをそのまま使わずハッシュ化）
 */
export function getUserDirectoryId(userKey: string | null | undefined): string {
  const key = userKey && userKey.trim().length > 0 ? userKey : DEFAULT_KEY;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
}

/**
 * ユーザーごとの保存ディレクトリ（絶対パス）を取得
 */
export function getUserDirectoryPath(userKey: string): string {
  return path.join(getUsersRootPath(), getUserDirectoryId(userKey));
}

/**
 * ユーザー配下の相対パスを取得（DBに保存する用）
 */
export function getUserRelativePath(userKey: string, subPath: string): string {
  return `${USERS_FOLDER_NAME}/${getUserDirectoryId(userKey)}/${subPath}`;
}

/**
 * ユーザー配下の任意ファイルの絶対パスを取得
 */
export function getUserSubPath(userKey: string, ...segments: string[]): string {
  return path.join(getUserDirectoryPath(userKey), ...segments);
}

