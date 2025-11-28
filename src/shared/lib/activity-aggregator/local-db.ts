import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { error, info } from '@/shared/lib/logger';

const LOCAL_DIR = path.join(process.cwd(), 'data', 'local');
const DB_PATH = path.join(LOCAL_DIR, 'activity-aggregator.db');

let dbInstance: Database.Database | null = null;

function ensureDir(): void {
  if (!fs.existsSync(LOCAL_DIR)) {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
  }
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS processed_logs (
      user_sid TEXT PRIMARY KEY,
      log_path TEXT NOT NULL,
      last_offset INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_events (
      date TEXT NOT NULL,
      user_sid TEXT NOT NULL,
      PRIMARY KEY (date, user_sid)
    );

    CREATE TABLE IF NOT EXISTS material_view_daily (
      date TEXT PRIMARY KEY,
      view_count INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export function getActivityAggregatorDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    ensureDir();
    dbInstance = new Database(DB_PATH);
    initializeSchema(dbInstance);
    info('activity-aggregator', `Local activity aggregator DB initialized at ${DB_PATH}`);
    return dbInstance;
  } catch (err) {
    error('activity-aggregator', 'Failed to initialize local activity aggregator DB', err);
    throw err;
  }
}


