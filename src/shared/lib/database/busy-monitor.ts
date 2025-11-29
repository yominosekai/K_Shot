// SQLITE_BUSY監視ログ（ユーザー別ログファイル）

import fs from 'fs';
import path from 'path';
import { getUserSubPath, getUsersRootPath } from '@/shared/lib/file-system/user-storage';

const MODULE_NAME = 'busy-monitor';

/**
 * SQLITE_BUSY監視ログファイルのパスを取得
 * @param userId ユーザーID
 * @returns ログファイルのパス
 */
function getBusyLogPath(userId: string): string {
  return getUserSubPath(userId, 'logs', 'sqlite_busy.log');
}

/**
 * SQLITE_BUSYエラーをログに記録
 * @param userId ユーザーID
 * @param operation 操作名（例：setSystemConfig, uploadMaterial, updateMaterial）
 * @param retryCount リトライ回数
 * @param success 最終的に成功したか
 * @param additionalInfo 追加情報（materialId, keyなど）
 */
export async function logBusyError(
  userId: string,
  operation: string,
  retryCount: number,
  success: boolean,
  additionalInfo?: Record<string, any>
): Promise<void> {
  try {
    const logPath = getBusyLogPath(userId);
    const logDir = path.dirname(logPath);
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      userId,
      operation,
      retryCount,
      success,
      ...(additionalInfo && Object.keys(additionalInfo).length > 0 ? { additionalInfo } : {}),
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // UTF-8で追記（文字化け防止）
    fs.appendFileSync(logPath, logLine, { encoding: 'utf-8' });
  } catch (err) {
    // ログファイルへの書き込み失敗は致命的ではないので、エラーを無視
    // コンソールにのみ出力
    console.error(`[${MODULE_NAME}] SQLITE_BUSYログの書き込みに失敗:`, err);
  }
}

/**
 * エラーログファイルのパスを取得
 * @param userId ユーザーID
 * @returns ログファイルのパス
 */
function getErrorLogPath(userId: string): string {
  return getUserSubPath(userId, 'logs', 'errors.json');
}

/**
 * エラーログを読み取る（管理者用）
 * @param userId ユーザーID（指定しない場合は全ユーザー）
 * @param limit 取得件数（最新のN件、0の場合は全件）
 * @returns ログエントリの配列
 */
export function readErrorLog(userId?: string, limit: number = 0): Array<Record<string, any>> {
  try {
    const usersDir = getUsersRootPath();
    
    if (!fs.existsSync(usersDir)) {
      return [];
    }
    
    const entries: Array<Record<string, any>> = [];

    if (userId) {
      // 特定ユーザーのログを読み取る
      const logPath = getErrorLogPath(userId);
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            entries.push(JSON.parse(line));
          } catch {
            // JSON解析エラーは無視
          }
        });
      }
    } else {
      // 全ユーザーのログを読み取る
      const userDirs = fs.readdirSync(usersDir, { withFileTypes: true });
      
      for (const userDir of userDirs) {
        if (userDir.isDirectory()) {
          const logPath = path.join(usersDir, userDir.name, 'logs', 'errors.json');
          if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
              try {
                entries.push(JSON.parse(line));
              } catch {
                // JSON解析エラーは無視
              }
            });
          }
        }
      }
    }
    
    // タイムスタンプでソート（新しい順）
    entries.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    
    // limitが0の場合は全件、それ以外は最新のlimit件を返す
    if (limit > 0) {
      return entries.slice(0, limit);
    }
    return entries;
  } catch (err) {
    console.error(`[${MODULE_NAME}] エラーログの読み取りに失敗:`, err);
    return [];
  }
}

/**
 * SQLITE_BUSY監視ログを読み取る（管理者用）
 * @param userId ユーザーID（指定しない場合は全ユーザー）
 * @param limit 取得件数（最新のN件、0の場合は全件）
 * @returns ログエントリの配列
 */
export function readBusyLog(userId?: string, limit: number = 0): Array<Record<string, any>> {
  try {
    const usersDir = getUsersRootPath();
    
    if (!fs.existsSync(usersDir)) {
      return [];
    }
    
    const entries: Array<Record<string, any>> = [];

    if (userId) {
      // 特定ユーザーのログを読み取る
      const logPath = getBusyLogPath(userId);
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            entries.push(JSON.parse(line));
          } catch {
            // JSON解析エラーは無視
          }
        });
      }
    } else {
      // 全ユーザーのログを読み取る
      const userDirs = fs.readdirSync(usersDir, { withFileTypes: true });
      
      for (const userDir of userDirs) {
        if (userDir.isDirectory()) {
          const logPath = path.join(usersDir, userDir.name, 'logs', 'sqlite_busy.log');
          if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
              try {
                entries.push(JSON.parse(line));
              } catch {
                // JSON解析エラーは無視
              }
            });
          }
        }
      }
    }
    
    // タイムスタンプでソート（新しい順）
    entries.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    
    // limitが0の場合は全件、それ以外は最新のlimit件を返す
    if (limit > 0) {
      return entries.slice(0, limit);
    }
    return entries;
  } catch (err) {
    console.error(`[${MODULE_NAME}] SQLITE_BUSYログの読み取りに失敗:`, err);
    return [];
  }
}

