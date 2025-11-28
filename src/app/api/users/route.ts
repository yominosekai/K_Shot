// ユーザー一覧取得API

import { NextRequest, NextResponse } from 'next/server';
import { getUsersList } from '@/shared/lib/data-access/users';
import { requireAuth } from '@/shared/lib/auth/middleware';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users';

/**
 * GET /api/users
 * ユーザー一覧を取得（認証必須）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    const users = await getUsersList();
    
    debug(MODULE_NAME, `ユーザー一覧取得: ${users.length}件`);
    
    return NextResponse.json({
      success: true,
      users,
    });
  } catch (err) {
    error(MODULE_NAME, 'ユーザー一覧取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'ユーザー一覧の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

