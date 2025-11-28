// 通知API Routes

import { NextRequest, NextResponse } from 'next/server';
import { createNotificationsForUsers } from '@/shared/lib/data-access/notifications';
import { getMaterialDetail } from '@/shared/lib/data-access/materials';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/notifications';

/**
 * POST /api/notifications
 * 通知を作成（複数ユーザーに一括送信）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_sids, from_user_sid, material_id, title, message, type } = body;

    // バリデーション
    if (!user_sids || !Array.isArray(user_sids) || user_sids.length === 0) {
      return NextResponse.json(
        { success: false, error: '送信先ユーザーが指定されていません' },
        { status: 400 }
      );
    }

    if (!from_user_sid) {
      return NextResponse.json(
        { success: false, error: '送信者情報が取得できません' },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'タイトルとメッセージは必須です' },
        { status: 400 }
      );
    }

    // 資料情報を取得（タイトルに使用）
    let materialTitle = '';
    if (material_id) {
      const material = await getMaterialDetail(material_id);
      if (material) {
        materialTitle = material.title;
      }
    }

    // 通知を作成
    const successCount = await createNotificationsForUsers(
      user_sids,
      from_user_sid,
      material_id || null,
      title,
      message,
      type || 'material_notification'
    );

    if (successCount === 0) {
      return NextResponse.json(
        { success: false, error: '通知の作成に失敗しました' },
        { status: 500 }
      );
    }

    debug(MODULE_NAME, `通知作成成功: ${successCount}/${user_sids.length}件, material_id=${material_id || 'なし'}`);

    return NextResponse.json({
      success: true,
      message: `${successCount}件の通知を作成しました`,
      count: successCount,
    });
  } catch (err) {
    error(MODULE_NAME, '通知作成エラー:', err);
    return NextResponse.json(
      { success: false, error: '通知の作成に失敗しました' },
      { status: 500 }
    );
  }
}

