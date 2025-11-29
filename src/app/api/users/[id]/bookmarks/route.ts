// お気に入りAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/shared/lib/file-system/json';
import { error, debug } from '@/shared/lib/logger';
import { getUserSubPath } from '@/shared/lib/file-system/user-storage';
import path from 'path';

const MODULE_NAME = 'api/users/[id]/bookmarks';

/**
 * GET /api/users/[id]/bookmarks
 * ユーザーのお気に入り一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // URLエンコードされたIDをデコード
    const decodedId = decodeURIComponent(id);
    const bookmarksPath = getUserSubPath(decodedId, 'bookmarks.json');

    const bookmarks = await readJSON(bookmarksPath);

    // お気に入りがない場合は空配列を返す
    if (!bookmarks || !Array.isArray(bookmarks)) {
      return NextResponse.json({
        success: true,
        bookmarks: [],
      });
    }

    return NextResponse.json({
      success: true,
      bookmarks,
    });
  } catch (err: any) {
    // ファイルが存在しない場合は空配列を返す
    if (err.code === 'ENOENT') {
      return NextResponse.json({
        success: true,
        bookmarks: [],
      });
    }

    error(MODULE_NAME, 'お気に入り取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'お気に入りの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/[id]/bookmarks
 * お気に入りを追加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // URLエンコードされたIDをデコード
    const decodedId = decodeURIComponent(id);
    const body = await request.json();
    const { material_id } = body;

    if (!material_id) {
      return NextResponse.json(
        { success: false, error: '資料IDが指定されていません' },
        { status: 400 }
      );
    }

    const bookmarksPath = getUserSubPath(decodedId, 'bookmarks.json');

    // 既存のお気に入りを読み込む
    let bookmarks: string[] = [];
    try {
      const existing = await readJSON(bookmarksPath);
      if (Array.isArray(existing)) {
        bookmarks = existing;
      }
    } catch {
      // ファイルが存在しない場合は空配列から開始
    }

    // 既に追加されている場合はエラー
    if (bookmarks.includes(material_id)) {
      return NextResponse.json(
        { success: false, error: '既にお気に入りに追加されています' },
        { status: 400 }
      );
    }

    // お気に入りを追加
    bookmarks.push(material_id);

    // ディレクトリが存在しない場合は作成
    const bookmarksDir = path.dirname(bookmarksPath);
    await import('fs/promises').then((fs) =>
      fs.mkdir(bookmarksDir, { recursive: true })
    );

    // 保存
    await writeJSON(bookmarksPath, bookmarks);

    debug(MODULE_NAME, `お気に入り追加: userId=${decodedId}, material_id=${material_id}`);

    return NextResponse.json({
      success: true,
      message: 'お気に入りに追加しました',
      bookmarks,
    });
  } catch (err) {
    error(MODULE_NAME, 'お気に入り追加エラー:', err);
    return NextResponse.json(
      { success: false, error: 'お気に入りの追加に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]/bookmarks
 * お気に入りを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // URLエンコードされたIDをデコード
    const decodedId = decodeURIComponent(id);
    
    // bodyから取得を試みる（POSTと同じ形式）
    let material_id: string | null = null;
    try {
      const body = await request.json();
      material_id = body.material_id || null;
    } catch {
      // bodyがJSONでない場合、searchParamsから取得
      const { searchParams } = new URL(request.url);
      material_id = searchParams.get('material_id');
    }

    if (!material_id) {
      return NextResponse.json(
        { success: false, error: '資料IDが指定されていません' },
        { status: 400 }
      );
    }

    const bookmarksPath = getUserSubPath(decodedId, 'bookmarks.json');

    // 既存のお気に入りを読み込む
    let bookmarks: string[] = [];
    try {
      const existing = await readJSON(bookmarksPath);
      if (Array.isArray(existing)) {
        bookmarks = existing;
      }
    } catch {
      // ファイルが存在しない場合はエラー
      return NextResponse.json(
        { success: false, error: 'お気に入りが見つかりません' },
        { status: 404 }
      );
    }

    // お気に入りを削除
    const index = bookmarks.indexOf(material_id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'お気に入りが見つかりません' },
        { status: 404 }
      );
    }

    bookmarks.splice(index, 1);

    // 保存
    await writeJSON(bookmarksPath, bookmarks);

    debug(MODULE_NAME, `お気に入り削除: userId=${decodedId}, material_id=${material_id}`);

    return NextResponse.json({
      success: true,
      message: 'お気に入りを削除しました',
      bookmarks,
    });
  } catch (err) {
    error(MODULE_NAME, 'お気に入り削除エラー:', err);
    return NextResponse.json(
      { success: false, error: 'お気に入りの削除に失敗しました' },
      { status: 500 }
    );
  }
}

