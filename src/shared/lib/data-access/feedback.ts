// フィードバックデータアクセス層（JSON + DBメタデータ）

import { getDatabase } from '../database/db';
import { readJSON, writeJSON } from '../file-system/json';
import path from 'path';
import fs from 'fs/promises';
import { info, error, debug } from '../logger';
import { getUserDirectoryPath } from '@/shared/lib/file-system/user-storage';

const MODULE_NAME = 'feedback';

export interface FeedbackResponse {
  content: string;
  created_date: string;
  created_by: string;
}

export interface Feedback {
  id: string;
  content: string;
  is_public: boolean;
  created_date: string;
  updated_date: string;
  status: 'open' | 'resolved' | 'closed';
  response?: FeedbackResponse;
}

interface FeedbackFile {
  feedbacks: Feedback[];
}

const FEEDBACK_FILE_NAME = 'feedback.json';

function getFeedbackDir(userId: string): string {
  return path.join(getUserDirectoryPath(userId), 'feedback');
}

function getFeedbackFilePath(userId: string): string {
  return path.join(getFeedbackDir(userId), FEEDBACK_FILE_NAME);
}

async function ensureDirectoryExists(targetDir: string) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFeedbackData(userId: string): Promise<FeedbackFile> {
  const filePath = getFeedbackFilePath(userId);
  const exists = await fileExists(filePath);
  if (!exists) {
    return { feedbacks: [] };
  }

  const data = (await readJSON(filePath)) as FeedbackFile | null;
  if (data && Array.isArray(data.feedbacks)) {
    return data;
  }
  return { feedbacks: [] };
}

async function writeFeedbackData(userId: string, feedbackFile: FeedbackFile): Promise<void> {
  const dir = getFeedbackDir(userId);
  await ensureDirectoryExists(dir);
  await writeJSON(getFeedbackFilePath(userId), feedbackFile);
}

/**
 * フィードバックディレクトリを取得
 */
/**
 * フィードバックを保存（JSON + DBメタデータ）
 */
