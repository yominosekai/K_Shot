// ネットワークドライブ設定
// 注意: このファイルはサーバー側（API Route、Server Components）でのみ使用してください
// クライアント側コンポーネントからは直接インポートしないでください

import { getDriveConfig } from '@/shared/lib/utils/drive-config';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'drive';

// エラーログを1回だけ出力するためのフラグ
let hasLoggedDriveConfigError = false;

// サブフォルダ名（固定）
export const SUB_FOLDER = 'k_shot';

/**
 * データディレクトリのパスを取得（動的）
 * 設定ファイル（data/config/drive.json）から読み込む
 * 設定ファイルが存在しない場合はエラーを投げる
 * @throws {Error} ドライブ設定が存在しない場合
 */
export function getDataDir(): string {
  const config = getDriveConfig();
  
  if (!config || !config.driveLetter) {
    // エラーログは最初の1回だけ出力
    if (!hasLoggedDriveConfigError) {
      error(MODULE_NAME, 'ドライブ設定が完了していません。初期設定画面で設定を行ってください。');
      hasLoggedDriveConfigError = true;
    }
    throw new Error('ドライブ設定が完了していません。初期設定画面で設定を行ってください。');
  }
  
  return `${config.driveLetter}:\\${SUB_FOLDER}`;
}

/**
 * ネットワークパスを取得（動的）
 */
export function getNetworkPath(): string | null {
  const config = getDriveConfig();
  return config?.networkPath || null;
}

/**
 * 後方互換性のため、DRIVE_CONFIGオブジェクトも提供
 */
export const DRIVE_CONFIG = {
  SUB_FOLDER,
  get DATA_DIR(): string {
    return getDataDir();
  },
  get NETWORK_PATH(): string | null {
    return getNetworkPath();
  },
};

