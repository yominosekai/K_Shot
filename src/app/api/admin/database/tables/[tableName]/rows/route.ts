// データベーステーブル行追加API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getActivityAggregatorDb } from '@/shared/lib/activity-aggregator/local-db';
import { authenticateUser } from '@/features/auth/api/auth';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/database/tables/[tableName]/rows';

/**
 * POST /api/admin/database/tables/[tableName]/rows
 * テーブルに新しい行を追加（管理者のみ）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
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

    const { tableName } = await params;
    const { searchParams } = new URL(request.url);
    const dbType = searchParams.get('type') || 'network';
    const body = await request.json();
    const { data: insertData } = body;

    // DBタイプに応じて適切なDBを取得
    const db = dbType === 'local' ? getActivityAggregatorDb() : getDatabase();

    // テーブル名の検証
    const validTableName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
    if (!validTableName) {
      return NextResponse.json(
        { success: false, error: '無効なテーブル名です' },
        { status: 400 }
      );
    }

    // テーブルのカラム情報を取得
    const columnsInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    // 自動値を設定
    const processedData = { ...insertData };
    const now = new Date().toISOString();

    for (const colInfo of columnsInfo) {
      const colName = colInfo.name;
      const isPrimaryKey = colInfo.pk === 1;
      const isNotNull = colInfo.notnull === 1;
      const hasValue = processedData[colName] !== undefined && processedData[colName] !== null && processedData[colName] !== '';

      // 主キーで値が未設定の場合、自動生成
      if (isPrimaryKey && !hasValue) {
        if (tableName === 'departments' && colName === 'id') {
          // departmentsテーブルのIDを連番で自動生成（categoriesと同じ方式）
          const existingDepartments = db.prepare('SELECT id FROM departments').all() as Array<{ id: string }>;
          let maxId = 0;
          for (const dept of existingDepartments) {
            const numId = parseInt(dept.id, 10);
            if (!isNaN(numId) && numId > maxId) {
              maxId = numId;
            }
          }
          processedData[colName] = String(maxId + 1);
        } else if (tableName === 'categories' && colName === 'id') {
          // categoriesテーブルのIDを連番で自動生成
          const existingCategories = db.prepare('SELECT id FROM categories').all() as Array<{ id: string }>;
          let maxId = 0;
          for (const cat of existingCategories) {
            const numId = parseInt(cat.id, 10);
            if (!isNaN(numId) && numId > maxId) {
              maxId = numId;
            }
          }
          processedData[colName] = String(maxId + 1);
        } else if (colName.toLowerCase().includes('id') || colName.toLowerCase().includes('_id')) {
          // その他のIDカラムはタイムスタンプベース
          processedData[colName] = Date.now().toString();
        } else {
          // その他の主キーはタイムスタンプベース
          processedData[colName] = Date.now().toString();
        }
      }

      // created_dateカラムで値が未設定の場合、現在日時を設定
      if ((colName.toLowerCase() === 'created_date' || colName.toLowerCase() === 'created_at') && !hasValue) {
        processedData[colName] = now;
      }

      // updated_dateカラムで値が未設定の場合、現在日時を設定
      if ((colName.toLowerCase() === 'updated_date' || colName.toLowerCase() === 'updated_at') && !hasValue) {
        processedData[colName] = now;
      }
    }

    // カラム名の検証とINSERT文を構築
    const columns = Object.keys(processedData).filter((key) =>
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
    );
    const values = columns.map((key) => processedData[key]);

    if (columns.length === 0) {
      return NextResponse.json(
        { success: false, error: '追加するデータがありません' },
        { status: 400 }
      );
    }

    const placeholders = columns.map(() => '?').join(', ');
    const stmt = db.prepare(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
    );
    const result = stmt.run(...values);

    debug(MODULE_NAME, `テーブル ${tableName} に行を追加: ${result.lastInsertRowid}`);

    return NextResponse.json({
      success: true,
      lastInsertRowid: result.lastInsertRowid,
    });
  } catch (err) {
    error(MODULE_NAME, '行追加エラー:', err);
    return NextResponse.json(
      { success: false, error: '行の追加に失敗しました' },
      { status: 500 }
    );
  }
}

