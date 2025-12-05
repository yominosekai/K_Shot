// ExcelインポートプレビューAPI

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireTraining } from '@/shared/lib/auth/middleware';
import type { SkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';

const MODULE_NAME = 'api/skill-mapping/import-excel/preview';

/**
 * POST /api/skill-mapping/import-excel/preview
 * Excelファイルを読み込んでプレビューデータを返す
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
    const type = formData.get('type') as string; // 'data' or 'display'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイルをバッファに変換
    const arrayBuffer = await file.arrayBuffer();

    // Excelファイルを読み込む
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(arrayBuffer);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Excelファイルの読み込みに失敗しました。ファイル形式を確認してください。' },
        { status: 400 }
      );
    }

    // シート名を決定
    const sheetName = type === 'display' ? '表示' : 'データ';
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

    if (type === 'display') {
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

          // 改行で分割して各取り組みを処理
          // \r\n (Windows), \n (Unix), \r (Mac) のすべてに対応
          const lines = text.split(/\r\n|\r|\n/).filter(line => line.trim() !== '');
          lines.forEach(line => {
            // 「小分類: 取り組み名」の形式を解析（半角・全角コロンに対応）
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

      // 1行目（ヘッダー行）を除外してデータのみを取得
      jsonData = allData.map(row => ({
        category: String(row.category || '').trim(),
        item: String(row.item || '').trim(),
        subCategory: String(row.subCategory || '').trim(),
        smallCategory: String(row.smallCategory || '').trim(),
        phase: row.phase,
        name: String(row.name || '').trim(),
        description: String(row.description || '').trim(),
        displayOrder: row.displayOrder ? (typeof row.displayOrder === 'number' ? row.displayOrder : parseInt(String(row.displayOrder), 10)) : undefined
      }));
    }

    // バリデーション
    const errors: string[] = [];
    const items: SkillPhaseItem[] = [];

    jsonData.forEach((row, index) => {
      const rowNum = type === 'display' 
        ? `表示シート行${Math.floor(index / 5) + 3}`
        : index + 2;

      // 必須項目チェック
      if (!row.category || row.category.trim() === '') {
        errors.push(`行${rowNum}: 大分類が空です`);
        return;
      }
      if (!row.item || row.item.trim() === '') {
        errors.push(`行${rowNum}: 項目が空です`);
        return;
      }
      if (!row.subCategory || row.subCategory.trim() === '') {
        errors.push(`行${rowNum}: 中分類が空です`);
        return;
      }
      if (!row.smallCategory || row.smallCategory.trim() === '') {
        errors.push(`行${rowNum}: 小分類が空です`);
        return;
      }
      if (!row.name || row.name.trim() === '') {
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

      // 有効なデータとして追加
      items.push({
        id: 0,
        category: row.category.trim(),
        item: row.item.trim(),
        subCategory: row.subCategory.trim(),
        smallCategory: row.smallCategory.trim(),
        phase,
        name: row.name.trim(),
        description: row.description ? row.description.trim() : undefined,
        displayOrder: row.displayOrder !== undefined ? row.displayOrder : null
      });
    });

    return NextResponse.json({
      success: true,
      items,
      errors: errors.length > 0 ? errors : undefined,
      rowCount: items.length,
      errorCount: errors.length,
    });
  } catch (error) {
    console.error(`${MODULE_NAME} エラー:`, error);
    return NextResponse.json(
      { success: false, error: 'Excelファイルの処理に失敗しました' },
      { status: 500 }
    );
  }
}
