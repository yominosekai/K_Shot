// 端末単位の初期設定判定ユーティリティ

import fs from 'fs';
import path from 'path';
import os from 'os';
import { debug, error } from '../logger';

const MODULE_NAME = 'device-setup';
const SETUP_FLAG_FILE_NAME = 'device-setup-completed.json';

interface SetupFlagFile {
  setup_completed: boolean;
  completed_at: string;
}

function resolveDefaultCredentialsDir(): string {
  if (process.env.LMS_DEVICE_TOKEN_DIR) {
    return process.env.LMS_DEVICE_TOKEN_DIR;
  }

  if (process.platform === 'win32' && process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'k-shot', 'credentials');
  }

  return path.join(os.homedir(), '.k-shot', 'credentials');
}

function getSetupFlagFilePath(): string {
  const defaultDir = resolveDefaultCredentialsDir();
  return path.join(defaultDir, SETUP_FLAG_FILE_NAME);
}

/**
 * 端末で初期設定が完了しているか確認
 * @returns 初期設定が完了している場合true
 */
export function isDeviceSetupCompleted(): boolean {
  const flagPath = getSetupFlagFilePath();

  try {
    if (!fs.existsSync(flagPath)) {
      return false;
    }
    const raw = fs.readFileSync(flagPath, 'utf-8');
    const parsed = JSON.parse(raw) as SetupFlagFile;
    return parsed.setup_completed === true;
  } catch (err) {
    error(MODULE_NAME, '初期設定フラグの読み込みに失敗しました', err);
    return false;
  }
}

/**
 * 端末の初期設定完了フラグを保存
 */
export async function markDeviceSetupCompleted(): Promise<void> {
  const flagPath = getSetupFlagFilePath();
  const dir = path.dirname(flagPath);

  try {
    await fs.promises.mkdir(dir, { recursive: true }).catch((err) => {
      error(MODULE_NAME, '初期設定フラグディレクトリの作成に失敗しました', err);
      throw err;
    });

    const flagData: SetupFlagFile = {
      setup_completed: true,
      completed_at: new Date().toISOString(),
    };

    const content = JSON.stringify(flagData, null, 2);
    await fs.promises.writeFile(flagPath, content, 'utf-8');
    debug(MODULE_NAME, `端末初期設定完了フラグを保存しました: ${flagPath}`);
  } catch (err) {
    error(MODULE_NAME, '端末初期設定完了フラグの保存に失敗しました', err);
    throw err;
  }
}

