// ユーザーデータアクセス層

import { getDatabase } from '../database/db';
import type { User } from '@/features/auth/types';
import { debug, info, error } from '../logger';
import { logBusyError } from '../database/busy-monitor';
import { saveAvatar, deleteAvatar } from '../file-system/avatar';

const MODULE_NAME = 'users';

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  department_id?: string | null;
  department?: string | null;
  role: string;
  is_active: number;
  created_date: string;
  last_login: string;
  avatar?: string | null;
  bio?: string | null;
  skills?: string | null;
  certifications?: string | null;
  mos?: string | null;
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    email: row.email,
    department_id: row.department_id || undefined,
    department: row.department || undefined,
    role: row.role as User['role'],
    is_active: row.is_active === 1,
    created_date: row.created_date,
    last_login: row.last_login,
    avatar: row.avatar || undefined,
    bio: row.bio || undefined,
    skills: row.skills ? JSON.parse(row.skills) : undefined,
    certifications: row.certifications ? JSON.parse(row.certifications) : undefined,
    mos: row.mos ? JSON.parse(row.mos) : undefined,
  };
}

/**
 * ユーザープロファイルを取得（SQLiteから）
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    debug(MODULE_NAME, `getUserProfile開始: userId=${userId}`);
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined;

    if (!row) {
      debug(MODULE_NAME, `getUserProfile: ユーザーが見つかりませんでした: userId=${userId}`);
      return null;
    }

    const user = mapRowToUser(row);

    debug(MODULE_NAME, `getUserProfile完了:`, {
      userId,
      hasAvatar: !!user.avatar,
      avatarPath: user.avatar,
      displayName: user.display_name,
    });

    return user;
  } catch (err) {
    // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
    if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
      return null;
    }
    error(MODULE_NAME, `getUserProfileエラー:`, err);
    return null;
  }
}

/**
 * ユーザーデータを取得（SQLiteのみ）
 */
export async function getUserData(userId: string): Promise<User | null> {
  try {
    const user = await getUserProfile(userId);
    if (!user) {
      debug(MODULE_NAME, `getUserData: ユーザーが見つかりません: userId=${userId}`);
    }
    return user;
  } catch (err) {
    if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
      return null;
    }
    error(MODULE_NAME, `getUserDataエラー:`, err);
    return null;
  }
}

/**
 * ユーザーをDBに保存
 */
function serializeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    email: user.email,
    department_id: user.department_id || null,
    department: user.department || null,
    role: user.role,
    is_active: user.is_active ? 1 : 0,
    created_date: user.created_date,
    last_login: user.last_login,
    avatar: user.avatar || null,
    bio: user.bio || null,
    skills: user.skills ? JSON.stringify(user.skills) : null,
    certifications: user.certifications ? JSON.stringify(user.certifications) : null,
    mos: user.mos ? JSON.stringify(user.mos) : null,
  };
}

async function saveUserToDatabase(user: User): Promise<void> {
  try {
    const db = getDatabase();

    const serialized = serializeUser(user);
    const stmt = db.prepare(`
      INSERT INTO users (
        id, username, display_name, email, department_id, department, role, is_active,
        created_date, last_login, avatar, bio, skills, certifications, mos
      ) VALUES (
        @id, @username, @display_name, @email, @department_id, @department, @role, @is_active,
        @created_date, @last_login, @avatar, @bio, @skills, @certifications, @mos
      )
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        display_name = excluded.display_name,
        email = excluded.email,
        department_id = excluded.department_id,
        department = excluded.department,
        role = excluded.role,
        is_active = excluded.is_active,
        created_date = excluded.created_date,
        last_login = excluded.last_login,
        avatar = excluded.avatar,
        bio = excluded.bio,
        skills = excluded.skills,
        certifications = excluded.certifications,
        mos = excluded.mos;
    `);

    // リトライ処理（最大5回、指数バックオフ）
    const maxRetries = 5;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        stmt.run(serialized);
        if (retryCount > 0) {
          debug(MODULE_NAME, `ユーザー保存成功（リトライ ${retryCount}回後）: id=${serialized.id}`);
          // SQLITE_BUSYが発生したが最終的に成功した場合のログ
          await logBusyError(serialized.id, 'saveUserToDatabase', retryCount, true, {
            targetUserId: serialized.id,
          });
        } else {
          debug(MODULE_NAME, `ユーザー保存: id=${serialized.id}`);
        }
        break;
      } catch (err: any) {
        lastError = err;
        if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 50 * retryCount;
          debug(MODULE_NAME, `SQLite書き込み競合検出（リトライ ${retryCount}回目）: id=${user.id}, ${waitTime}ms待機`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw err;
      }
    }

    if (retryCount >= maxRetries && lastError) {
      error(
        MODULE_NAME,
        `ユーザー保存失敗（最大リトライ回数に達しました）: id=${serialized.id}`,
        lastError
      );
      // SQLITE_BUSYが発生して最終的に失敗した場合のログ
      await logBusyError(serialized.id, 'saveUserToDatabase', retryCount, false, {
        targetUserId: serialized.id,
      });
      throw lastError;
    }
  } catch (err) {
    // ドライブ設定未完了のエラーはログ出力をスキップ（getDataDir()で既に出力済み）
    if (!(err instanceof Error && err.message.includes('ドライブ設定が完了していません'))) {
      error(MODULE_NAME, `saveUserToDatabaseエラー:`, err);
    }
    throw err;
  }
}

