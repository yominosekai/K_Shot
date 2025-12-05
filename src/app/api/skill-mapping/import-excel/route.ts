// Excelインポート実行API

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
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

    // Excelファイルを読み込む
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // シート名を決定
    const sheetName = importType === 'display' ? '表示' : 'データ';
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      return NextResponse.json(
        { success: false, error: `「${sheetName}」シートが見つかりません。エクスポートしたファイルをそのまま使用してください。` },
        { status: 400 }
      );
    }

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
      const dimensions = worksheet.dimensions;
      if (!dimensions) {
        return NextResponse.json(
          { success: false, error: 'シートにデータがありません' },
          { status: 400 }
        );
      }
      
      // 結合セルの情報を取得
      const mergeMap = new Map<string, { r: number; c: number }>();
      const merges = (worksheet.model.merges as unknown) as Array<{ top: number; bottom: number; left: number; right: number }> | undefined;
      merges?.forEach((merge) => {
        const startRow = merge.top - 1; // exceljsは1ベース、0ベースに変換
        const endRow = merge.bottom - 1;
        const startCol = merge.left - 1;
        const endCol = merge.right - 1;
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const key = `${r},${c}`;
            mergeMap.set(key, { r: startRow, c: startCol });
          }
        }
      });

      // データ行を読み込む（2行目以降、ヘッダー行をスキップ）
      const maxRow = dimensions.bottom;
      for (let r = 2; r <= maxRow; r++) {
        const getCellValue = (row: number, col: number): string => {
          const mergeKey = `${row},${col}`;
          const mergeInfo = mergeMap.get(mergeKey);
          const actualRow = mergeInfo ? mergeInfo.r + 1 : row + 1; // exceljsは1ベース
          const actualCol = mergeInfo ? mergeInfo.c + 1 : col + 1;
          const cell = worksheet.getCell(actualRow, actualCol);
          if (cell.value !== null && cell.value !== undefined) {
            return String(cell.value);
          }
          return '';
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
      const dimensions = worksheet.dimensions;
      if (!dimensions) {
        return NextResponse.json(
          { success: false, error: 'シートにデータがありません' },
          { status: 400 }
        );
      }

      // ヘッダー行をスキップしてデータ行を読み込む（2行目から）
      const allData: Array<{
        displayOrder?: number | string;
        category: string;
        item: string;
        subCategory: string;
        smallCategory: string;
        phase: number | string;
        name: string;
        description: string;
      }> = [];

      for (let r = 2; r <= dimensions.bottom; r++) {
        const row: any = {
          displayOrder: '',
          category: '',
          item: '',
          subCategory: '',
          smallCategory: '',
          phase: '',
          name: '',
          description: ''
        };

        const cell1 = worksheet.getCell(r, 1); // 順序
        const cell2 = worksheet.getCell(r, 2); // 大分類
        const cell3 = worksheet.getCell(r, 3); // 項目
        const cell4 = worksheet.getCell(r, 4); // 中分類
        const cell5 = worksheet.getCell(r, 5); // 小分類
        const cell6 = worksheet.getCell(r, 6); // スキルフェーズ
        const cell7 = worksheet.getCell(r, 7); // 取り組み名
        const cell8 = worksheet.getCell(r, 8); // 説明

        row.displayOrder = cell1.value !== null && cell1.value !== undefined ? String(cell1.value) : '';
        row.category = cell2.value !== null && cell2.value !== undefined ? String(cell2.value) : '';
        row.item = cell3.value !== null && cell3.value !== undefined ? String(cell3.value) : '';
        row.subCategory = cell4.value !== null && cell4.value !== undefined ? String(cell4.value) : '';
        row.smallCategory = cell5.value !== null && cell5.value !== undefined ? String(cell5.value) : '';
        row.phase = cell6.value !== null && cell6.value !== undefined ? cell6.value : '';
        row.name = cell7.value !== null && cell7.value !== undefined ? String(cell7.value) : '';
        row.description = cell8.value !== null && cell8.value !== undefined ? String(cell8.value) : '';

        allData.push(row);
      }

      // データを変換
      jsonData = allData.map(row => {
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
      if (row.displayOrder !== undefined) {
        if (typeof row.displayOrder === 'string' && row.displayOrder !== '') {
          const parsed = parseInt(row.displayOrder, 10);
          if (!isNaN(parsed)) {
            displayOrder = parsed;
          }
        } else if (typeof row.displayOrder === 'number') {
          displayOrder = row.displayOrder;
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
