// 認証API Route（薄い層）

import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/features/auth/api/auth';

export async function GET(request: NextRequest) {
  try {
    const result = await authenticateUser();

    if (!result.success) {
      // DEVICE_TOKEN_REQUIREDの場合は200を返す（フロントエンドでリダイレクト処理を行うため）
      if (result.error === 'DEVICE_TOKEN_REQUIRED') {
        return NextResponse.json(result, { status: 200 });
      }
      return NextResponse.json(result, {
        status: result.error === 'User not found' ? 404 : 500,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Auth GET] Error:', error);
    
    // ドライブ設定が完了していない場合のエラーハンドリング
    if (error instanceof Error && error.message.includes('ドライブ設定が完了していません')) {
      return NextResponse.json(
        { success: false, error: 'Drive configuration not completed' },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const result = await authenticateUser();

    if (!result.success) {
      // DEVICE_TOKEN_REQUIREDの場合は200を返す（フロントエンドでリダイレクト処理を行うため）
      if (result.error === 'DEVICE_TOKEN_REQUIRED') {
        return NextResponse.json(result, { status: 200 });
      }
      return NextResponse.json(result, {
        status: result.error === 'User not found' ? 404 : 500,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Auth POST] Error:', error);

    if (error instanceof Error && error.message.includes('ドライブ設定が完了していません')) {
      return NextResponse.json(
        { success: false, error: 'Drive configuration not completed' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