export async function saveFeedback(userId: string, content: string, isPublic: boolean): Promise<Feedback> {
  try {
    const db = getDatabase();
    await ensureDirectoryExists(getFeedbackDir(userId));
    const feedbackFile = await readFeedbackData(userId);

    // 新しいフィードバックを作成
    const now = new Date().toISOString();
    const feedbackId = `feedback_${Date.now()}`;
    const feedback: Feedback = {
      id: feedbackId,
      content,
      is_public: isPublic,
      created_date: now,
      updated_date: now,
      status: 'open',
    };

    // JSONファイルに追加
    feedbackFile.feedbacks.push(feedback);
    await writeFeedbackData(userId, feedbackFile);

    // DBメタデータに保存（集計用）
    db.prepare(`
      INSERT INTO feedback_metadata (id, user_id, created_date, updated_date, is_public, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(feedbackId, userId, now, now, isPublic ? 1 : 0, 'open');

    info(MODULE_NAME, `フィードバックを保存: userId=${userId}, feedbackId=${feedbackId}`);
    return feedback;
  } catch (err) {
    error(MODULE_NAME, 'フィードバック保存エラー:', err);
    throw err;
  }
}

/**
 * ユーザーのフィードバック一覧を取得
 */
export async function getUserFeedbacks(userId: string): Promise<Feedback[]> {
  try {
    const feedbackFile = await readFeedbackData(userId);
    return feedbackFile.feedbacks.sort(
      (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );
  } catch (err) {
    error(MODULE_NAME, 'フィードバック取得エラー:', err);
    return [];
  }
}

/**
 * 管理者用：全フィードバックのメタデータを取得（DBから）
 */
interface FeedbackMetadataRow {
  id: string;
  user_id: string;
  created_date: string;
  updated_date: string;
  is_public: number;
  status: string;
  has_response: number;
  response_date: string | null;
  response_by: string | null;
  username?: string;
  display_name?: string;
}

export function getAllFeedbackMetadata(): FeedbackMetadataRow[] {
  try {
    const db = getDatabase();
    
    const query = db.prepare(`
      SELECT 
        fm.id,
        fm.user_id,
        fm.created_date,
        fm.updated_date,
        fm.is_public,
        fm.status,
        fm.has_response,
        fm.response_date,
        fm.response_by,
        u.username,
        u.display_name
      FROM feedback_metadata fm
      LEFT JOIN users u ON fm.user_id = u.id
      ORDER BY fm.created_date DESC
    `);

    return query.all() as FeedbackMetadataRow[];
  } catch (err) {
    error(MODULE_NAME, 'フィードバックメタデータ取得エラー:', err);
    return [];
  }
}

/**
 * 管理者用：特定のフィードバックの詳細を取得（JSONから）
 */
export async function getFeedbackDetail(feedbackId: string, userId: string): Promise<Feedback | null> {
  try {
    const feedbacks = await getUserFeedbacks(userId);
    return feedbacks.find((feedback) => feedback.id === feedbackId) || null;
  } catch (err) {
    error(MODULE_NAME, 'フィードバック詳細取得エラー:', err);
    return null;
  }
}

/**
 * 公開フィードバックをページネーション付きで取得
 */
type PublicFeedback = Feedback & {
  user_id: string;
  username?: string;
  display_name?: string;
};

type FeedbackPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function getAllPublicFeedbacksPaginated(
  page: number = 1,
  limit: number = 20
): Promise<{ feedbacks: PublicFeedback[]; pagination: FeedbackPagination }> {
  try {
    const db = getDatabase();
    
    // 公開フィードバックのメタデータを取得（ページネーション付き）
    const offset = (page - 1) * limit;
    const metadataQuery = db.prepare(`
      SELECT 
        fm.id,
        fm.user_id,
        fm.created_date,
        fm.updated_date,
        fm.is_public,
        fm.status,
        fm.has_response,
        fm.response_date,
        fm.response_by,
        u.username,
        u.display_name
      FROM feedback_metadata fm
      LEFT JOIN users u ON fm.user_id = u.id
      WHERE fm.is_public = 1
      ORDER BY fm.created_date DESC
      LIMIT ? OFFSET ?
    `);
    
    const metadata = metadataQuery.all(limit, offset) as FeedbackMetadataRow[];
    
    // 総件数を取得
    const totalCountQuery = db.prepare(`
      SELECT COUNT(*) as count
      FROM feedback_metadata
      WHERE is_public = 1
    `);
    const totalResult = totalCountQuery.get() as { count: number };
    const total = totalResult.count;
    
    const feedbackCache = new Map<string, Feedback[]>();
    const loadFeedbacks = async (userId: string) => {
      if (!feedbackCache.has(userId)) {
        feedbackCache.set(userId, await getUserFeedbacks(userId));
      }
      return feedbackCache.get(userId)!;
    };

    const feedbacks = await Promise.all(
      metadata.map(async (meta) => {
        const collection = await loadFeedbacks(meta.user_id);
        const detail = collection.find((item) => item.id === meta.id);
        if (!detail) {
          debug(MODULE_NAME, `metadataに対応する詳細が見つかりません: feedbackId=${meta.id}`);
          return null;
        }
        return {
          ...detail,
          user_id: meta.user_id,
          username: meta.username,
          display_name: meta.display_name,
        };
      })
    );
    
    // nullを除外
    const validFeedbacks = feedbacks.filter((f): f is NonNullable<typeof f> => f !== null);
    
    return {
      feedbacks: validFeedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    error(MODULE_NAME, '公開フィードバック取得エラー:', err);
    return {
      feedbacks: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0 },
    };
  }
}

/**
 * フィードバックのステータスを更新
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  userId: string,
  status: 'open' | 'resolved' | 'closed'
): Promise<boolean> {
  try {
    const db = getDatabase();
    const feedbackFile = await readFeedbackData(userId);
    const feedback = feedbackFile.feedbacks.find((item) => item.id === feedbackId);
    if (!feedback) {
      return false;
    }

    feedback.status = status;
    feedback.updated_date = new Date().toISOString();
    await writeFeedbackData(userId, feedbackFile);

    // DBメタデータを更新
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE feedback_metadata 
      SET status = ?, updated_date = ?
      WHERE id = ?
    `).run(status, now, feedbackId);

    info(MODULE_NAME, `フィードバックステータス更新: feedbackId=${feedbackId}, status=${status}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, 'フィードバックステータス更新エラー:', err);
    return false;
  }
}

/**
 * フィードバックに返事を追加・更新
 */
export async function updateFeedbackResponse(
  feedbackId: string,
  userId: string,
  responseContent: string,
  responseBy: string
): Promise<boolean> {
  try {
    const db = getDatabase();
    const feedbackFile = await readFeedbackData(userId);
    const feedback = feedbackFile.feedbacks.find((item) => item.id === feedbackId);
    if (!feedback) {
      return false;
    }

    const now = new Date().toISOString();
    feedback.response = {
      content: responseContent.trim(),
      created_date: now,
      created_by: responseBy,
    };
    feedback.updated_date = now;
    await writeFeedbackData(userId, feedbackFile);

    // DBメタデータを更新
    db.prepare(`
      UPDATE feedback_metadata 
      SET has_response = ?, response_date = ?, response_by = ?, updated_date = ?
      WHERE id = ?
    `).run(1, now, responseBy, now, feedbackId);

    info(MODULE_NAME, `フィードバック返事を更新: feedbackId=${feedbackId}, responseBy=${responseBy}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, 'フィードバック返事更新エラー:', err);
    return false;
  }
}

/**
 * フィードバックを削除
 */
export async function deleteFeedback(feedbackId: string, userId: string): Promise<boolean> {
  try {
    const db = getDatabase();
    const feedbackFile = await readFeedbackData(userId);
    const feedbackIndex = feedbackFile.feedbacks.findIndex((feedback) => feedback.id === feedbackId);
    if (feedbackIndex === -1) {
      return false;
    }

    feedbackFile.feedbacks.splice(feedbackIndex, 1);
    await writeFeedbackData(userId, feedbackFile);

    // DBメタデータから削除
    db.prepare('DELETE FROM feedback_metadata WHERE id = ?').run(feedbackId);

    info(MODULE_NAME, `フィードバック削除: feedbackId=${feedbackId}`);
    return true;
  } catch (err) {
    error(MODULE_NAME, 'フィードバック削除エラー:', err);
    return false;
  }
}

