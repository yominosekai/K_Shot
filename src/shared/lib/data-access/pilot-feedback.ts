// パイロットテストフィードバックデータアクセス層（JSON保存）
// この機能は一時的なもので、テスト終了後は削除可能です

import { readJSON, writeJSON } from '../file-system/json';
import path from 'path';
import fs from 'fs/promises';
import { info, error, debug } from '../logger';
import { getUserDirectoryPath } from '@/shared/lib/file-system/user-storage';

const MODULE_NAME = 'pilot-feedback';

export type PilotFeedbackScene = 
  | 'knowledge_registration'  // ナレッジ登録シーン
  | 'search_reference'         // 検索・参照シーン
  | 'share_utilization'        // 共有・活用シーン
  | 'operation';               // 運用シーン

export type EvaluationScore = 1 | 2 | 3 | 4 | 5;

export interface PilotFeedbackEvaluation {
  score: EvaluationScore;
  comment?: string;
}

export interface PilotFeedback {
  id: string;
  user_id: string;
  created_date: string;
  updated_date: string;
  
  // 利用シーン（複数選択可）
  scenes: PilotFeedbackScene[];
  
  // 評価項目
  evaluations: {
    usability: PilotFeedbackEvaluation;           // 使いやすさ (UI/UX)
    business_fit: PilotFeedbackEvaluation;        // 業務適合度
    performance: PilotFeedbackEvaluation;         // レスポンス/パフォーマンス
    quality: PilotFeedbackEvaluation;             // 品質/信頼性
    content_richness: PilotFeedbackEvaluation;     // 内容の充実度
  };
  
  // 改善アイデア・要望（自由記述）
  improvement_ideas?: string;
  
  // その他のコメント
  additional_comments?: string;
  
  // パイロットテスト期間の識別
  pilot_test_period: string;
}

interface PilotFeedbackFile {
  feedbacks: PilotFeedback[];
}

const PILOT_FEEDBACK_FILE_NAME = 'pilot_feedback.json';

function getPilotFeedbackDir(userId: string): string {
  return path.join(getUserDirectoryPath(userId), 'pilot-feedback');
}

function getPilotFeedbackFilePath(userId: string): string {
  return path.join(getPilotFeedbackDir(userId), PILOT_FEEDBACK_FILE_NAME);
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

async function readPilotFeedbackData(userId: string): Promise<PilotFeedbackFile> {
  const filePath = getPilotFeedbackFilePath(userId);
  const exists = await fileExists(filePath);
  if (!exists) {
    return { feedbacks: [] };
  }

  const data = (await readJSON(filePath)) as PilotFeedbackFile | null;
  if (data && Array.isArray(data.feedbacks)) {
    return data;
  }
  return { feedbacks: [] };
}

async function writePilotFeedbackData(userId: string, feedbackFile: PilotFeedbackFile): Promise<void> {
  const dir = getPilotFeedbackDir(userId);
  await ensureDirectoryExists(dir);
  await writeJSON(getPilotFeedbackFilePath(userId), feedbackFile);
}

/**
 * パイロットフィードバックを保存（常に保存のみ、編集可能）
 */
export async function savePilotFeedback(
  userId: string,
  feedback: Omit<PilotFeedback, 'id' | 'created_date' | 'updated_date' | 'user_id' | 'pilot_test_period'>
): Promise<PilotFeedback> {
  try {
    await ensureDirectoryExists(getPilotFeedbackDir(userId));
    const feedbackFile = await readPilotFeedbackData(userId);
    
    const now = new Date().toISOString();
    const { PILOT_TEST_CONFIG } = await import('@/config/pilot-test');
    
    // 既存のフィードバックがある場合は更新、なければ新規作成
    const existingIndex = feedbackFile.feedbacks.findIndex(
      (f) => f.user_id === userId
    );
    
    let pilotFeedback: PilotFeedback;
    
    if (existingIndex >= 0) {
      // 既存のフィードバックを更新
      pilotFeedback = {
        ...feedbackFile.feedbacks[existingIndex],
        ...feedback,
        updated_date: now,
      };
      feedbackFile.feedbacks[existingIndex] = pilotFeedback;
    } else {
      // 新規作成
      const feedbackId = `pilot_feedback_${Date.now()}`;
      pilotFeedback = {
        id: feedbackId,
        user_id: userId,
        created_date: now,
        updated_date: now,
        ...feedback,
        pilot_test_period: PILOT_TEST_CONFIG.PERIOD,
      };
      feedbackFile.feedbacks.push(pilotFeedback);
    }
    
    await writePilotFeedbackData(userId, feedbackFile);
    
    info(MODULE_NAME, `パイロットフィードバックを保存: userId=${userId}`);
    return pilotFeedback;
  } catch (err) {
    error(MODULE_NAME, 'パイロットフィードバック保存エラー:', err);
    throw err;
  }
}

/**
 * ユーザーのパイロットフィードバックを取得
 */
export async function getUserPilotFeedback(userId: string): Promise<PilotFeedback | null> {
  try {
    const feedbackFile = await readPilotFeedbackData(userId);
    // 最新のものを返す（updated_dateが最新のもの）
    if (feedbackFile.feedbacks.length === 0) {
      return null;
    }
    return feedbackFile.feedbacks.sort(
      (a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()
    )[0];
  } catch (err) {
    error(MODULE_NAME, 'パイロットフィードバック取得エラー:', err);
    return null;
  }
}

/**
 * 管理者用：全ユーザーの保存済みパイロットフィードバックを取得
 */
export async function getAllSavedPilotFeedbacks(): Promise<PilotFeedback[]> {
  try {
    const { getUsersRootPath } = await import('@/shared/lib/file-system/user-storage');
    const usersDir = getUsersRootPath();
    
    // ユーザーディレクトリをスキャン
    const allFeedbacks: PilotFeedback[] = [];
    
    try {
      const userDirs = await fs.readdir(usersDir);
      
      for (const userDir of userDirs) {
        const userDirPath = path.join(usersDir, userDir);
        const stat = await fs.stat(userDirPath);
        
        if (stat.isDirectory()) {
          const pilotFeedbackPath = path.join(userDirPath, 'pilot-feedback', PILOT_FEEDBACK_FILE_NAME);
          
          if (await fileExists(pilotFeedbackPath)) {
            try {
              const feedbackFile = (await readJSON(pilotFeedbackPath)) as PilotFeedbackFile | null;
              if (feedbackFile && Array.isArray(feedbackFile.feedbacks)) {
                // 各ユーザーから最新の1件のみ取得
                const userFeedbacks = feedbackFile.feedbacks.filter((f) => f.user_id);
                if (userFeedbacks.length > 0) {
                  const latest = userFeedbacks.sort(
                    (a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()
                  )[0];
                  allFeedbacks.push(latest);
                }
              }
            } catch (err) {
              debug(MODULE_NAME, `ユーザー ${userDir} のフィードバック読み込みエラー:`, err);
            }
          }
        }
      }
    } catch (err) {
      // usersディレクトリが存在しない場合は空配列を返す
      debug(MODULE_NAME, 'ユーザーディレクトリスキャンエラー:', err);
    }
    
    // 更新日時でソート（新しい順）
    return allFeedbacks.sort(
      (a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime()
    );
  } catch (err) {
    error(MODULE_NAME, '全パイロットフィードバック取得エラー:', err);
    return [];
  }
}

