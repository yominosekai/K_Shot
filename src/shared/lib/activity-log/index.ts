import fs from 'fs';
import path from 'path';
import { getJSTTodayString, getJSTNowISOString } from '@/shared/lib/utils/timezone';
import { error } from '@/shared/lib/logger';
import { getUserDirectoryPath } from '@/shared/lib/file-system/user-storage';

const ACTIVITY_LOG_FILE = 'activity_log.json';
const ACTIVITY_STATE_FILE = 'activity_log_state.json';
const DRIVE_ERROR_PATTERNS = [
  'ドライブが存在しません',
  'ドライブ設定が完了していません',
  'ネットワークドライブが見つかりません',
];

type ActivityEventType = 'login' | 'material_view' | 'role_password_change';

interface ActivityLogEntry {
  eventType: ActivityEventType;
  timestamp: string;
  date: string;
  metadata?: Record<string, unknown>;
}

interface ActivityState {
  lastLoginDate?: string;
  lastOffset?: number;
}

function isDriveUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  const message = err.message || '';
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    return true;
  }
  return DRIVE_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

function ensureUserLogsDir(userId: string): string | null {
  try {
    const userDir = path.join(getUserDirectoryPath(userId), 'logs');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  } catch (err) {
    if (!isDriveUnavailableError(err)) {
      error('activity-log', `Failed to prepare logs directory for userId=${userId}`, err);
    }
    return null;
  }
}

function appendActivityEntry(userId: string, entry: ActivityLogEntry): void {
  const userDir = ensureUserLogsDir(userId);
  if (!userDir) {
    return;
  }
  try {
    const logPath = path.join(userDir, ACTIVITY_LOG_FILE);
    const line = JSON.stringify(entry);
    fs.appendFileSync(logPath, line + '\n', { encoding: 'utf-8' });
  } catch (err) {
    if (!isDriveUnavailableError(err)) {
      error('activity-log', `Failed to append activity entry for userId=${userId}`, err);
    }
  }
}

function readActivityState(userId: string): ActivityState {
  const userDir = ensureUserLogsDir(userId);
  if (!userDir) {
    return {};
  }
  try {
    const statePath = path.join(userDir, ACTIVITY_STATE_FILE);
    if (!fs.existsSync(statePath)) {
      return {};
    }
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content) as ActivityState;
  } catch (err) {
    if (!isDriveUnavailableError(err)) {
      error('activity-log', `Failed to read activity state for userId=${userId}`, err);
    }
    return {};
  }
}

function writeActivityState(userId: string, state: ActivityState): void {
  const userDir = ensureUserLogsDir(userId);
  if (!userDir) {
    return;
  }
  try {
    const statePath = path.join(userDir, ACTIVITY_STATE_FILE);
    fs.writeFileSync(statePath, JSON.stringify(state), { encoding: 'utf-8' });
  } catch (err) {
    if (!isDriveUnavailableError(err)) {
      error('activity-log', `Failed to write activity state for userId=${userId}`, err);
    }
  }
}
export function recordLoginActivityEvent(userId: string): void {
  const today = getJSTTodayString();
  const state = readActivityState(userId);

  if (state.lastLoginDate === today) {
    return;
  }

  const now = getJSTNowISOString();
  appendActivityEntry(userId, {
    eventType: 'login',
    timestamp: now,
    date: today,
  });

  writeActivityState(userId, {
    ...state,
    lastLoginDate: today,
  });
}

export function recordMaterialViewActivityEvent(userId: string, materialId: string): void {
  const today = getJSTTodayString();
  const now = getJSTNowISOString();

  appendActivityEntry(userId, {
    eventType: 'material_view',
    timestamp: now,
    date: today,
    metadata: {
      materialId,
    },
  });
}

export function recordRolePasswordChangeActivityEvent(
  userId: string,
  role: 'admin' | 'instructor'
): void {
  const today = getJSTTodayString();
  const now = getJSTNowISOString();

  appendActivityEntry(userId, {
    eventType: 'role_password_change',
    timestamp: now,
    date: today,
    metadata: {
      role,
      changedBy: userId,
    },
  });
}

