// お気に入り数取得API

import { NextRequest, NextResponse } from 'next/server';
import { readJSON } from '@/shared/lib/file-system/json';
import path from 'path';
import fs from 'fs';
import { info, error } from '@/shared/lib/logger';
import { getUsersRootPath } from '@/shared/lib/file-system/user-storage';

const MODULE_NAME = 'api/materials/[id]/bookmarks-count';

/**
 * GET /api/materials/[id]/bookmarks-count
 * 資料のお気に入り数を取得（全ユーザーのbookmarks.jsonから集計）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    const usersDir = getUsersRootPath();
    let bookmarkCount = 0;

    // ユーザーディレクトリが存在するかチェック
    if (!fs.existsSync(usersDir)) {
      return NextResponse.json({
        success: true,
        count: 0,
      });
    }

    // 全ユーザーのbookmarks.jsonを読み込んで集計
    try {
      const userDirs = fs.readdirSync(usersDir, { withFileTypes: true });
      
      for (const userDir of userDirs) {
        if (!userDir.isDirectory()) {
          continue;
        }

        const bookmarksPath = path.join(usersDir, userDir.name, 'bookmarks.json');
        
        if (fs.existsSync(bookmarksPath)) {
          const bookmarks = await readJSON(bookmarksPath);
          
          if (Array.isArray(bookmarks) && bookmarks.includes(materialId)) {
            bookmarkCount++;
          }
        }
      }
    } catch (err) {
      error(MODULE_NAME, 'お気に入り数集計エラー:', err);
      // エラーが発生しても0を返す
    }

    return NextResponse.json({
      success: true,
      count: bookmarkCount,
    });
  } catch (err) {
    error(MODULE_NAME, 'お気に入り数取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'お気に入り数の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}


