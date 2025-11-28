// 権限変更パスワード更新API（管理者専用）

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { getSystemConfig, setSystemConfig } from '@/shared/lib/data-access/system-config';
import { hashPassword, verifyPassword } from '@/shared/lib/utils/password';
import { recordRolePasswordChangeActivityEvent } from '@/shared/lib/activity-log';
import { info, error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/system-config/role-password';

/**
 * PUT /api/admin/system-config/role-password
 * 権限変更パスワードを更新（管理者のみ）
 * 
 * リクエストボディ:
 * {
 *   role: 'admin' | 'instructor',
 *   currentPassword: string,
 *   newPassword: string
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();
    const { role, currentPassword, newPassword } = body;

    // バリデーション
    if (!role || (role !== 'admin' && role !== 'instructor')) {
      return NextResponse.json(
        { success: false, error: '権限は "admin" または "instructor" である必要があります' },
        { status: 400 }
      );
    }

    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: '現在のパスワードが指定されていません' },
        { status: 400 }
      );
    }

    if (!newPassword) {
      return NextResponse.json(
        { success: false, error: '新しいパスワードが指定されていません' },
        { status: 400 }
      );
    }

    // 新しいパスワードのバリデーション
    if (newPassword.length < 4) {
      return NextResponse.json(
        { success: false, error: '新しいパスワードは4文字以上である必要があります' },
        { status: 400 }
      );
    }

    // 現在のパスワードを取得
    const configKey = `role_change_password_hash_${role}`;
    const currentPasswordHash = getSystemConfig(configKey);

    if (!currentPasswordHash) {
      error(MODULE_NAME, `権限変更パスワードが設定されていません: role=${role}`);
      return NextResponse.json(
        { success: false, error: `${role === 'instructor' ? '教育者' : '管理者'}の権限変更パスワードが設定されていません` },
        { status: 500 }
      );
    }

    // 現在のパスワードを検証
    if (!verifyPassword(currentPassword, currentPasswordHash)) {
      error(MODULE_NAME, '現在のパスワード検証失敗');
      return NextResponse.json(
        { success: false, error: '現在のパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 新しいパスワードをハッシュ化
    const newPasswordHash = hashPassword(newPassword);

    // システム設定を更新
    const updaterId = authResult.user.id ?? authResult.user.sid;
    if (!updaterId) {
      return NextResponse.json(
        { success: false, error: '操作ユーザーIDを特定できませんでした' },
        { status: 500 }
      );
    }

    const success = await setSystemConfig(
      configKey,
      newPasswordHash,
      updaterId
    );

    if (!success) {
      error(MODULE_NAME, `パスワード更新失敗: role=${role}`);
      return NextResponse.json(
        { success: false, error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      );
    }

    // アクティビティログに記録
    recordRolePasswordChangeActivityEvent(updaterId, role);

    info(MODULE_NAME, `権限変更パスワード更新成功: role=${role}, changedBy=${updaterId}`);

    return NextResponse.json({
      success: true,
      message: `${role === 'instructor' ? '教育者' : '管理者'}の権限変更パスワードを更新しました`,
    });
  } catch (err) {
    error(MODULE_NAME, '権限変更パスワード更新エラー:', err);
    return NextResponse.json(
      { success: false, error: 'パスワードの更新に失敗しました' },
      { status: 500 }
    );
  }
}



