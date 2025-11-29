// ログ取得API（管理者用）

import { NextRequest, NextResponse } from 'next/server';
import { readErrorLog, readBusyLog } from '@/shared/lib/database/busy-monitor';
import { getUserData } from '@/shared/lib/data-access/users';
import { requireAdmin } from '@/shared/lib/auth/middleware';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/logs';

/**
 * GET /api/admin/logs
 * ログを取得（管理者用）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証・管理者権限チェック
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('user_id');
    const logType = searchParams.get('type') || 'all'; // 'errors', 'busy', 'all'
    const userId = userIdParam || undefined;
    
    const entries: Array<Record<string, any>> = [];
    
    // エラーログを取得
    if (logType === 'errors' || logType === 'all') {
      const errorLogs = readErrorLog(userId, 0); // 全件取得
      errorLogs.forEach(log => {
        entries.push({
          ...log,
          logType: 'error',
        });
      });
    }
    
    // SQLITE_BUSYログを取得
    if (logType === 'busy' || logType === 'all') {
      const busyLogs = readBusyLog(userId, 0); // 全件取得
      busyLogs.forEach(log => {
        entries.push({
          ...log,
          logType: 'busy',
        });
      });
    }
    
    // タイムスタンプでソート（新しい順）
    entries.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });
    
    // ユーザー情報を取得して表示名を追加
    const userIds = new Set<string>();
    entries.forEach((entry) => {
      const id = entry.user_id || entry.userId;
      if (id) {
        userIds.add(id);
      }
    });
    
    const userMap = new Map<string, { display_name: string; username: string }>();
    for (const id of userIds) {
      try {
        const user = await getUserData(id);
        if (user) {
          userMap.set(id, {
            display_name: user.display_name,
            username: user.username,
          });
        }
      } catch {
        // ユーザー取得エラーは無視
      }
    }
    
    // ユーザー情報を追加
    const entriesWithUserInfo = entries.map((entry) => {
      const id = entry.user_id || entry.userId;
      const userInfo = id ? userMap.get(id) : null;
      return {
        ...entry,
        userDisplayName: userInfo?.display_name || id || '不明',
        userUsername: userInfo?.username || '',
      };
    });
    
    return NextResponse.json({
      success: true,
      logs: entriesWithUserInfo,
      total: entriesWithUserInfo.length,
    });
  } catch (err) {
    console.error(`[${MODULE_NAME}] ログ取得エラー:`, err);
    return NextResponse.json(
      {
        success: false,
        error: 'ログの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

