// ドライブ設定管理ユーティリティ

import { writeJSON } from '@/shared/lib/file-system/json';
import path from 'path';
import fs from 'fs';

const DRIVE_CONFIG_PATH = path.join(process.cwd(), 'data', 'config', 'drive.json');

export interface DriveConfig {
  networkPath: string; // ネットワークパス（UNCパス、例: "\\\\server\\share\\"）
  driveLetter: string; // ドライブレター（例: "H"）
  fullPath: string; // フルパス（例: "H:\\k_shot"）
  setupCompleted: boolean; // 初期設定完了フラグ
}

/**
 * ドライブ設定を取得（同期的）
 * @returns ドライブ設定、存在しない場合はnull
 */
export function getDriveConfig(): DriveConfig | null {
  try {
    if (!fs.existsSync(DRIVE_CONFIG_PATH)) {
      return null;
    }
    const content = fs.readFileSync(DRIVE_CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as DriveConfig;
  } catch (err) {
    console.error('[DriveConfig] 設定ファイルの読み込みエラー:', err);
    return null;
  }
}

/**
 * ドライブ設定を保存
 * @param config ドライブ設定
 */
export async function saveDriveConfig(config: DriveConfig): Promise<void> {
  try {
    // ディレクトリが存在しない場合は作成
    const configDir = path.dirname(DRIVE_CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    await writeJSON(DRIVE_CONFIG_PATH, config);
  } catch (err) {
    console.error('[DriveConfig] 設定ファイルの保存エラー:', err);
    throw err;
  }
}

/**
 * 初期設定が完了しているか確認
 * @returns 初期設定完了済みの場合true
 */
export function isSetupCompleted(): boolean {
  const config = getDriveConfig();
  return config !== null && config.setupCompleted === true;
}

export interface AvailableDriveLetter {
  letter: string;
  hasExistingFolder: boolean; // k_shotフォルダが既に存在するか
}

/**
 * 利用可能なドライブレターを取得
 * @returns 利用可能なドライブレターの配列（既存フォルダがあるドライブも含む）
 */
export function getAvailableDriveLetters(): AvailableDriveLetter[] {
  const available: AvailableDriveLetter[] = [];
  const SUB_FOLDER = 'k_shot';
  
  // A-Zをチェック（Cは除外）
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    
    // C（システムドライブ）は除外
    if (letter === 'C') {
      continue;
    }
    
    try {
      const drivePath = `${letter}:\\`;
      const folderPath = path.join(drivePath, SUB_FOLDER);
      
      // ドライブが存在するか確認
      const driveExists = fs.existsSync(drivePath);
      
      if (driveExists) {
        // ドライブが存在する場合、k_shotフォルダが存在するか確認
        const folderExists = fs.existsSync(folderPath);
        if (folderExists) {
          // 既存フォルダがあるドライブは選択可能
          available.push({
            letter,
            hasExistingFolder: true,
          });
        }
        // フォルダが存在しない場合はスキップ（既存のドライブでフォルダがない場合は選択不可）
      } else {
        // ドライブが存在しない場合は利用可能
        available.push({
          letter,
          hasExistingFolder: false,
        });
      }
    } catch (err) {
      // エラーが発生した場合は利用可能とみなす
      available.push({
        letter,
        hasExistingFolder: false,
      });
    }
  }
  
  return available;
}

