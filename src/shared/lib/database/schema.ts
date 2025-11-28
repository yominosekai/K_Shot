// SQLiteデータベーススキーマ定義

import { getDatabase } from './db';
import { info, error, debug } from '../logger';
import { hashPassword } from '../utils/password';

const MODULE_NAME = 'schema';
type SqliteDatabase = ReturnType<typeof getDatabase>;

type Statement = string;

const TABLE_STATEMENTS: Statement[] = [
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_id TEXT DEFAULT '',
    level INTEGER DEFAULT 0,
    created_date TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT DEFAULT '',
    path TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_date TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    uuid TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category_id TEXT,
    type TEXT NOT NULL,
    difficulty TEXT,
    estimated_hours REAL,
    tags TEXT DEFAULT '',
    folder_path TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    is_published INTEGER DEFAULT 1,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );`,
  `CREATE TABLE IF NOT EXISTS material_revisions (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_by TEXT,
    updated_by_name TEXT,
    comment TEXT,
    updated_date TEXT NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(sid) ON DELETE SET NULL
  );`,
  `CREATE TABLE IF NOT EXISTS material_likes (
    material_id TEXT NOT NULL,
    user_sid TEXT NOT NULL,
    created_date TEXT NOT NULL,
    PRIMARY KEY (material_id, user_sid),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS material_views (
    material_id TEXT NOT NULL,
    user_sid TEXT NOT NULL,
    view_date TEXT NOT NULL,
    PRIMARY KEY (material_id, user_sid, view_date),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_date TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS users (
    sid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    department_id TEXT,
    department TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_date TEXT NOT NULL,
    last_login TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    skills TEXT,
    certifications TEXT,
    mos TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS device_tokens (
    token TEXT PRIMARY KEY,
    user_sid TEXT NOT NULL,
    signature TEXT NOT NULL,
    device_label TEXT,
    issued_at TEXT NOT NULL,
    last_used TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    signature_version INTEGER DEFAULT 1,
    FOREIGN KEY (user_sid) REFERENCES users(sid) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    updated_by TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS material_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_date TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS difficulty_levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_date TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_sid TEXT NOT NULL,
    from_user_sid TEXT NOT NULL,
    material_id TEXT,
    type TEXT NOT NULL DEFAULT 'material_notification',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_date TEXT NOT NULL,
    read_date TEXT,
    FOREIGN KEY (user_sid) REFERENCES users(sid) ON DELETE CASCADE,
    FOREIGN KEY (from_user_sid) REFERENCES users(sid) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS material_comments (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL,
    parent_comment_id TEXT,
    created_by TEXT NOT NULL,
    content TEXT NOT NULL,
    is_private INTEGER DEFAULT 0,
    attachments TEXT,
    links TEXT,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES material_comments(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(sid) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS user_activities (
    date TEXT NOT NULL,
    user_sid TEXT NOT NULL,
    created_date TEXT NOT NULL,
    PRIMARY KEY (date, user_sid),
    FOREIGN KEY (user_sid) REFERENCES users(sid) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS feedback_metadata (
    id TEXT PRIMARY KEY,
    user_sid TEXT NOT NULL,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL,
    is_public INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    has_response INTEGER DEFAULT 0,
    response_date TEXT,
    response_by TEXT,
    FOREIGN KEY (user_sid) REFERENCES users(sid) ON DELETE CASCADE
  );`
];

const INDEX_STATEMENTS: Statement[] = [
  'CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);',
  'CREATE INDEX IF NOT EXISTS idx_materials_folder_path ON materials(folder_path);',
  'CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);',
  'CREATE INDEX IF NOT EXISTS idx_materials_updated_date ON materials(updated_date);',
  'CREATE INDEX IF NOT EXISTS idx_material_revisions_material_id ON material_revisions(material_id);',
  'CREATE INDEX IF NOT EXISTS idx_material_revisions_updated_date ON material_revisions(updated_date);',
  'CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);',
  'CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);',
  'CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);',
  'CREATE INDEX IF NOT EXISTS idx_material_likes_material_id ON material_likes(material_id);',
  'CREATE INDEX IF NOT EXISTS idx_material_likes_user_sid ON material_likes(user_sid);',
  'CREATE INDEX IF NOT EXISTS idx_material_views_material_id ON material_views(material_id);',
  'CREATE INDEX IF NOT EXISTS idx_material_views_user_sid ON material_views(user_sid);',
  'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);',
  'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_users_created_date ON users(created_date);',
  'CREATE INDEX IF NOT EXISTS idx_notifications_user_sid ON notifications(user_sid);',
  'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);',
  'CREATE INDEX IF NOT EXISTS idx_notifications_created_date ON notifications(created_date);',
  'CREATE INDEX IF NOT EXISTS idx_material_types_sort_order ON material_types(sort_order);',
  'CREATE INDEX IF NOT EXISTS idx_difficulty_levels_sort_order ON difficulty_levels(sort_order);',
  'CREATE INDEX IF NOT EXISTS idx_material_comments_material_id ON material_comments(material_id);',
  'CREATE INDEX IF NOT EXISTS idx_material_comments_parent_id ON material_comments(parent_comment_id);',
  'CREATE INDEX IF NOT EXISTS idx_material_comments_created_by ON material_comments(created_by);',
  'CREATE INDEX IF NOT EXISTS idx_material_comments_is_private ON material_comments(is_private);',
  'CREATE INDEX IF NOT EXISTS idx_user_activities_date ON user_activities(date);',
  'CREATE INDEX IF NOT EXISTS idx_user_activities_user_sid ON user_activities(user_sid);',
  'CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);',
  'CREATE INDEX IF NOT EXISTS idx_device_tokens_user_sid ON device_tokens(user_sid);',
  'CREATE INDEX IF NOT EXISTS idx_feedback_metadata_user_sid ON feedback_metadata(user_sid);',
  'CREATE INDEX IF NOT EXISTS idx_feedback_metadata_created_date ON feedback_metadata(created_date);',
  'CREATE INDEX IF NOT EXISTS idx_feedback_metadata_status ON feedback_metadata(status);'
];

const DEFAULT_MATERIAL_TYPES = [
  { id: '1', name: 'ドキュメント', description: '文書・資料', sort_order: 1 },
  { id: '2', name: 'プレゼンテーション', description: 'プレゼン資料', sort_order: 2 },
  { id: '3', name: '動画', description: '動画コンテンツ', sort_order: 3 },
  { id: '4', name: 'リンク', description: '外部リンク', sort_order: 4 },
  { id: '5', name: 'その他', description: 'その他のコンテンツ', sort_order: 5 },
] as const;

const DEFAULT_DIFFICULTIES = [
  { id: 'beginner', name: '初級', description: '初心者向け', sort_order: 1 },
  { id: 'intermediate', name: '中級', description: '中級者向け', sort_order: 2 },
  { id: 'advanced', name: '上級', description: '上級者向け', sort_order: 3 },
] as const;

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'スレッドハンティング', description: '脅威の能動的な探索と検出', parent_id: '', level: 1 },
  { id: '2', name: 'マルウェア解析', description: 'マルウェアの動作解析と対策', parent_id: '', level: 1 },
  { id: '3', name: 'インシデント対応', description: 'セキュリティインシデントへの対応と復旧', parent_id: '', level: 1 },
  { id: '4', name: 'デジタルフォレンジック', description: 'デジタル証拠の収集と分析', parent_id: '', level: 1 },
  { id: '5', name: 'ペネトレーションテスト', description: 'セキュリティ脆弱性の検証と評価', parent_id: '', level: 1 },
  { id: '6', name: 'SOC運用', description: 'セキュリティオペレーションセンターの運用', parent_id: '', level: 1 },
  { id: '7', name: 'ネットワークセキュリティ', description: 'ネットワークレベルのセキュリティ対策', parent_id: '', level: 1 },
  { id: '8', name: 'アプリケーションセキュリティ', description: 'アプリケーションレベルのセキュリティ対策', parent_id: '', level: 1 },
  { id: '9', name: 'クラウドセキュリティ', description: 'クラウド環境のセキュリティ対策', parent_id: '', level: 1 },
  { id: '10', name: 'セキュリティ運用', description: 'セキュリティの日常的な運用と管理', parent_id: '', level: 1 },
] as const;

export function initializeSchema(): void {
  const db = getDatabase();

  try {
    runStatements(db, TABLE_STATEMENTS);
    runStatements(db, INDEX_STATEMENTS);

    const now = new Date().toISOString();
    ensureRoleChangePasswords(db, now);
    ensureDefaultMaterialTypes(db, now);
    ensureDefaultDifficulties(db, now);
    ensureDefaultCategories(db, now);

    migrateMaterialRevisions(db);
    migrateFeedbackMetadata(db);

    info(MODULE_NAME, 'データベーススキーマを初期化しました');
  } catch (err) {
    error(MODULE_NAME, 'スキーマ初期化エラー:', err);
    throw err;
  }
}

function runStatements(db: SqliteDatabase, statements: Statement[]): void {
  for (const stmt of statements) {
    db.exec(stmt);
  }
}

function ensureRoleChangePasswords(db: SqliteDatabase, now: string): void {
  try {
    const adminKey = 'role_change_password_hash_admin';
    const instructorKey = 'role_change_password_hash_instructor';

    if (!db.prepare('SELECT key FROM system_config WHERE key = ?').get(adminKey)) {
      const adminPasswordHash = hashPassword('admin');
      db.prepare('INSERT INTO system_config (key, value, updated_date, updated_by) VALUES (?, ?, ?, ?)')
        .run(adminKey, adminPasswordHash, now, 'system');
      info(MODULE_NAME, 'デフォルト管理者権限変更パスワードを設定しました');
    }

    if (!db.prepare('SELECT key FROM system_config WHERE key = ?').get(instructorKey)) {
      const instructorPasswordHash = hashPassword('instructor');
      db.prepare('INSERT INTO system_config (key, value, updated_date, updated_by) VALUES (?, ?, ?, ?)')
        .run(instructorKey, instructorPasswordHash, now, 'system');
      info(MODULE_NAME, 'デフォルト教育者権限変更パスワードを設定しました');
    }
  } catch (err) {
    error(MODULE_NAME, 'デフォルトパスワード設定エラー:', err);
  }
}

function ensureDefaultMaterialTypes(db: SqliteDatabase, now: string): void {
  try {
    const typeCount = db.prepare('SELECT COUNT(*) as count FROM material_types').get() as { count: number };
    if (typeCount.count === 0) {
      const insertType = db.prepare(`
        INSERT INTO material_types (id, name, description, sort_order, created_date)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const type of DEFAULT_MATERIAL_TYPES) {
        insertType.run(type.id, type.name, type.description, type.sort_order, now);
      }
      info(MODULE_NAME, `デフォルト資料タイプを${DEFAULT_MATERIAL_TYPES.length}件設定しました`);
      return;
    }

    // 既存IDの整合性チェック（UUIDや文字列を連番に揃える）
    const existingTypes = db
      .prepare('SELECT id, name FROM material_types ORDER BY sort_order, created_date')
      .all() as Array<{ id: string; name: string }>;
    const hasNonNumericIds = existingTypes.some((t) => !/^\d+$/.test(t.id));

    if (!hasNonNumericIds) return;

    debug(MODULE_NAME, '既存の非数値IDタイプを連番に変換します');
    const idMapping = new Map<string, string>();
    let nextId = findNextNumericId(existingTypes);

    for (const type of existingTypes) {
      if (!/^\d+$/.test(type.id)) {
        idMapping.set(type.id, String(nextId));
        nextId += 1;
      }
    }

    if (idMapping.size === 0) return;

    const transaction = db.transaction(() => {
      for (const [oldId, newId] of idMapping) {
        db.prepare('UPDATE material_types SET id = ? WHERE id = ?').run(newId, oldId);
        const materialCount = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE type = ?')
          .get(oldId) as { count: number };
        if (materialCount.count > 0) {
          db.prepare('UPDATE materials SET type = ? WHERE type = ?').run(newId, oldId);
          debug(MODULE_NAME, `materials.typeを更新: ${oldId} → ${newId} (${materialCount.count}件)`);
        }
      }
    });

    transaction();
    debug(MODULE_NAME, `非数値IDタイプを連番に変換完了: ${idMapping.size}件`);
  } catch (err) {
    error(MODULE_NAME, 'デフォルト資料タイプ設定エラー:', err);
  }
}

function findNextNumericId(types: Array<{ id: string }>): number {
  let nextId = 1;
  for (const type of types) {
    if (/^\d+$/.test(type.id)) {
      const numId = parseInt(type.id, 10);
      if (numId >= nextId) {
        nextId = numId + 1;
      }
    }
  }
  return nextId;
}

function ensureDefaultDifficulties(db: SqliteDatabase, now: string): void {
  try {
    const difficultyCount = db.prepare('SELECT COUNT(*) as count FROM difficulty_levels').get() as { count: number };
    if (difficultyCount.count > 0) return;

    const insertDifficulty = db.prepare(`
      INSERT INTO difficulty_levels (id, name, description, sort_order, created_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const difficulty of DEFAULT_DIFFICULTIES) {
      insertDifficulty.run(difficulty.id, difficulty.name, difficulty.description, difficulty.sort_order, now);
    }
    info(MODULE_NAME, `デフォルト難易度を${DEFAULT_DIFFICULTIES.length}件設定しました`);
  } catch (err) {
    error(MODULE_NAME, 'デフォルト難易度設定エラー:', err);
  }
}

function ensureDefaultCategories(db: SqliteDatabase, now: string): void {
  try {
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
    if (categoryCount.count > 0) return;

    const insertCategory = db.prepare(`
      INSERT INTO categories (id, name, description, parent_id, level, created_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const category of DEFAULT_CATEGORIES) {
      insertCategory.run(
        category.id,
        category.name,
        category.description,
        category.parent_id,
        category.level,
        now
      );
    }
    info(MODULE_NAME, `デフォルトカテゴリを${DEFAULT_CATEGORIES.length}件設定しました`);
  } catch (err) {
    error(MODULE_NAME, 'デフォルトカテゴリ設定エラー:', err);
  }
}

function migrateMaterialRevisions(db: SqliteDatabase): void {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='material_revisions'`)
      .get();
    if (!tableExists) return;

    const columns = db
      .prepare('PRAGMA table_info(material_revisions)')
      .all() as Array<{ name: string; notnull: number }>;
    const updatedByColumn = columns.find((col) => col.name === 'updated_by');

    if (!updatedByColumn || updatedByColumn.notnull !== 1) return;

    debug(MODULE_NAME, 'material_revisionsテーブルのupdated_byカラムのNOT NULL制約を削除します');
    db.exec(`
      CREATE TABLE material_revisions_temp AS SELECT * FROM material_revisions;
      DROP TABLE material_revisions;
      CREATE TABLE material_revisions (
        id TEXT PRIMARY KEY,
        material_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_by TEXT,
        updated_by_name TEXT,
        comment TEXT,
        updated_date TEXT NOT NULL,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(sid) ON DELETE SET NULL
      );
      INSERT INTO material_revisions SELECT * FROM material_revisions_temp;
      DROP TABLE material_revisions_temp;
      CREATE INDEX IF NOT EXISTS idx_material_revisions_material_id ON material_revisions(material_id);
      CREATE INDEX IF NOT EXISTS idx_material_revisions_updated_date ON material_revisions(updated_date);
    `);

    debug(MODULE_NAME, 'material_revisionsテーブルのマイグレーション完了: updated_byカラムのNOT NULL制約を削除しました');
  } catch (err) {
    error(MODULE_NAME, 'material_revisionsマイグレーションエラー:', err);
  }
}

function migrateFeedbackMetadata(db: SqliteDatabase): void {
  try {
    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='feedback_metadata'`)
      .get();
    if (!tableExists) return;

    const columns = db.prepare('PRAGMA table_info(feedback_metadata)').all() as Array<{ name: string }>;
    const columnNames = columns.map((col) => col.name);

    if (!columnNames.includes('has_response')) {
      db.prepare('ALTER TABLE feedback_metadata ADD COLUMN has_response INTEGER DEFAULT 0').run();
      debug(MODULE_NAME, 'feedback_metadataテーブルにhas_responseカラムを追加しました');
    }

    if (!columnNames.includes('response_date')) {
      db.prepare('ALTER TABLE feedback_metadata ADD COLUMN response_date TEXT').run();
      debug(MODULE_NAME, 'feedback_metadataテーブルにresponse_dateカラムを追加しました');
    }

    if (!columnNames.includes('response_by')) {
      db.prepare('ALTER TABLE feedback_metadata ADD COLUMN response_by TEXT').run();
      debug(MODULE_NAME, 'feedback_metadataテーブルにresponse_byカラムを追加しました');
    }

    try {
      db.prepare('CREATE INDEX IF NOT EXISTS idx_feedback_metadata_has_response ON feedback_metadata(has_response)').run();
    } catch {
      // 既存環境ではインデックス作成に失敗しても致命的ではないため握りつぶす
    }
  } catch (err) {
    error(MODULE_NAME, 'フィードバックメタデータマイグレーションエラー:', err);
  }
}

