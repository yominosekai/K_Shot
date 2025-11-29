// ユーザー権限変更API

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, updateUserData } from '@/shared/lib/data-access/users';
import { getSystemConfig } from '@/shared/lib/data-access/system-config';
import { verifyPassword } from '@/shared/lib/utils/password';
import { requireAuth, requireAdmin, isAdmin } from '@/shared/lib/auth/middleware';
import { clearAuthCache } from '@/shared/lib/auth/session-cache';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[id]/role';

/**
 * PUT /api/users/[id]/role
 * ユーザーの権限を変更
 * - 自分自身の権限変更: 認証済みユーザーなら可能（パスワード認証付き）
 * - 他のユーザーの権限変更: 管理者のみ可能
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 認証チェック（認証済みユーザーなら誰でもアクセス可能）
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const encodedId = resolvedParams.id;
    
    // URLエンコードされたIDをデコード（ハイフンなどが含まれる場合）
    let userId: string;
    try {
      userId = decodeURIComponent(encodedId);
    } catch {
      // デコードに失敗した場合はそのまま使用
      userId = encodedId;
    }
    
    const authUserId = authResult.user.id;
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDを特定できませんでした' },
        { status: 500 }
      );
    }
    
    // 自分自身の権限変更か、他のユーザーの権限変更かを判定
    const isSelfChange = authUserId === userId;
    
    // 管理者権限チェック: キャッシュが古い可能性があるため、データベースから最新のユーザー情報を取得
    const currentUser = await getUserProfile(authUserId);
    if (!currentUser) {
      error(MODULE_NAME, `現在のユーザー情報を取得できませんでした: authUserId=${authUserId}`);
      return NextResponse.json(
        { success: false, error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }
    
    const isAdminUser = isAdmin(currentUser);
    
    // デバッグ: ユーザー情報と権限チェック結果をログ出力
    debug(
      MODULE_NAME,
      `権限チェック: id=${currentUser.id}, role=${currentUser.role}, isAdmin=${isAdminUser}, isSelfChange=${isSelfChange}, targetId=${userId}`
    );
    
    // 他のユーザーの権限変更は管理者のみ可能
    if (!isSelfChange && !isAdminUser) {
      error(
        MODULE_NAME,
        `権限変更拒否: 他のユーザーの権限変更は管理者のみ可能: id=${currentUser.id}, role=${currentUser.role}, targetId=${userId}`
      );
      return NextResponse.json(
        { success: false, error: '他のユーザーの権限変更は管理者のみ可能です' },
        { status: 403 }
      );
    }
    
    debug(
      MODULE_NAME,
      `権限変更リクエスト: id=${userId}, encodedId=${encodedId}, changed_by=${authUserId}, isSelfChange=${isSelfChange}, isAdmin=${isAdminUser}`
    );
    
    const body = await request.json();
    const { new_role, password, changed_by } = body;

    // バリデーション
    if (!new_role) {
      return NextResponse.json(
        { success: false, error: '新しい権限が指定されていません' },
        { status: 400 }
      );
    }

    if (!['user', 'instructor', 'admin'].includes(new_role)) {
      return NextResponse.json(
        { success: false, error: '無効な権限です' },
        { status: 400 }
      );
    }

    // ユーザーを取得
    const user = await getUserProfile(userId);
    if (!user) {
      error(MODULE_NAME, `ユーザーが見つかりません: id=${userId}`);
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 新しい権限が一般ユーザー以外（教育者・管理者）の場合はパスワード検証が必要
    const requiresPassword = new_role !== 'user';
    if (requiresPassword) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'パスワードが指定されていません' },
          { status: 400 }
        );
      }

      // 権限ごとのパスワードハッシュを取得
      const configKey = `role_change_password_hash_${new_role}`;
      const passwordHash = getSystemConfig(configKey);
      if (!passwordHash) {
        error(MODULE_NAME, `権限変更パスワードが設定されていません: role=${new_role}`);
        return NextResponse.json(
          { success: false, error: `${new_role === 'instructor' ? '教育者' : '管理者'}の権限変更パスワードが設定されていません。管理者に連絡してください。` },
          { status: 500 }
        );
      }

      if (!verifyPassword(password, passwordHash)) {
        error(MODULE_NAME, 'パスワード検証失敗');
        return NextResponse.json(
          { success: false, error: 'パスワードが正しくありません' },
          { status: 401 }
        );
      }
    }

    // 権限が同じ場合はエラー
    if (user.role === new_role) {
      return NextResponse.json(
        { success: false, error: '既に同じ権限です' },
        { status: 400 }
      );
    }

    // 権限を更新
    try {
      const updatedUser = await updateUserData(userId, {
        role: new_role as 'user' | 'instructor' | 'admin',
      });

      if (!updatedUser) {
        error(MODULE_NAME, `updateUserDataがnullを返しました: id=${userId}`);
        return NextResponse.json(
          { success: false, error: '権限の更新に失敗しました（ユーザーが見つからないか、データベースエラーが発生しました）' },
          { status: 500 }
        );
      }

      info(
        MODULE_NAME,
        `権限変更成功: id=${userId}, old_role=${user.role}, new_role=${new_role}, changed_by=${changed_by}`
      );

      // 権限が変更されたので、キャッシュをクリアして次回アクセス時に最新情報を取得させる
      clearAuthCache(userId);
      debug(MODULE_NAME, `権限変更によりキャッシュをクリア: id=${userId}`);

      return NextResponse.json({
        success: true,
        message: '権限を変更しました',
        user: updatedUser,
      });
    } catch (updateError) {
      error(MODULE_NAME, `updateUserDataでエラーが発生しました: id=${userId}`, updateError);
      return NextResponse.json(
        { success: false, error: `権限の更新に失敗しました: ${updateError instanceof Error ? updateError.message : '不明なエラー'}` },
        { status: 500 }
      );
    }

  } catch (err) {
    error(MODULE_NAME, '権限変更エラー:', err);
    return NextResponse.json(
      { success: false, error: `権限の変更に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}` },
      { status: 500 }
    );
  }
}

