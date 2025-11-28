// ログ取得API（管理者用）

import { NextRequest, NextResponse } from 'next/server';
import { readErrorLog, readBusyLog } from '@/shared/lib/database/busy-monitor';
import { getUserData } from '@/shared/lib/data-access/users';
import { authenticateUser } from '@/features/auth/api/auth';
import { error } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/logs';

/**
 * GET /api/admin/logs
 * ログを取得（管理者用）
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await authenticateUser();
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 管理者権限チェック
    if (authResult.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userSidParam = searchParams.get('user_sid');
    const logType = searchParams.get('type') || 'all'; // 'errors', 'busy', 'all'
    const userSid = userSidParam || undefined;
    
    const entries: Array<Record<string, any>> = [];
    
    // エラーログを取得
    if (logType === 'errors' || logType === 'all') {
      const errorLogs = readErrorLog(userSid, 0); // 全件取得
      errorLogs.forEach(log => {
        entries.push({
          ...log,
          logType: 'error',
        });
      });
    }
    
    // SQLITE_BUSYログを取得
    if (logType === 'busy' || logType === 'all') {
      const busyLogs = readBusyLog(userSid, 0); // 全件取得
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
    const userSids = new Set<string>();
    entries.forEach(entry => {
      const sid = entry.user_sid || entry.userSid;
      if (sid) {
        userSids.add(sid);
      }
    });
    
    const userMap = new Map<string, { display_name: string; username: string }>();
    for (const sid of userSids) {
      try {
        const user = await getUserData(sid);
        if (user) {
          userMap.set(sid, {
            display_name: user.display_name,
            username: user.username,
          });
        }
      } catch {
        // ユーザー取得エラーは無視
      }
    }
    
    // ユーザー情報を追加
    const entriesWithUserInfo = entries.map(entry => {
      const sid = entry.user_sid || entry.userSid;
      const userInfo = sid ? userMap.get(sid) : null;
      return {
        ...entry,
        userDisplayName: userInfo?.display_name || sid || '不明',
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

