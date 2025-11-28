// 通知送信お気に入り管理API

import { NextRequest, NextResponse } from 'next/server';
import { getUserSubPath } from '@/shared/lib/file-system/user-storage';
import { readJSON, writeJSON } from '@/shared/lib/file-system/json';
import { error, debug } from '@/shared/lib/logger';
import fs from 'fs/promises';
import path from 'path';

const MODULE_NAME = 'api/users/[sid]/notification-favorites';

interface NotificationFavorite {
  id: string;
  name: string;
  userSids: string[];
  createdAt: string;
  updatedAt: string;
}

interface NotificationFavoritesFile {
  favorites: NotificationFavorite[];
}

/**
 * GET /api/users/[sid]/notification-favorites
 * お気に入り一覧を取得
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sid: string }> }
) {
  try {
    const params = await context.params;
    const { sid } = params;
    // URLエンコードされたSIDをデコード
    const decodedSid = decodeURIComponent(sid);

    if (!decodedSid) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーSIDが指定されていません',
        },
        { status: 400 }
      );
    }

    const filePath = getUserSubPath(decodedSid, 'notification-favorites.json');
    const data: NotificationFavoritesFile | null = await readJSON(filePath);

    const favorites = data?.favorites || [];

    debug(MODULE_NAME, `お気に入り一覧取得: ${favorites.length}件`);

    return NextResponse.json({
      success: true,
      favorites,
    });
  } catch (err) {
    error(MODULE_NAME, 'お気に入り一覧取得エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'お気に入り一覧の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/[sid]/notification-favorites
 * お気に入りを追加
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sid: string }> }
) {
  try {
    const params = await context.params;
    const { sid } = params;
    // URLエンコードされたSIDをデコード
    const decodedSid = decodeURIComponent(sid);

    if (!decodedSid) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーSIDが指定されていません',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, userSids } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'お気に入り名を入力してください',
        },
        { status: 400 }
      );
    }

    if (!userSids || !Array.isArray(userSids) || userSids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーを選択してください',
        },
        { status: 400 }
      );
    }

    const filePath = getUserSubPath(decodedSid, 'notification-favorites.json');
    const data: NotificationFavoritesFile | null = await readJSON(filePath);

    const favorites = data?.favorites || [];

    // 重複チェック（同じ名前のお気に入りが既に存在するか）
    if (favorites.some((f) => f.name === name.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: '同じ名前のお気に入りが既に存在します',
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const newFavorite: NotificationFavorite = {
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      userSids: userSids,
      createdAt: now,
      updatedAt: now,
    };

    favorites.push(newFavorite);

    const fileData: NotificationFavoritesFile = {
      favorites,
    };

    // ディレクトリが存在しない場合は作成
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await writeJSON(filePath, fileData);

    debug(MODULE_NAME, `お気に入り追加: ${newFavorite.id}, sid=${decodedSid}`);

    return NextResponse.json({
      success: true,
      favorite: newFavorite,
    });
  } catch (err) {
    error(MODULE_NAME, 'お気に入り追加エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'お気に入りの追加に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[sid]/notification-favorites
 * お気に入りを削除
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sid: string }> }
) {
  try {
    const params = await context.params;
    const { sid } = params;
    // URLエンコードされたSIDをデコード
    const decodedSid = decodeURIComponent(sid);

    if (!decodedSid) {
      return NextResponse.json(
        {
          success: false,
          error: 'ユーザーSIDが指定されていません',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const favoriteId = searchParams.get('id');

    if (!favoriteId) {
      return NextResponse.json(
        {
          success: false,
          error: 'お気に入りIDが指定されていません',
        },
        { status: 400 }
      );
    }

    const filePath = getUserSubPath(decodedSid, 'notification-favorites.json');
    const data: NotificationFavoritesFile | null = await readJSON(filePath);

    if (!data || !data.favorites) {
      return NextResponse.json(
        {
          success: false,
          error: 'お気に入りが見つかりません',
        },
        { status: 404 }
      );
    }

    const favorites = data.favorites.filter((f) => f.id !== favoriteId);

    if (favorites.length === data.favorites.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'お気に入りが見つかりません',
        },
        { status: 404 }
      );
    }

    const fileData: NotificationFavoritesFile = {
      favorites,
    };

    await writeJSON(filePath, fileData);

    debug(MODULE_NAME, `お気に入り削除: ${favoriteId}, sid=${decodedSid}`);

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    error(MODULE_NAME, 'お気に入り削除エラー:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'お気に入りの削除に失敗しました',
      },
      { status: 500 }
    );
  }
}

