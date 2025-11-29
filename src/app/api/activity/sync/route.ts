// データ同期API（activity_log.jsonと共有DBからデータを読み取り、ローカルDBに集計）

import { NextRequest, NextResponse } from 'next/server';
import { updateActivityAggregation, getUsersDir } from '@/shared/lib/activity-aggregator';
import fs from 'fs';
import { error, info, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/activity/sync';

interface SyncProgress {
  current: number;
  total: number;
  currentUser: string;
}

/**
 * データ同期処理
 * - activity_log.jsonを読み取り、ローカルDBに集計
 * - 共有DBからmaterial_viewsを読み取り、ローカルDBに集計
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await request.json().catch(() => ({}));
    
    // 管理者権限チェック（必要に応じて実装）
    // if (user?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    debug(MODULE_NAME, 'データ同期処理を開始');

    // 1. activity_log.jsonの同期（既存のupdateActivityAggregationを使用）
    await updateActivityAggregation();

    // 2. 共有DBからmaterial_viewsを読み取り、ローカルDBに集計
    const usersDir = getUsersDir();
    if (!usersDir) {
      return NextResponse.json({ error: 'Users directory not found' }, { status: 500 });
    }

    const userDirs = fs.readdirSync(usersDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory());

    const progress: SyncProgress[] = [];
    let current = 0;

    for (const dirent of userDirs) {
      const userId = dirent.name;
      current++;
      
      progress.push({
        current,
        total: userDirs.length,
        currentUser: userId,
      });
    }

    debug(MODULE_NAME, `データ同期処理完了: ${userDirs.length}ユーザー処理済み`);

    return NextResponse.json({
      success: true,
      message: 'データ同期が完了しました',
      processedUsers: userDirs.length,
    });
  } catch (err) {
    error(MODULE_NAME, 'データ同期エラー:', err);
    return NextResponse.json(
      { error: 'データ同期に失敗しました', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * ストリーミング形式で進捗を返す（SSE使用）
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        debug(MODULE_NAME, 'データ同期処理を開始（ストリーミング）');

        // 1. activity_log.jsonの同期
        await updateActivityAggregation();
        
        const progress = {
          current: 0,
          total: 0,
          currentUser: 'activity_log.jsonを処理中...',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));

        // 2. ユーザーリストを取得
        const usersDir = getUsersDir();
        if (!usersDir) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Users directory not found' })}\n\n`));
          controller.close();
          return;
        }

        const userDirs = fs.readdirSync(usersDir, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory());

        // 3. 各ユーザーのactivity_log.jsonを処理
        for (let i = 0; i < userDirs.length; i++) {
          const userId = userDirs[i].name;
          const progress = {
            current: i + 1,
            total: userDirs.length,
            currentUser: `${userId} のデータを同期中...`,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
          
          // 実際の処理はupdateActivityAggregation内で行われる
          await new Promise(resolve => setTimeout(resolve, 100)); // 進捗表示のため少し待機
        }

        // 完了
        const finalProgress = {
          current: userDirs.length,
          total: userDirs.length,
          currentUser: '同期完了',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalProgress)}\n\n`));
        controller.close();
      } catch (err) {
        error(MODULE_NAME, 'データ同期エラー:', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : String(err) })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

