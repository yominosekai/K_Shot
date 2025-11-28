// アバター画像ファイル操作ユーティリティ

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { DRIVE_CONFIG } from '@/config/drive';
import { error, debug } from '../logger';
import { getUserDirectoryPath, getUserRelativePath } from './user-storage';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const existsSync = fs.existsSync;

const MODULE_NAME = 'file-system/avatar';

/**
 * アバター画像の保存パスを取得
 * @param userSid ユーザーSID
 * @returns アバター画像のフルパス
 */
const AVATAR_FILE_NAME = 'avatar.png';

export function getAvatarPath(userSid: string): string {
  const userDir = getUserDirectoryPath(userSid);
  return path.join(userDir, AVATAR_FILE_NAME);
}

/**
 * アバター画像の相対パスを取得（DB保存用）
 * @param userSid ユーザーSID
 * @returns 相対パス（例: "users/{SID}/avatar.png"）
 */
export function getAvatarRelativePath(userSid: string): string {
  return getUserRelativePath(userSid, AVATAR_FILE_NAME);
}

/**
 * アバター画像を保存
 * @param userSid ユーザーSID
 * @param imageBuffer 画像のバッファ
 * @returns 保存されたファイルの相対パス
 */
export async function saveAvatar(
  userSid: string,
  imageBuffer: Buffer
): Promise<string> {
  try {
    const avatarPath = getAvatarPath(userSid);
    const userDir = path.dirname(avatarPath);

    // ユーザーディレクトリが存在しない場合は作成
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
      debug(MODULE_NAME, `ユーザーディレクトリを作成: ${userDir}`);
    }

    // 既存のアバターを削除（存在する場合）
    if (existsSync(avatarPath)) {
      await unlink(avatarPath);
      debug(MODULE_NAME, `既存のアバターを削除: ${avatarPath}`);
    }

    // アバター画像を保存
    await writeFile(avatarPath, imageBuffer);
    debug(MODULE_NAME, `アバター画像を保存: ${avatarPath}`);

    return getAvatarRelativePath(userSid);
  } catch (err) {
    error(MODULE_NAME, `アバター画像の保存に失敗: userSid=${userSid}`, err);
    throw err;
  }
}

/**
 * アバター画像を削除
 * @param userSid ユーザーSID
 */
export async function deleteAvatar(userSid: string): Promise<void> {
  try {
    const avatarPath = getAvatarPath(userSid);

    if (existsSync(avatarPath)) {
      await unlink(avatarPath);
      debug(MODULE_NAME, `アバター画像を削除: ${avatarPath}`);
    } else {
      debug(MODULE_NAME, `アバター画像が存在しません: ${avatarPath}`);
    }
  } catch (err) {
    error(MODULE_NAME, `アバター画像の削除に失敗: userSid=${userSid}`, err);
    throw err;
  }
}

/**
 * アバター画像が存在するかチェック
 * @param userSid ユーザーSID
 * @returns 存在する場合true
 */
export function avatarExists(userSid: string): boolean {
  const avatarPath = getAvatarPath(userSid);
  return existsSync(avatarPath);
}


