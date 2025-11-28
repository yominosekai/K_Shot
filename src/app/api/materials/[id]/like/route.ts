// いいねAPI Routes

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { info, error, debug } from '@/shared/lib/logger';
import { logBusyError } from '@/shared/lib/database/busy-monitor';

const MODULE_NAME = 'api/materials/[id]/like';

/**
 * POST /api/materials/[id]/like
 * 資料にいいねを追加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const body = await request.json();
    const { user_sid } = body;

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    if (!user_sid) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーSIDが指定されていません',
        },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // 既にいいねしているかチェック
    const checkLike = db.prepare(`
      SELECT * FROM material_likes
      WHERE material_id = ? AND user_sid = ?
    `);
    const existingLike = checkLike.get(materialId, user_sid);

    if (existingLike) {
      return NextResponse.json({
        success: true,
        message: '既にいいねしています',
        is_liked: true,
      });
    }

    // いいねを追加
    const insertLike = db.prepare(`
      INSERT INTO material_likes (material_id, user_sid, created_date)
      VALUES (?, ?, ?)
    `);

    // 資料のいいね数を更新
    const updateLikes = db.prepare(`
      UPDATE materials
      SET likes = likes + 1
      WHERE id = ?
    `);

    // トランザクションで実行
    const transaction = db.transaction(() => {
      insertLike.run(materialId, user_sid, now);
      updateLikes.run(materialId);
    });

    // リトライ処理（最大5回、指数バックオフ）
    const maxRetries = 5;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        transaction();
        if (retryCount > 0) {
          debug(MODULE_NAME, `いいね追加成功（リトライ ${retryCount}回後）: materialId=${materialId}, userSid=${user_sid}`);
          // SQLITE_BUSYが発生したが最終的に成功した場合のログ
          await logBusyError(user_sid, 'addMaterialLike', retryCount, true, { materialId });
        } else {
          debug(MODULE_NAME, `いいね追加: materialId=${materialId}, userSid=${user_sid}`);
        }
        break;
      } catch (err: any) {
        lastError = err;
        if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 50 * retryCount;
          debug(MODULE_NAME, `SQLite書き込み競合検出（リトライ ${retryCount}回目）: materialId=${materialId}, ${waitTime}ms待機`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw err;
      }
    }

    if (retryCount >= maxRetries && lastError) {
      error(MODULE_NAME, `いいね追加失敗（最大リトライ回数に達しました）: materialId=${materialId}`, lastError);
      // SQLITE_BUSYが発生して最終的に失敗した場合のログ
      await logBusyError(user_sid, 'addMaterialLike', retryCount, false, { materialId });
      throw lastError;
    }

    // 更新後のいいね数を取得
    const getLikes = db.prepare(`
      SELECT likes FROM materials WHERE id = ?
    `);
    const material = getLikes.get(materialId) as { likes: number } | undefined;

    return NextResponse.json({
      success: true,
      message: 'いいねを追加しました',
      is_liked: true,
      likes: material?.likes || 0,
    });
  } catch (err) {
    error(MODULE_NAME, 'いいね追加エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'いいねの追加に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[id]/like
 * 資料のいいねを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const body = await request.json();
    const { user_sid } = body;

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    if (!user_sid) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーSIDが指定されていません',
        },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // いいねを削除
    const deleteLike = db.prepare(`
      DELETE FROM material_likes
      WHERE material_id = ? AND user_sid = ?
    `);

    // 資料のいいね数を更新
    const updateLikes = db.prepare(`
      UPDATE materials
      SET likes = CASE WHEN likes - 1 < 0 THEN 0 ELSE likes - 1 END
      WHERE id = ?
    `);

    // トランザクションで実行
    const transaction = db.transaction(() => {
      const result = deleteLike.run(materialId, user_sid);
      if (result.changes > 0) {
        updateLikes.run(materialId);
      }
    });

    // リトライ処理（最大5回、指数バックオフ）
    const maxRetries = 5;
    let retryCount = 0;
    let lastError: any = null;

    while (retryCount < maxRetries) {
      try {
        transaction();
        if (retryCount > 0) {
          debug(MODULE_NAME, `いいね削除成功（リトライ ${retryCount}回後）: materialId=${materialId}, userSid=${user_sid}`);
          // SQLITE_BUSYが発生したが最終的に成功した場合のログ
          await logBusyError(user_sid, 'removeMaterialLike', retryCount, true, { materialId });
        } else {
          debug(MODULE_NAME, `いいね削除: materialId=${materialId}, userSid=${user_sid}`);
        }
        break;
      } catch (err: any) {
        lastError = err;
        if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 50 * retryCount;
          debug(MODULE_NAME, `SQLite書き込み競合検出（リトライ ${retryCount}回目）: materialId=${materialId}, ${waitTime}ms待機`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw err;
      }
    }

    if (retryCount >= maxRetries && lastError) {
      error(MODULE_NAME, `いいね削除失敗（最大リトライ回数に達しました）: materialId=${materialId}`, lastError);
      // SQLITE_BUSYが発生して最終的に失敗した場合のログ
      await logBusyError(user_sid, 'removeMaterialLike', retryCount, false, { materialId });
      throw lastError;
    }

    // 更新後のいいね数を取得
    const getLikes = db.prepare(`
      SELECT likes FROM materials WHERE id = ?
    `);
    const material = getLikes.get(materialId) as { likes: number } | undefined;

    return NextResponse.json({
      success: true,
      message: 'いいねを削除しました',
      is_liked: false,
      likes: material?.likes || 0,
    });
  } catch (err) {
    error(MODULE_NAME, 'いいね削除エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'いいねの削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/materials/[id]/like
 * ユーザーがいいねしているかチェック
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params;
    const { searchParams } = new URL(request.url);
    const user_sid = searchParams.get('user_sid');

    if (!materialId) {
      return NextResponse.json(
        {
          success: false,
          error: '資料IDが指定されていません',
        },
        { status: 400 }
      );
    }

    if (!user_sid) {
      return NextResponse.json({
        success: true,
        is_liked: false,
      });
    }

    const db = getDatabase();
    const checkLike = db.prepare(`
      SELECT * FROM material_likes
      WHERE material_id = ? AND user_sid = ?
    `);
    const like = checkLike.get(materialId, user_sid);

    return NextResponse.json({
      success: true,
      is_liked: !!like,
    });
  } catch (err) {
    error(MODULE_NAME, 'いいねチェックエラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'いいねの確認に失敗しました',
      },
      { status: 500 }
    );
  }
}

