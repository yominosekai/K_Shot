// Excelインポート実行API

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireTraining } from '@/shared/lib/auth/middleware';
import { getDatabase } from '@/shared/lib/database/db';

const MODULE_NAME = 'api/skill-mapping/import-excel';

/**
 * POST /api/skill-mapping/import-excel
 * Excelファイルを読み込んでデータベースに保存
 */
export async function POST(request: NextRequest) {
  try {
    // 認証・権限チェック
    const authResult = await requireTraining();
    if (!authResult.success) {
      return authResult.response;
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importType = formData.get('type') as string || 'data'; // 'data' または 'display'
    const execute = formData.get('execute') === 'true'; // 実行フラグ

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルがアップロードされていません' },
        { status: 400 }
      );
    }

    // ファイルをバッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Excelファイルを読み込む
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // シート名を決定
    const sheetName = importType === 'display' ? '表示' : 'データ';
    if (!workbook.SheetNames.includes(sheetName)) {
      return NextResponse.json(
        { success: false, error: `「${sheetName}」シートが見つかりません。エクスポートしたファイルをそのまま使用してください。` },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[sheetName];

    let jsonData: Array<{
      category: string;
      item: string;
      subCategory: string;
      smallCategory: string;
      phase: number | string;
      name: string;
      description: string;
      displayOrder?: number;
    }> = [];

    if (importType === 'display') {
      // 「表示」シートからのインポート
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // 結合セルの情報を取得
      const merges = worksheet['!merges'] || [];
      const mergeMap = new Map<string, { r: number; c: number }>();
      merges.forEach((merge: XLSX.Range) => {
        for (let r = merge.s.r; r <= merge.e.r; r++) {
          for (let c = merge.s.c; c <= merge.e.c; c++) {
            const key = `${r},${c}`;
            mergeMap.set(key, { r: merge.s.r, c: merge.s.c });
          }
        }
      });

      // データ行を読み込む（2行目以降、ヘッダー行をスキップ）
      for (let r = 2; r <= range.e.r; r++) {
        const getCellValue = (row: number, col: number): string => {
          const mergeKey = `${row},${col}`;
          const mergeInfo = mergeMap.get(mergeKey);
          const actualRow = mergeInfo ? mergeInfo.r : row;
          const actualCol = mergeInfo ? mergeInfo.c : col;
          const cellAddress = XLSX.utils.encode_cell({ r: actualRow, c: actualCol });
          const cell = worksheet[cellAddress];
          return cell && cell.v ? String(cell.v) : '';
        };

        // 順序番号を取得（A列）
        const displayOrderStr = getCellValue(r, 0);
        let displayOrder: number | undefined = undefined;
        if (displayOrderStr && displayOrderStr.trim() !== '') {
          const parsed = parseInt(displayOrderStr, 10);
          if (!isNaN(parsed)) {
            displayOrder = parsed;
          }
        }

        const category = getCellValue(r, 1); // B列（大分類）
        const item = getCellValue(r, 2); // C列（項目）
        const subCategory = getCellValue(r, 3); // D列（中分類）
        const phase1 = getCellValue(r, 4); // E列（スキルフェーズ1）
        const phase2 = getCellValue(r, 5); // F列（スキルフェーズ2）
        const phase3 = getCellValue(r, 6); // G列（スキルフェーズ3）
        const phase4 = getCellValue(r, 7); // H列（スキルフェーズ4）
        const phase5 = getCellValue(r, 8); // I列（スキルフェーズ5）

        if (!category || !item || !subCategory) continue;

        const phases = [
          { phase: 1, text: phase1 },
          { phase: 2, text: phase2 },
          { phase: 3, text: phase3 },
          { phase: 4, text: phase4 },
          { phase: 5, text: phase5 }
        ];

        phases.forEach(({ phase, text }) => {
          if (!text || text.trim() === '') return;

          const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim() !== '');
          lines.forEach(line => {
            const match = line.match(/^(.+?)[:：]\s*(.+)$/);
            if (match) {
              const smallCategory = match[1].trim();
              const name = match[2].trim();
              
              if (smallCategory && name) {
                jsonData.push({
                  category,
                  item,
                  subCategory,
                  smallCategory,
                  phase,
                  name,
                  description: '',
                  displayOrder
                });
              }
            }
          });
        });
      }
    } else {
      // 「データ」シートからのインポート
      const allData = XLSX.utils.sheet_to_json(worksheet, {
        header: ['displayOrder', 'category', 'item', 'subCategory', 'smallCategory', 'phase', 'name', 'description'],
        defval: '',
      }) as Array<{
        displayOrder?: number | string;
        category: string;
        item: string;
        subCategory: string;
        smallCategory: string;
        phase: number | string;
        name: string;
        description: string;
      }>;

      // 1行目（ヘッダー行）を除外してデータのみを取得
      jsonData = allData.slice(1).map(row => {
        let displayOrder: number | undefined = undefined;
        if (row.displayOrder !== undefined && row.displayOrder !== '') {
          const parsed = typeof row.displayOrder === 'number' 
            ? row.displayOrder 
            : parseInt(String(row.displayOrder), 10);
          if (!isNaN(parsed)) {
            displayOrder = parsed;
          }
        }
        return {
          category: row.category,
          item: row.item,
          subCategory: row.subCategory,
          smallCategory: row.smallCategory,
          phase: row.phase,
          name: row.name,
          description: row.description,
          displayOrder
        };
      });
    }

    // データをバリデーション
    const errors: string[] = [];
    const validData: Array<{
      category: string;
      item: string;
      subCategory: string;
      smallCategory: string;
      phase: number;
      name: string;
      description: string;
      displayOrder?: number;
    }> = [];

    jsonData.forEach((row, index) => {
      const rowNum = importType === 'display' 
        ? `表示シート行${Math.floor(index / 5) + 3}`
        : index + 2;

      // 必須項目チェック
      if (!row.category || String(row.category).trim() === '') {
        errors.push(`行${rowNum}: 大分類が空です`);
        return;
      }
      if (!row.item || String(row.item).trim() === '') {
        errors.push(`行${rowNum}: 項目が空です`);
        return;
      }
      if (!row.subCategory || String(row.subCategory).trim() === '') {
        errors.push(`行${rowNum}: 中分類が空です`);
        return;
      }
      if (!row.smallCategory || String(row.smallCategory).trim() === '') {
        errors.push(`行${rowNum}: 小分類が空です`);
        return;
      }
      if (!row.name || String(row.name).trim() === '') {
        errors.push(`行${rowNum}: 取り組み名が空です`);
        return;
      }

      // スキルフェーズのチェック
      let phase: number;
      if (typeof row.phase === 'number') {
        phase = row.phase;
      } else if (typeof row.phase === 'string') {
        const parsedPhase = parseInt(row.phase, 10);
        if (isNaN(parsedPhase)) {
          errors.push(`行${rowNum}: スキルフェーズが数値ではありません (${row.phase})`);
          return;
        }
        phase = parsedPhase;
      } else {
        errors.push(`行${rowNum}: スキルフェーズが空です`);
        return;
      }

      if (phase < 1 || phase > 5) {
        errors.push(`行${rowNum}: スキルフェーズは1～5の範囲で指定してください (${phase})`);
        return;
      }

      // displayOrderを数値に変換
      let displayOrder: number | undefined = undefined;
      if (row.displayOrder !== undefined && row.displayOrder !== '') {
        const parsed = typeof row.displayOrder === 'number' 
          ? row.displayOrder 
          : parseInt(String(row.displayOrder), 10);
        if (!isNaN(parsed)) {
          displayOrder = parsed;
        }
      }

      // 有効なデータとして追加
      validData.push({
        category: String(row.category).trim(),
        item: String(row.item).trim(),
        subCategory: String(row.subCategory).trim(),
        smallCategory: String(row.smallCategory).trim(),
        phase,
        name: String(row.name).trim(),
        description: row.description ? String(row.description).trim() : '',
        displayOrder: displayOrder
      });
    });

    // エラーがある場合は返す（実行時のみ）
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'データのバリデーションエラー',
          details: errors,
          errorCount: errors.length
        },
        { status: 400 }
      );
    }

    // 実行フラグがfalseの場合は、ここで終了（プレビューは/previewで処理）
    if (!execute) {
      return NextResponse.json({
        success: false,
        error: '実行フラグが設定されていません。プレビューAPIを使用してください。'
      }, { status: 400 });
    }

    // データベースに保存
    const db = getDatabase();

    // トランザクション開始
    const transaction = db.transaction(() => {
      // 既存のデータを全て削除
      db.prepare('DELETE FROM skill_phase_items').run();

      // 新しいデータを挿入
      const insert = db.prepare(`
        INSERT INTO skill_phase_items (
          category,
          item,
          sub_category,
          small_category,
          phase,
          name,
          description,
          display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      validData.forEach((item) => {
        insert.run(
          item.category,
          item.item,
          item.subCategory,
          item.smallCategory,
          item.phase,
          item.name,
          item.description,
          item.displayOrder || null
        );
      });
    });

    transaction();

    return NextResponse.json({
      success: true,
      message: `${validData.length}件のデータをインポートしました`,
      importedCount: validData.length
    });
  } catch (error) {
    console.error(`${MODULE_NAME} エラー:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