/**
 * ユーザーデータを更新
 */
export async function updateUserData(userId: string, data: Partial<User>): Promise<User | null> {
  try {
    debug(MODULE_NAME, `updateUserData開始: userId=${userId}`, {
      updateFields: Object.keys(data),
    });

    const existingProfile = await getUserProfile(userId);
    if (!existingProfile) {
      error(MODULE_NAME, `updateUserData: ユーザーが見つかりません: userId=${userId}`);
      return null;
    }

    // avatarフィールドが含まれている場合の処理
    let avatarPath: string | null = existingProfile.avatar || null;
    
    if (data.avatar !== undefined) {
      if (data.avatar === '' || data.avatar === null) {
        // アバター削除
        await deleteAvatar(userId);
        avatarPath = null;
        debug(MODULE_NAME, `updateUserData: アバター削除`, { userId });
      } else if (data.avatar.startsWith('users/')) {
        // パス形式の場合はそのまま使用
        avatarPath = data.avatar;
        debug(MODULE_NAME, `updateUserData: アバターパス更新`, {
          userId,
          avatarPath,
        });
      } else {
        // その他の形式は無視（ファイルアップロードはAPI側で処理済み）
        debug(MODULE_NAME, `updateUserData: アバター形式が不正`, {
          userId,
          avatarType: typeof data.avatar,
        });
      }
    }

    const updatedProfile: User = {
      ...existingProfile,
      ...data,
      avatar: avatarPath || undefined,
    };

    await saveUserToDatabase(updatedProfile);
    debug(MODULE_NAME, `updateUserData完了: プロフィール保存完了`, {
      userId,
      hasAvatar: !!updatedProfile.avatar,
      avatarPath: updatedProfile.avatar,
    });
    return updatedProfile;
  } catch (err) {
    error(MODULE_NAME, `updateUserDataエラー:`, err);
    return null;
  }
}

/**
 * ユーザー一覧を取得（SQLiteから）
 */
export async function getUsersList(): Promise<User[]> {
  try {
    debug(MODULE_NAME, 'getUsersList開始');
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM users ORDER BY created_date DESC').all() as UserRow[];
    const users = rows.map(mapRowToUser);

    debug(MODULE_NAME, `getUsersList完了: ${users.length}件`);
    return users;
  } catch (err) {
    error(MODULE_NAME, 'getUsersListエラー:', err);
    return [];
  }
}

/**
 * ユーザーを検索（DBクエリで直接検索）
 * @param query 検索クエリ（display_name、username、emailで部分一致検索）
 * @param limit 取得件数の上限
 * @returns マッチしたユーザーの配列
 */
export async function searchUsers(query: string, limit: number = 10): Promise<User[]> {
  try {
    debug(MODULE_NAME, `searchUsers開始: query=${query}, limit=${limit}`);
    const db = getDatabase();
    const queryLower = query.toLowerCase();
    const searchPattern = `%${queryLower}%`;

    // DBクエリで直接検索（display_name、username、emailで部分一致）
    const rows = db
      .prepare(
        `SELECT * FROM users 
         WHERE LOWER(display_name) LIKE ? 
            OR LOWER(username) LIKE ? 
            OR LOWER(email) LIKE ?
         ORDER BY created_date DESC
         LIMIT ?`
      )
      .all(searchPattern, searchPattern, searchPattern, limit) as UserRow[];

    const users = rows.map(mapRowToUser);

    debug(MODULE_NAME, `searchUsers完了: ${users.length}件`);
    return users;
  } catch (err) {
    error(MODULE_NAME, 'searchUsersエラー:', err);
    return [];
  }
}

/**
 * ユーザーを削除（物理削除）
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    info(MODULE_NAME, `deleteUser開始: userId=${userId}`);
    const db = getDatabase();
    
    // ユーザーを削除（CASCADEにより関連データも削除される）
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = deleteStmt.run(userId);
    
    if (result.changes === 0) {
      debug(MODULE_NAME, `deleteUser: ユーザーが見つかりませんでした: userId=${userId}`);
      return false;
    }
    
    info(MODULE_NAME, `deleteUser完了: userId=${userId}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, `deleteUserエラー:`, err);
    return false;
  }
}

