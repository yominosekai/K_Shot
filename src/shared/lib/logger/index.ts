// ロガーユーティリティ（ログレベル制御対応）

import fs from 'fs';
import path from 'path';
import { readDeviceToken, verifyTokenSignature } from '@/shared/lib/auth/device-token';
import { getUserSubPath } from '@/shared/lib/file-system/user-storage';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
}

// デフォルト設定（環境変数から読み込み可能）
const getDefaultConfig = (): LogConfig => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  let level = LogLevel.INFO; // デフォルトはINFO

  if (envLevel === 'DEBUG') level = LogLevel.DEBUG;
  else if (envLevel === 'INFO') level = LogLevel.INFO;
  else if (envLevel === 'WARN') level = LogLevel.WARN;
  else if (envLevel === 'ERROR') level = LogLevel.ERROR;

  // 開発環境ではDEBUGを有効化
  if (process.env.NODE_ENV === 'development' && !envLevel) {
    level = LogLevel.DEBUG;
  }

  return {
    level,
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE !== 'false',
  };
};

let config: LogConfig = getDefaultConfig();

/**
 * ログレベルを設定
 */
export function setLogLevel(level: LogLevel): void {
  config.level = level;
}

/**
 * ログ設定を取得
 */
export function getLogConfig(): LogConfig {
  return { ...config };
}

/**
 * ログを出力するかどうかを判定
 */
function shouldLog(level: LogLevel): boolean {
  return level >= config.level;
}

/**
 * ログレベルを文字列に変換
 */
function levelToString(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return 'DEBUG';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.WARN:
      return 'WARN';
    case LogLevel.ERROR:
      return 'ERROR';
    default:
      return 'UNKNOWN';
  }
}

/**
 * 現在のユーザー識別子を取得（ローカル証明ファイルベース）
 */
async function getCurrentUserSID(): Promise<string | null> {
  try {
    const token = readDeviceToken();
    if (!token) {
      return null;
    }

    if (!verifyTokenSignature(token)) {
      return null;
    }

    return token.user_sid;
  } catch {
    return null;
  }
}

/**
 * エラーログファイルのパスを取得
 * @param userSid ユーザーSID（指定しない場合はサーバーを起動しているユーザーのSIDを使用）
 * @returns ログファイルのパス、ドライブ設定が完了していない場合はnull
 */
function getErrorLogPath(userSid?: string): string | null {
  try {
    const targetKey = userSid ?? 'system';
    return getUserSubPath(targetKey, 'logs', 'errors.json');
  } catch {
    return null;
  }
}

/**
 * エラーログをファイルに記録（非同期、エラーは無視）
 */
async function writeErrorLogToFile(
  module: string,
  message: string,
  data: any,
  userSid?: string
): Promise<void> {
  if (!config.enableFile) {
    return;
  }

  try {
    // userSidが指定されていない場合は、サーバーを起動しているユーザーのSIDを取得
    let targetSid: string | undefined = userSid;
    if (!targetSid) {
      const currentSid = await getCurrentUserSID();
      // SIDが取得できない場合は記録しない（コンソール出力のみ）
      if (!currentSid) {
        return;
      }
      targetSid = currentSid;
    }

    const logPath = getErrorLogPath(targetSid);
    // ドライブ設定が完了していない場合はファイルへの書き込みをスキップ
    if (!logPath) {
      return;
    }
    
    const logDir = path.dirname(logPath);

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();

    const logEntry: Record<string, any> = {
      timestamp,
      level: 'error',
      module,
      message,
    };

    // userSidを追加（指定された場合と取得した場合の両方）
    if (targetSid) {
      logEntry.user_sid = targetSid;
    }

    // エラーオブジェクトの処理
    if (data) {
      if (data instanceof Error) {
        logEntry.error = {
          message: data.message,
          code: (data as any).code || undefined,
          stack: data.stack,
        };
      } else if (typeof data === 'object') {
        logEntry.details = data;
      } else {
        logEntry.details = { data };
      }
    }

    const logLine = JSON.stringify(logEntry) + '\n';

    // UTF-8で追記（文字化け防止）
    fs.appendFileSync(logPath, logLine, { encoding: 'utf-8' });
  } catch (err) {
    // ファイル書き込み失敗は致命的ではないため、必要に応じてデバッグ出力のみ行う
    if (config.enableConsole && config.level <= LogLevel.DEBUG) {
      console.warn('[logger] エラーログのファイル書き込みに失敗:', err);
    }
  }
}

/**
 * ログ出力の共通処理
 */
const DRIVE_SETUP_PATTERNS = [
  'ドライブが存在しません',
  'ドライブ設定が完了していません',
];

function shouldSuppressError(level: LogLevel, data?: any): boolean {
  if (level !== LogLevel.ERROR) {
    return false;
  }
  // デバッグモードでは抑制しない
  if (config.level === LogLevel.DEBUG) {
    return false;
  }
  if (data instanceof Error) {
    const message = data.message || '';
    return DRIVE_SETUP_PATTERNS.some((pattern) => message.includes(pattern));
  }
  return false;
}

function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: any,
  userSid?: string
): void {
  if (!shouldLog(level)) {
    return;
  }

  if (shouldSuppressError(level, data)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const levelStr = levelToString(level);
  const prefix = `[${timestamp}] [${levelStr}] [${module}]`;

  if (config.enableConsole) {
    if (data !== undefined) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  // ERRORレベルのみファイルに出力
  if (level === LogLevel.ERROR && config.enableFile) {
    // 非同期で実行（エラーが発生しても業務処理に影響しない）
    writeErrorLogToFile(module, message, data, userSid).catch(() => {
      // エラーは既にwriteErrorLogToFile内で処理されている
    });
  }
}

/**
 * DEBUGログ
 */
export function debug(module: string, message: string, data?: any): void {
  log(LogLevel.DEBUG, module, message, data);
}

/**
 * INFOログ
 */
export function info(module: string, message: string, data?: any): void {
  log(LogLevel.INFO, module, message, data);
}

/**
 * WARNログ
 */
export function warn(module: string, message: string, data?: any): void {
  log(LogLevel.WARN, module, message, data);
}

/**
 * ERRORログ
 * @param module モジュール名
 * @param message エラーメッセージ
 * @param data エラーデータ（Errorオブジェクトまたは任意のデータ）
 * @param userSid ユーザー識別子（オプション、指定した場合はusers/{hash}/logs/errors.jsonに記録）
 */
export function error(module: string, message: string, data?: any, userSid?: string): void {
  log(LogLevel.ERROR, module, message, data, userSid);
}

