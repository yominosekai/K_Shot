// パスワード設定確認API（デバッグ用）

import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfig } from '@/shared/lib/data-access/system-config';

/**
 * GET /api/users/check-password
 * 権限変更パスワードが設定されているか確認
 */
export async function GET(request: NextRequest) {
  try {
    const passwordHash = getSystemConfig('role_change_password_hash');
    
    return NextResponse.json({
      success: true,
      isSet: !!passwordHash,
      message: passwordHash ? 'パスワードは設定されています' : 'パスワードは設定されていません',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: '確認に失敗しました' },
      { status: 500 }
    );
  }
}

