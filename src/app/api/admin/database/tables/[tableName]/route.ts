// データベーステーブルデータ取得・編集API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getActivityAggregatorDb } from '@/shared/lib/activity-aggregator/local-db';
import { authenticateUser } from '@/features/auth/api/auth';
import { info, error, debug } from '@/shared/lib/logger';

const MODULE_NAME = 'api/admin/database/tables/[tableName]';

/**
 * GET /api/admin/database/tables/[tableName]
 * テーブルのデータを取得（管理者のみ）
 */
export async function GET(
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;
    const dbType = searchParams.get('type') || 'network';

    // DBタイプに応じて適切なDBを取得
    const db = dbType === 'local' ? getActivityAggregatorDb() : getDatabase();

    // テーブル名の検証（SQLインジェクション対策）
    const validTableName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
    if (!validTableName) {
      return NextResponse.json(
        { success: false, error: '無効なテーブル名です' },
        { status: 400 }
      );
    }

    // テーブルが存在するか確認
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
      .get(tableName);
    if (!tableExists) {
      return NextResponse.json(
        { success: false, error: 'テーブルが見つかりません' },
        { status: 404 }
      );
    }

    // テーブルのカラム情報を取得
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: any;
      pk: number;
    }>;

    // データを取得
    const data = db
      .prepare(`SELECT * FROM ${tableName} LIMIT ? OFFSET ?`)
      .all(limit, offset) as any[];

    // 総件数を取得
    const totalCount = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as {
      count: number;
    };

    debug(MODULE_NAME, `テーブル ${tableName} のデータ取得: ${data.length}件`);

    return NextResponse.json({
      success: true,
      tableName,
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        primaryKey: col.pk === 1,
        defaultValue: col.dflt_value,
      })),
      data,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (err) {
    error(MODULE_NAME, 'テーブルデータ取得エラー:', err);
    return NextResponse.json(
      { success: false, error: 'テーブルデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/database/tables/[tableName]
 * テーブルのデータを更新（管理者のみ）
 */
export async function PUT(
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
    const { primaryKey, primaryKeyValue, data: updateData } = body;

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

    // カラム名の検証
    const validColumnName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(primaryKey);
    if (!validColumnName) {
      return NextResponse.json(
        { success: false, error: '無効なカラム名です' },
        { status: 400 }
      );
    }

    // UPDATE文を構築
    const setClause = Object.keys(updateData)
      .filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key))
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.keys(updateData)
      .filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key))
      .map((key) => updateData[key]);

    if (setClause === '') {
      return NextResponse.json(
        { success: false, error: '更新するデータがありません' },
        { status: 400 }
      );
    }

    values.push(primaryKeyValue);

    const stmt = db.prepare(
      `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = ?`
    );
    const result = stmt.run(...values);

    debug(MODULE_NAME, `テーブル ${tableName} のデータ更新: ${result.changes}件`);

    return NextResponse.json({
      success: true,
      changes: result.changes,
    });
  } catch (err) {
    error(MODULE_NAME, 'テーブルデータ更新エラー:', err);
    return NextResponse.json(
      { success: false, error: 'テーブルデータの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/database/tables/[tableName]
 * テーブルのデータを削除（管理者のみ）
 */
export async function DELETE(
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
    const primaryKey = searchParams.get('primaryKey');
    const primaryKeyValue = searchParams.get('primaryKeyValue');
    const dbType = searchParams.get('type') || 'network';

    if (!primaryKey) {
      return NextResponse.json(
        { success: false, error: '主キーが必要です' },
        { status: 400 }
      );
    }

    // DBタイプに応じて適切なDBを取得
    const db = dbType === 'local' ? getActivityAggregatorDb() : getDatabase();

    // テーブル名とカラム名の検証
    const validTableName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
    const validColumnName = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(primaryKey);
    if (!validTableName || !validColumnName) {
      return NextResponse.json(
        { success: false, error: '無効なテーブル名またはカラム名です' },
        { status: 400 }
      );
    }

    // primaryKeyValueが"null"（文字列）または実際のnullの場合、NULL値として扱う
    const isNullValue = !primaryKeyValue || primaryKeyValue === 'null' || primaryKeyValue === 'NULL';

    // 外部キー制約を有効化
    db.prepare('PRAGMA foreign_keys = ON').run();

    // 削除前に参照チェック（主要なテーブル関係を確認）
    let referencedBy: string[] = [];
    
    if (!isNullValue) {
      // NULL値でない場合のみ参照チェックを実行
      if (tableName === 'categories') {
        // categoriesテーブルの場合、materialsテーブルから参照されているかチェック
        const materialsCount = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE category_id = ?')
          .get(primaryKeyValue) as { count: number };
        if (materialsCount.count > 0) {
          referencedBy.push(`materials (${materialsCount.count}件の資料)`);
        }
      } else if (tableName === 'material_types') {
        // material_typesテーブルの場合、materialsテーブルから参照されているかチェック
        const materialsCount = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE type = ?')
          .get(primaryKeyValue) as { count: number };
        if (materialsCount.count > 0) {
          referencedBy.push(`materials (${materialsCount.count}件の資料)`);
        }
      } else if (tableName === 'difficulty_levels') {
        // difficulty_levelsテーブルの場合、materialsテーブルから参照されているかチェック
        const materialsCount = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE difficulty = ?')
          .get(primaryKeyValue) as { count: number };
        if (materialsCount.count > 0) {
          referencedBy.push(`materials (${materialsCount.count}件の資料)`);
        }
      } else if (tableName === 'users') {
        // usersテーブルの場合、複数のテーブルから参照されている可能性がある
        const materialsCount = db
          .prepare('SELECT COUNT(*) as count FROM materials WHERE created_by = ?')
          .get(primaryKeyValue) as { count: number };
        if (materialsCount.count > 0) {
          referencedBy.push(`materials (${materialsCount.count}件の資料)`);
        }
        
        const foldersCount = db
          .prepare('SELECT COUNT(*) as count FROM folders WHERE created_by = ?')
          .get(primaryKeyValue) as { count: number };
        if (foldersCount.count > 0) {
          referencedBy.push(`folders (${foldersCount.count}件のフォルダ)`);
        }
      }
    }

    if (referencedBy.length > 0) {
      const errorMessage = `このレコードは削除できません。以下のテーブルから参照されています:\n${referencedBy.join('\n')}\n\n削除するには、まず参照しているレコードを削除または変更してください。`;
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    // NULL値の場合はIS NULL、それ以外は=を使用
    const stmt = isNullValue
      ? db.prepare(`DELETE FROM ${tableName} WHERE ${primaryKey} IS NULL`)
      : db.prepare(`DELETE FROM ${tableName} WHERE ${primaryKey} = ?`);
    
    const result = isNullValue ? stmt.run() : stmt.run(primaryKeyValue);

    debug(MODULE_NAME, `テーブル ${tableName} のデータ削除: ${result.changes}件`);

    return NextResponse.json({
      success: true,
      changes: result.changes,
    });
  } catch (err: any) {
    error(MODULE_NAME, 'テーブルデータ削除エラー:', err);
    
    // 外部キー制約エラーの場合、より分かりやすいメッセージを返す
    if (err?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'このレコードは削除できません。他のテーブルから参照されています。参照しているレコードを先に削除または変更してください。' 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'テーブルデータの削除に失敗しました' },
      { status: 500 }
    );
  }
}

