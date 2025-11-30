// アバター画像配信API

import { NextRequest, NextResponse } from 'next/server';
import { getAvatarPath, avatarExists } from '@/shared/lib/file-system/avatar';
import { getCachedAvatar, setCachedAvatar } from '@/shared/lib/cache/avatar-cache';
import fs from 'fs';
import path from 'path';
import { error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[id]/avatar';

/**
 * GET /api/users/[id]/avatar
 * ユーザーのアバター画像を配信（サーバー側メモリキャッシュ使用）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedUserId = decodeURIComponent(id);
    debug(MODULE_NAME, 'アバターリクエスト受信', { userId: decodedUserId });

    // サーバー側メモリキャッシュから取得を試みる
    const cached = getCachedAvatar(decodedUserId);
    if (cached) {
      // キャッシュヒット: 即座に返却（0ms）
      const url = new URL(request.url);
      const hasCacheBuster = url.searchParams.has('v');
      
      return new NextResponse(new Uint8Array(cached.buffer), {
        status: 200,
        headers: {
          'Content-Type': cached.contentType,
          // キャッシュバスターがある場合は再検証、ない場合はimmutable
          'Cache-Control': hasCacheBuster
            ? 'public, max-age=3600, must-revalidate'
            : 'public, max-age=3600, immutable',
        },
      });
    }

    // キャッシュミス: ファイルシステムから読み込み
    let imageBuffer: Buffer;
    let contentType = 'image/png';

    const avatarPath = getAvatarPath(decodedUserId);
    const exists = avatarExists(decodedUserId);
    debug(MODULE_NAME, 'アバターファイル確認', {
      userId: decodedUserId,
      avatarPath,
      exists,
    });

    if (exists) {
      imageBuffer = fs.readFileSync(avatarPath);
    } else {
      // アバターが存在しない場合はデフォルト画像を返す（public/logo.png を使用）
      try {
        const defaultPath = path.join(process.cwd(), 'public', 'logo.png');
        debug(MODULE_NAME, 'デフォルトロゴを使用', { defaultPath });
        imageBuffer = fs.readFileSync(defaultPath);
      } catch {
        // デフォルト画像も見つからない場合は404を返す
        error(MODULE_NAME, 'デフォルトロゴ画像が見つからないため404を返却', {
          cwd: process.cwd(),
        });
        return new NextResponse(null, { status: 404 });
      }
    }

    // キャッシュに保存
    setCachedAvatar(decodedUserId, imageBuffer, contentType);

    // 画像を配信
    const url = new URL(request.url);
    const hasCacheBuster = url.searchParams.has('v');

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // キャッシュバスターがある場合は再検証、ない場合はimmutable
        'Cache-Control': hasCacheBuster
          ? 'public, max-age=3600, must-revalidate'
          : 'public, max-age=3600, immutable',
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'アバター画像の配信に失敗:', err);
    return new NextResponse(null, { status: 500 });
  }
}


