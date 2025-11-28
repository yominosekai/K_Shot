// アバター画像配信API

import { NextRequest, NextResponse } from 'next/server';
import { getAvatarPath, avatarExists } from '@/shared/lib/file-system/avatar';
import fs from 'fs';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/users/[sid]/avatar';

/**
 * GET /api/users/[sid]/avatar
 * ユーザーのアバター画像を配信
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sid: string }> }
) {
  try {
    const { sid } = await params;
    const decodedSid = decodeURIComponent(sid);

    // アバター画像の存在確認
    if (!avatarExists(decodedSid)) {
      return new NextResponse(null, { status: 404 });
    }

    // アバター画像を読み込み
    const avatarPath = getAvatarPath(decodedSid);
    const imageBuffer = fs.readFileSync(avatarPath);

    // 画像を配信
    // キャッシュバスター（vパラメータ）があるため、immutableを削除し、max-ageを短縮
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, must-revalidate',
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'アバター画像の配信に失敗:', err);
    return new NextResponse(null, { status: 500 });
  }
}

