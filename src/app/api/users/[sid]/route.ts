// ユーザーAPI Route（薄い層）

import { NextRequest, NextResponse } from 'next/server';
import { getUserData, updateUserData, deleteUser } from '@/shared/lib/data-access/users';
import { requireAuth, requireOwnerOrAdmin, isAdmin, requireAdmin } from '@/shared/lib/auth/middleware';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[sid]';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    const { sid } = await params;
    // URLエンコードされたSIDをデコード
    const decodedSid = decodeURIComponent(sid);

    // 認証チェック（認証済みユーザーなら誰でもアクセス可能 - クローズド環境のため）
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const user = await getUserData(decodedSid);

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
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    const { sid } = await params;
    // URLエンコードされたSIDをデコード
    const decodedSid = decodeURIComponent(sid);

    // 認証・認可チェック（本人または管理者のみ更新可能）
    const authResult = await requireOwnerOrAdmin(decodedSid);
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

    const updatedUser = await updateUserData(decodedSid, body);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
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
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    const { sid } = await params;
    // URLエンコードされたSIDをデコード
    const decodedSid = decodeURIComponent(sid);

    // 認証・認可チェック（管理者のみ削除可能）
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }
    
    const success = await deleteUser(decodedSid);
    
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

