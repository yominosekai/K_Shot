// デフォルトパスワードチェックAPI（管理者専用）

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { getDatabase } from '@/shared/lib/database/db';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/system-config/role-password/check-default';

/**
 * GET /api/admin/system-config/role-password/check-default
 * デフォルトパスワードかどうかをチェック（管理者のみ）
 * 
 * レスポンス:
 * {
 *   isDefaultAdmin: boolean,
 *   isDefaultInstructor: boolean,
 *   isDefaultTraining: boolean
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const db = getDatabase();
    
    // 管理者の権限変更パスワードの updated_by を取得
    const adminPasswordKey = 'role_change_password_hash_admin';
    const adminConfig = db.prepare('SELECT updated_by FROM system_config WHERE key = ?').get(adminPasswordKey) as { updated_by: string | null } | undefined;
    const isDefaultAdmin = adminConfig?.updated_by === 'system';

    // 教育者の権限変更パスワードの updated_by を取得
    const instructorPasswordKey = 'role_change_password_hash_instructor';
    const instructorConfig = db
      .prepare('SELECT updated_by FROM system_config WHERE key = ?')
      .get(instructorPasswordKey) as { updated_by: string | null } | undefined;
    const isDefaultInstructor = instructorConfig?.updated_by === 'system';

    // 教育訓練の権限変更パスワードの updated_by を取得
    const trainingPasswordKey = 'role_change_password_hash_training';
    const trainingConfig = db
      .prepare('SELECT updated_by FROM system_config WHERE key = ?')
      .get(trainingPasswordKey) as { updated_by: string | null } | undefined;
    const isDefaultTraining = trainingConfig?.updated_by === 'system';

    return NextResponse.json({
      success: true,
      isDefaultAdmin,
      isDefaultInstructor,
      isDefaultTraining,
    });
  } catch (err) {
    error(MODULE_NAME, 'デフォルトパスワードチェックエラー:', err);
    return NextResponse.json(
      { success: false, error: '内部サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}






