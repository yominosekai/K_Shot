// フォルダ管理API Routes

import { NextRequest, NextResponse } from 'next/server';
import { getFolders, getFoldersFlat, createFolder } from '@/shared/lib/data-access/folders';

/**
 * GET /api/materials/folders
 * フォルダ一覧を取得（階層構造）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const flat = searchParams.get('flat') === 'true';

    if (flat) {
      const folders = await getFoldersFlat();
      return NextResponse.json({
        success: true,
        folders,
      });
    } else {
      const folders = await getFolders();
      return NextResponse.json({
        success: true,
        folders,
      });
    }
  } catch (err) {
    console.error('[API] /api/materials/folders GET エラー:', err);
    
    // ドライブ設定が完了していない場合のエラーハンドリング
    if (err instanceof Error && err.message.includes('ドライブ設定が完了していません')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Drive configuration not completed',
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'フォルダの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/materials/folders
 * フォルダを作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, parent_id, user_sid } = body;

    if (!name || !user_sid) {
      return NextResponse.json(
        {
          success: false,
          error: '必須フィールドが不足しています',
        },
        { status: 400 }
      );
    }

    const folder = await createFolder(name, parent_id || '', user_sid);

    if (!folder) {
      return NextResponse.json(
        {
          success: false,
          error: 'フォルダの作成に失敗しました',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder,
    });
  } catch (err) {
    console.error('[API] /api/materials/folders POST エラー:', err);

    if (err instanceof Error) {
      if (err.message.includes('ドライブ設定が完了していません')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Drive configuration not completed',
          },
          { status: 503 }
        );
      }

      const code = (err as any)?.code as string | undefined;
      if (code === 'SQLITE_BUSY' || (code && code.startsWith('SQLITE_CANTOPEN'))) {
        return NextResponse.json(
          {
            success: false,
            error: 'DATABASE_BUSY',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'フォルダの作成に失敗しました',
      },
      { status: 500 }
    );
  }
}

