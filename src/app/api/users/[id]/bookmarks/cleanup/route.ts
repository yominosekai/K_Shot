// 存在しない資料のお気に入りを一括削除

import { NextRequest, NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/shared/lib/file-system/json';
import { error, debug, info } from '@/shared/lib/logger';
import { getUserSubPath } from '@/shared/lib/file-system/user-storage';
import { getDatabase } from '@/shared/lib/database/db';
import path from 'path';

const MODULE_NAME = 'api/users/[id]/bookmarks/cleanup';

/**
 * POST /api/users/[id]/bookmarks/cleanup
 * 存在しない資料のお気に入りを一括削除
 * 
 * クエリパラメータ:
 * - check_only: true の場合、削除対象をチェックするのみ（削除は実行しない）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);
    const { searchParams } = new URL(request.url);
    const checkOnly = searchParams.get('check_only') === 'true';
    
    const bookmarksPath = getUserSubPath(decodedId, 'bookmarks.json');

    // お気に入り一覧を取得
    let bookmarks: string[] = [];
    try {
      const existing = await readJSON(bookmarksPath);
      if (Array.isArray(existing)) {
        bookmarks = existing;
      }
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // ファイルが存在しない場合は空配列
        return NextResponse.json({
          success: true,
          removedCount: 0,
          removedMaterials: [],
          message: 'お気に入りがありません',
        });
      }
      throw err;
    }

    if (bookmarks.length === 0) {
      return NextResponse.json({
        success: true,
        removedCount: 0,
        removedMaterials: [],
        message: '削除するお気に入りがありません',
      });
    }

    // 資料が存在するかチェック（IN句で一括取得してDB負荷を軽減）
    const db = getDatabase();
    
    // プレースホルダーを生成（SQLiteの制限: 999個まで）
    const placeholders = bookmarks.map(() => '?').join(',');
    const checkMaterials = db.prepare(`SELECT id, title FROM materials WHERE id IN (${placeholders})`);
    const existingMaterials = checkMaterials.all(...bookmarks) as Array<{ id: string; title: string }>;
    
    // 存在する資料IDのセットを作成
    const existingMaterialIds = new Set(existingMaterials.map(m => m.id));
    
    const validBookmarks: string[] = [];
    const removedBookmarks: Array<{ id: string; title?: string }> = [];

    for (const materialId of bookmarks) {
      if (existingMaterialIds.has(materialId)) {
        validBookmarks.push(materialId);
      } else {
        removedBookmarks.push({ id: materialId });
        debug(MODULE_NAME, `存在しない資料を検出: materialId=${materialId}`);
      }
    }

    // チェックのみの場合は削除を実行しない
    if (checkOnly) {
      return NextResponse.json({
        success: true,
        removedCount: removedBookmarks.length,
        removedMaterials: removedBookmarks,
        message: removedBookmarks.length > 0 
          ? `${removedBookmarks.length}件の存在しない資料が見つかりました`
          : '削除するお気に入りがありません',
      });
    }

    // 存在しない資料のお気に入りを削除
    if (removedBookmarks.length > 0) {
      // ディレクトリが存在しない場合は作成
      const bookmarksDir = path.dirname(bookmarksPath);
      await import('fs/promises').then((fs) =>
        fs.mkdir(bookmarksDir, { recursive: true })
      );

      // 有効なお気に入りのみを保存
      await writeJSON(bookmarksPath, validBookmarks);
      
      info(MODULE_NAME, `存在しない資料のお気に入りを削除: userId=${decodedId}, 削除数=${removedBookmarks.length}`);
    }

    return NextResponse.json({
      success: true,
      removedCount: removedBookmarks.length,
      removedMaterials: removedBookmarks,
      message: removedBookmarks.length > 0 
        ? `${removedBookmarks.length}件の存在しない資料をお気に入りから削除しました`
        : '削除するお気に入りがありません',
    });
  } catch (err) {
    error(MODULE_NAME, 'お気に入りクリーンアップエラー:', err);
    return NextResponse.json(
      { success: false, error: 'お気に入りのクリーンアップに失敗しました' },
      { status: 500 }
    );
  }
}

