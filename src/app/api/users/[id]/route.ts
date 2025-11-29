// ユーザーAPI Route（薄い層）

import { NextRequest, NextResponse } from 'next/server';
import { getUserData, updateUserData, deleteUser } from '@/shared/lib/data-access/users';
import { requireAuth, requireOwnerOrAdmin, isAdmin, requireAdmin } from '@/shared/lib/auth/middleware';
import { clearAuthCache } from '@/shared/lib/auth/session-cache';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[id]';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // URLエンコードされたIDをデコード
    const decodedId = decodeURIComponent(id);

    // 認証チェック（認証済みユーザーなら誰でもアクセス可能 - クローズド環境のため）
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const user = await getUserData(decodedId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (err) {
    error(MODULE_NAME, 'GET エラー:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // URLエンコードされたIDをデコード
    const decodedId = decodeURIComponent(id);

    // 認証・認可チェック（本人または管理者のみ更新可能）
    const authResult = await requireOwnerOrAdmin(decodedId);
    if (!authResult.success) {
      return authResult.response;
    }

    const body = await request.json();

    // 管理者以外はroleの変更を許可しない
    if (!isAdmin(authResult.user) && body.role !== undefined) {
      return NextResponse.json(
        { success: false, error: '権限の変更は管理者のみ可能です' },
        { status: 403 }
      );
    }

    // roleが変更される可能性がある場合、変更前のユーザー情報を取得
    const oldUser = body.role !== undefined ? await getUserData(decodedId) : null;
    const roleChanged = oldUser && body.role !== undefined && oldUser.role !== body.role;

    const updatedUser = await updateUserData(decodedId, body);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // roleが変更された場合はキャッシュをクリア
    if (roleChanged) {
      clearAuthCache(decodedId);
      debug(MODULE_NAME, `権限変更によりキャッシュをクリア: id=${decodedId}`);
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (err) {
    error(MODULE_NAME, 'PUT エラー:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // URLエンコードされたIDをデコード
    const decodedId = decodeURIComponent(id);

    // 認証・認可チェック（管理者のみ削除可能）
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }
    
    const success = await deleteUser(decodedId);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (err) {
    error(MODULE_NAME, 'DELETE エラー:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


