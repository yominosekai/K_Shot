import fs from 'fs';
import path from 'path';
import { once } from 'events';
import { getActivityAggregatorDb } from './local-db';
import { error, debug } from '@/shared/lib/logger';
import { getJSTDateString, getJSTTodayString } from '@/shared/lib/utils/timezone';
import { getUsersRootPath } from '@/shared/lib/file-system/user-storage';

const ACTIVITY_LOG_FILENAME = 'logs/activity_log.json';

interface ProcessedLogState {
  user_id: string;
  log_path: string;
  last_offset: number;
  updated_at: string;
}

interface DailyCounts {
  loginUsers: number;
  materialViews: number;
}

export function getUsersDir(): string | null {
  try {
    const usersDir = getUsersRootPath();
    if (!fs.existsSync(usersDir)) {
      return null;
    }
    return usersDir;
  } catch (err) {
    error('activity-aggregator', 'Failed to resolve users directory', err);
    return null;
  }
}

function getProcessedLogState(userId: string, logPath: string) {
  const db = getActivityAggregatorDb();
  const stmt = db
    .prepare('SELECT user_id, log_path, last_offset, updated_at FROM processed_logs WHERE user_id = ?');
  const row = stmt.get(userId) as ProcessedLogState | undefined;
  if (!row) {
    return {
      user_id: userId,
      log_path: logPath,
      last_offset: 0,
      updated_at: new Date(0).toISOString(),
    };
  }
  return row;
}

function updateProcessedLogState(userId: string, logPath: string, lastOffset: number) {
  const db = getActivityAggregatorDb();
  const stmt = db.prepare(`
    INSERT INTO processed_logs (user_id, log_path, last_offset, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      log_path = excluded.log_path,
      last_offset = excluded.last_offset,
      updated_at = excluded.updated_at
  `);
  stmt.run(userId, logPath, lastOffset, new Date().toISOString());
}

async function processLogFile(userSid: string, logPath: string): Promise<void> {
  if (!fs.existsSync(logPath)) {
    return;
  }

  const state = getProcessedLogState(userSid, logPath);
  const stats = fs.statSync(logPath);

  if (stats.size === state.last_offset) {
    return;
  }

  if (stats.size < state.last_offset) {
    // ファイルが縮小した場合は再処理を避けるため、オフセットをリセット
    state.last_offset = 0;
  }

  const stream = fs.createReadStream(logPath, {
    encoding: 'utf-8',
    start: state.last_offset,
  });

  let bytesRead = 0;
  let remainder = '';
  const db = getActivityAggregatorDb();
  const insertLogin = db.prepare(`
    INSERT INTO login_events (date, user_id)
    VALUES (?, ?)
    ON CONFLICT(date, user_id) DO NOTHING
  `);
  const insertMaterialView = db.prepare(`
    INSERT INTO material_view_daily (date, view_count)
    VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET view_count = material_view_daily.view_count + 1
  `);

  stream.on('data', (chunk: string | Buffer) => {
    const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
    bytesRead += Buffer.byteLength(chunkStr);
    const lines = (remainder + chunkStr).split('\n');
    remainder = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const entry = JSON.parse(trimmed) as {
          eventType: string;
          date: string;
          metadata?: { materialId?: string };
        };
        if (entry.eventType === 'login') {
          insertLogin.run(entry.date, userSid);
        } else if (entry.eventType === 'material_view') {
          insertMaterialView.run(entry.date);
        }
      } catch (err) {
        error('activity-aggregator', `Failed to parse activity log entry for userSid=${userSid}`, err);
      }
    }
  });

  let streamErrored = false;
  stream.on('error', (err) => {
    streamErrored = true;
    error('activity-aggregator', `Failed to read activity log for userSid=${userSid}`, err);
  });

  try {
    await once(stream, 'end');
  } catch {
    streamErrored = true;
  }

  // 残りの行を処理
  if (!streamErrored && remainder.trim()) {
    try {
      const entry = JSON.parse(remainder.trim()) as {
        eventType: string;
        date: string;
      };
      if (entry.eventType === 'login') {
        insertLogin.run(entry.date, userSid);
      } else if (entry.eventType === 'material_view') {
        insertMaterialView.run(entry.date);
      }
    } catch (err) {
      error('activity-aggregator', `Failed to parse trailing activity log entry for userSid=${userSid}`, err);
    }
  }

  if (streamErrored) {
    return;
  }

  const newOffset = state.last_offset + bytesRead;
  updateProcessedLogState(userSid, logPath, newOffset);
}

/**
 * ローカルDBから最新の処理済み日付を取得
 */
function getLatestProcessedDate(): string | null {
  try {
    const db = getActivityAggregatorDb();
    const stmt = db.prepare(`
      SELECT MAX(date) as latest_date
      FROM login_events
    `);
    const row = stmt.get() as { latest_date: string | null } | undefined;
    return row?.latest_date || null;
  } catch (err) {
    error('activity-aggregator', 'Failed to get latest processed date', err);
    return null;
  }
}

export async function updateActivityAggregation(): Promise<void> {
  const today = getJSTTodayString();
  const latestDate = getLatestProcessedDate();

  // 今日のデータが既に集計済みの場合はスキップ
  if (latestDate === today) {
    debug('activity-aggregator', `今日のデータは既に集計済み: ${today}`);
    return;
  }

  debug('activity-aggregator', `集計処理を開始: 最新日付=${latestDate || 'なし'}, 今日=${today}`);

  const usersDir = getUsersDir();
  if (!usersDir) {
    return;
  }

  const userDirs = fs.readdirSync(usersDir, { withFileTypes: true }).filter((dirent) => dirent.isDirectory());

  for (const dirent of userDirs) {
    const userSid = dirent.name;
    const logPath = path.join(usersDir, userSid, ACTIVITY_LOG_FILENAME);
    await processLogFile(userSid, logPath);
  }

  debug('activity-aggregator', `集計処理完了: 今日=${today}`);
}

export function getDailyLoginCounts(days: number): Map<string, DailyCounts> {
  const db = getActivityAggregatorDb();
  const startDateStr = getJSTDateString(days);

  const loginStmt = db.prepare(`
    SELECT date, COUNT(*) as count
    FROM login_events
    WHERE date >= ?
    GROUP BY date
  `);
  const loginRows = loginStmt.all(startDateStr) as Array<{ date: string; count: number }>;

  const materialStmt = db.prepare(`
    SELECT date, view_count as count
    FROM material_view_daily
    WHERE date >= ?
  `);
  const materialRows = materialStmt.all(startDateStr) as Array<{ date: string; count: number }>;

  const result = new Map<string, DailyCounts>();

  loginRows.forEach((row) => {
    result.set(row.date, {
      loginUsers: row.count,
      materialViews: 0,
    });
  });

  materialRows.forEach((row) => {
    const existing = result.get(row.date);
    if (existing) {
      existing.materialViews = row.count;
    } else {
      result.set(row.date, {
        loginUsers: 0,
        materialViews: row.count,
      });
    }
  });

  return result;
}

