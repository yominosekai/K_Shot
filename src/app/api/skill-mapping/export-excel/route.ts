// ExcelエクスポートAPI

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireTraining } from '@/shared/lib/auth/middleware';
import { getSkillPhaseItems } from '@/shared/lib/data-access/skill-mapping';
import type { SkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';

const MODULE_NAME = 'api/skill-mapping/export-excel';

/**
 * GET /api/skill-mapping/export-excel
 * スキルマスタデータをExcel形式でエクスポート
 * データシートと表示シートの2シート構成
 */
export async function GET(request: NextRequest) {
  try {
    // 認証・権限チェック
    const authResult = await requireTraining();
    if (!authResult.success) {
      return authResult.response;
    }

    // スキルマスタデータを取得
    const items = getSkillPhaseItems();

    // ワークブックを作成
    const workbook = new ExcelJS.Workbook();

    // ===== シート1: データ（フラット形式、編集用） =====
    const dataWorksheet = workbook.addWorksheet('データ');
    
    // 列幅を設定
    dataWorksheet.columns = [
      { width: 8 },  // 順序
      { width: 15 }, // 大分類
      { width: 20 }, // 項目
      { width: 20 }, // 中分類
      { width: 15 }, // 小分類
      { width: 12 }, // スキルフェーズ
      { width: 30 }, // 取り組み名
      { width: 40 }  // 説明
    ];

    // ヘッダー行を追加
    dataWorksheet.addRow(['順序', '大分類', '項目', '中分類', '小分類', 'スキルフェーズ', '取り組み名', '説明']);
    
    // データ行を追加
    items.forEach(item => {
      dataWorksheet.addRow([
        item.displayOrder !== null && item.displayOrder !== undefined ? item.displayOrder : '',
        item.category,
        item.item,
        item.subCategory,
        item.smallCategory,
        item.phase,
        item.name,
        item.description || ''
      ]);
    });

    // ===== シート2: 表示（結合セル形式、確認用） =====
    // データを階層ごとにグループ化
    const grouped: Record<string, SkillPhaseItem[]> = {};
    items.forEach(row => {
      const key = `${row.category}|${row.item}|${row.subCategory}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(row);
    });

    // 各グループ内でdisplayOrderでソート（念のため）
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const aOrder = a.displayOrder ?? 999999;
        const bOrder = b.displayOrder ?? 999999;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        if (a.phase !== b.phase) {
          return a.phase - b.phase;
        }
        return a.smallCategory.localeCompare(b.smallCategory);
      });
    });

    // 大分類ごとにグループ化
    const categoryGroups: Record<string, string[]> = {};
    Object.keys(grouped).forEach(key => {
      const [category] = key.split('|');
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(key);
    });

    // 各カテゴリ内でdisplayOrderでソート
    Object.keys(categoryGroups).forEach(category => {
      categoryGroups[category].sort((keyA, keyB) => {
        const groupA = grouped[keyA];
        const groupB = grouped[keyB];
        const orderA = groupA && groupA.length > 0 ? (groupA[0].displayOrder ?? 999999) : 999999;
        const orderB = groupB && groupB.length > 0 ? (groupB[0].displayOrder ?? 999999) : 999999;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // displayOrderが同じ場合は項目名でソート
        const [, itemA] = keyA.split('|');
        const [, itemB] = keyB.split('|');
        if (itemA !== itemB) {
          return itemA.localeCompare(itemB);
        }
        // 項目名も同じ場合は中分類でソート
        const [, , subCategoryA] = keyA.split('|');
        const [, , subCategoryB] = keyB.split('|');
        return subCategoryA.localeCompare(subCategoryB);
      });
    });

    // 表示用の行データを生成
    interface DisplayRow {
      displayOrder: number | null; // 順序番号（中分類行ごと）
      category: string | null;
      categoryRowspan: number;
      item: string | null;
      itemRowspan: number;
      subCategory: string;
      originalCategory: string; // ソート後も参照できるように元の大分類を保持
      originalItem: string; // ソート後も参照できるように元の項目を保持
      phase1: string;
      phase2: string;
      phase3: string;
      phase4: string;
      phase5: string;
    }

    const displayRows: DisplayRow[] = [];
    const categories = Object.keys(categoryGroups).sort();
    
    categories.forEach(category => {
      if (!categoryGroups[category]) return;

      // 項目ごとにグループ化
      const itemGroups: Record<string, string[]> = {};
      categoryGroups[category].forEach(key => {
        const [, item] = key.split('|');
        if (!itemGroups[item]) {
          itemGroups[item] = [];
        }
        itemGroups[item].push(key);
      });

      let categoryRowspan = 0;
      Object.keys(itemGroups).forEach(item => {
        let itemRowspan = 0;
        itemGroups[item].forEach(key => {
          itemRowspan += 1; // 中分類ごとに1行
        });
        categoryRowspan += itemRowspan;
      });

      let categoryRowspanUsed = 0;
      Object.keys(itemGroups).forEach((item, itemIdx) => {
        let itemRowspan = 0;
        itemGroups[item].forEach(key => {
          itemRowspan += 1; // 中分類ごとに1行
        });

        let itemRowspanUsed = 0;
        itemGroups[item].forEach((key, subIdx) => {
          const [, , subCategory] = key.split('|');
          const subCategoryData = grouped[key];
          
          // この中分類行の順序番号を取得（最初のデータのdisplayOrderを使用）
          const displayOrder = subCategoryData.length > 0 && 
            subCategoryData[0].displayOrder !== null && 
            subCategoryData[0].displayOrder !== undefined
            ? subCategoryData[0].displayOrder 
            : null;
          
          // フェーズごとにグループ化
          const phaseGroups: Record<number, SkillPhaseItem[]> = {};
          subCategoryData.forEach(row => {
            if (!phaseGroups[row.phase]) {
              phaseGroups[row.phase] = [];
            }
            phaseGroups[row.phase].push(row);
          });

          // フェーズ1～5のデータを準備
          const phaseData: Record<number, string> = {};
          for (let phase = 1; phase <= 5; phase++) {
            if (phaseGroups[phase]) {
              // 小分類ごとにグループ化
              const smallCategoryGroups: Record<string, SkillPhaseItem[]> = {};
              phaseGroups[phase].forEach(row => {
                if (!smallCategoryGroups[row.smallCategory]) {
                  smallCategoryGroups[row.smallCategory] = [];
                }
                smallCategoryGroups[row.smallCategory].push(row);
              });
              
              // 小分類ごとにテキストを生成（各取り組み名を別行に）
              const texts: string[] = [];
              Object.keys(smallCategoryGroups).forEach(smallCategory => {
                const phaseItems = smallCategoryGroups[smallCategory];
                phaseItems.forEach(item => {
                  texts.push(`${smallCategory}: ${item.name}`);
                });
              });
              phaseData[phase] = texts.join('\n');
            } else {
              phaseData[phase] = '';
            }
          }

          const isFirstCategoryRow = categoryRowspanUsed === 0 && itemIdx === 0 && subIdx === 0;
          const isFirstItemRow = itemRowspanUsed === 0 && subIdx === 0;

          displayRows.push({
            displayOrder: displayOrder,
            category: isFirstCategoryRow ? category : null,
            categoryRowspan: isFirstCategoryRow ? categoryRowspan : 0,
            item: isFirstItemRow ? item : null,
            itemRowspan: isFirstItemRow ? itemRowspan : 0,
            subCategory: subCategory,
            originalCategory: category, // 元の大分類を保持
            originalItem: item, // 元の項目を保持
            phase1: phaseData[1],
            phase2: phaseData[2],
            phase3: phaseData[3],
            phase4: phaseData[4],
            phase5: phaseData[5]
          });

          categoryRowspanUsed++;
          itemRowspanUsed++;
        });
      });
    });

    // displayOrderでソート（nullの場合は最後に配置）
    displayRows.sort((a, b) => {
      if (a.displayOrder === null && b.displayOrder === null) return 0;
      if (a.displayOrder === null) return 1; // nullは最後
      if (b.displayOrder === null) return -1; // nullは最後
      return a.displayOrder - b.displayOrder;
    });

    // ソート後、大分類と項目の結合範囲を再計算
    let currentCategory: string | null = null;
    let currentCategoryStartIdx = -1;
    let currentItem: string | null = null;
    let currentItemStartIdx = -1;

    displayRows.forEach((row, idx) => {
      // 大分類の処理
      if (row.originalCategory && row.originalCategory !== currentCategory) {
        // 前の大分類のrowspanを設定
        if (currentCategory !== null && currentCategoryStartIdx >= 0) {
          const rowspan = idx - currentCategoryStartIdx;
          if (rowspan > 0) {
            displayRows[currentCategoryStartIdx].categoryRowspan = rowspan;
          }
        }
        // 新しい大分類の開始
        currentCategory = row.originalCategory;
        currentCategoryStartIdx = idx;
        row.category = row.originalCategory;
        row.categoryRowspan = 1; // 一時的に1に設定
      } else if (row.originalCategory === currentCategory) {
        // 同じ大分類の続き
        row.category = null;
        row.categoryRowspan = 0;
      } else {
        // 大分類がない場合
        row.category = null;
        row.categoryRowspan = 0;
      }

      // 項目の処理（大分類内で）
      // 大分類が変わった場合は項目もリセット
      if (row.originalCategory !== currentCategory) {
        if (currentItem !== null && currentItemStartIdx >= 0) {
          // 前の項目のrowspanを設定
          const rowspan = idx - currentItemStartIdx;
          if (rowspan > 0) {
            displayRows[currentItemStartIdx].itemRowspan = rowspan;
          }
        }
        currentItem = null;
        currentItemStartIdx = -1;
      }

      if (row.originalItem && row.originalItem !== currentItem && 
          currentCategory === row.originalCategory) {
        // 前の項目のrowspanを設定
        if (currentItem !== null && currentItemStartIdx >= 0) {
          const rowspan = idx - currentItemStartIdx;
          if (rowspan > 0) {
            displayRows[currentItemStartIdx].itemRowspan = rowspan;
          }
        }
        // 新しい項目の開始
        currentItem = row.originalItem;
        currentItemStartIdx = idx;
        row.item = row.originalItem;
        row.itemRowspan = 1; // 一時的に1に設定
      } else if (row.originalItem === currentItem && currentCategory === row.originalCategory) {
        // 同じ項目の続き
        row.item = null;
        row.itemRowspan = 0;
      } else {
        // 項目がない場合
        row.item = null;
        row.itemRowspan = 0;
      }
    });

    // 最後の大分類と項目のrowspanを設定
    if (currentCategory !== null && currentCategoryStartIdx >= 0) {
      const rowspan = displayRows.length - currentCategoryStartIdx;
      if (rowspan > 0) {
        displayRows[currentCategoryStartIdx].categoryRowspan = rowspan;
      }
    }
    if (currentItem !== null && currentItemStartIdx >= 0) {
      const rowspan = displayRows.length - currentItemStartIdx;
      if (rowspan > 0) {
        displayRows[currentItemStartIdx].itemRowspan = rowspan;
      }
    }

    // ===== シート2: 表示（結合セル形式、確認用） =====
    const displayWorksheet = workbook.addWorksheet('表示');
    
    // 列幅を設定
    displayWorksheet.columns = [
      { width: 8 },  // 順序
      { width: 15 }, // 大分類
      { width: 20 }, // 項目
      { width: 20 }, // 中分類
      { width: 30 }, // スキルフェーズ1
      { width: 30 }, // スキルフェーズ2
      { width: 30 }, // スキルフェーズ3
      { width: 30 }, // スキルフェーズ4
      { width: 30 }  // スキルフェーズ5
    ];

    // ヘッダー行1を追加
    displayWorksheet.addRow(['順序', '大分類', '項目', '中分類', 'スキルフェーズ', '', '', '', '']);
    
    // ヘッダー行2を追加
    displayWorksheet.addRow(['', '', '', '', '1', '2', '3', '4', '5']);
    
    // データ行を追加
    displayRows.forEach(row => {
      displayWorksheet.addRow([
        row.displayOrder !== null && row.displayOrder !== undefined ? row.displayOrder : '',
        row.category || '',
        row.item || '',
        row.subCategory,
        row.phase1 || '',
        row.phase2 || '',
        row.phase3 || '',
        row.phase4 || '',
        row.phase5 || ''
      ]);
    });

    // 結合セルを設定（exceljsは1ベース）
    // ヘッダー行1の「順序」を結合（A1:A2）
    displayWorksheet.mergeCells(1, 1, 2, 1);
    // ヘッダー行1の「大分類」を結合（B1:B2）
    displayWorksheet.mergeCells(1, 2, 2, 2);
    // ヘッダー行1の「項目」を結合（C1:C2）
    displayWorksheet.mergeCells(1, 3, 2, 3);
    // ヘッダー行1の「中分類」を結合（D1:D2）
    displayWorksheet.mergeCells(1, 4, 2, 4);
    // ヘッダー行1の「スキルフェーズ」を結合（E1:I1）
    displayWorksheet.mergeCells(1, 5, 1, 9);
    
    // データ行の結合セルを設定
    let currentRow = 3; // データ行は3行目から開始（exceljsは1ベース）
    const mergedCells = new Set<string>(); // マージ済みセルを追跡
    
    displayRows.forEach((row, idx) => {
      const rowIndex = currentRow + idx;
      
      // 順序の結合（同じ順序番号の行を結合）
      if (row.displayOrder !== null) {
        const sameOrderRows = displayRows.filter(r => r.displayOrder === row.displayOrder);
        if (sameOrderRows.length > 1) {
          const firstRowIndex = displayRows.findIndex(r => r.displayOrder === row.displayOrder);
          if (firstRowIndex === idx) {
            const mergeKey = `${rowIndex}:1:${rowIndex + sameOrderRows.length - 1}:1`;
            if (!mergedCells.has(mergeKey)) {
              try {
                displayWorksheet.mergeCells(rowIndex, 1, rowIndex + sameOrderRows.length - 1, 1);
                mergedCells.add(mergeKey);
              } catch (error) {
                // 既にマージされている場合はスキップ
                console.warn(`順序の結合をスキップ: ${mergeKey}`, error);
              }
            }
          }
        } else {
          // 単独行の場合も結合（1行だけでも結合セルとして設定）
          const mergeKey = `${rowIndex}:1:${rowIndex}:1`;
          if (!mergedCells.has(mergeKey)) {
            try {
              displayWorksheet.mergeCells(rowIndex, 1, rowIndex, 1);
              mergedCells.add(mergeKey);
            } catch (error) {
              // 既にマージされている場合はスキップ
              console.warn(`順序の結合をスキップ: ${mergeKey}`, error);
            }
          }
        }
      }
      
      // 大分類の結合（最初の行のみ実行）
      if (row.category && row.categoryRowspan > 1) {
        const mergeKey = `${rowIndex}:2:${rowIndex + row.categoryRowspan - 1}:2`;
        if (!mergedCells.has(mergeKey)) {
          try {
            displayWorksheet.mergeCells(rowIndex, 2, rowIndex + row.categoryRowspan - 1, 2);
            mergedCells.add(mergeKey);
          } catch (error) {
            // 既にマージされている場合はスキップ
            console.warn(`大分類の結合をスキップ: ${mergeKey}`, error);
          }
        }
      }
      
      // 項目の結合（最初の行のみ実行）
      if (row.item && row.itemRowspan > 1) {
        const mergeKey = `${rowIndex}:3:${rowIndex + row.itemRowspan - 1}:3`;
        if (!mergedCells.has(mergeKey)) {
          try {
            displayWorksheet.mergeCells(rowIndex, 3, rowIndex + row.itemRowspan - 1, 3);
            mergedCells.add(mergeKey);
          } catch (error) {
            // 既にマージされている場合はスキップ
            console.warn(`項目の結合をスキップ: ${mergeKey}`, error);
          }
        }
      }
    });

    // スタイリングを適用
    const borderStyle: Partial<ExcelJS.Border> = {
      style: 'thin',
      color: { argb: 'FF000000' }
    };
    
    // ヘッダー行1のスタイル設定
    const header1Cells = [
      { row: 1, col: 1, value: '順序' },
      { row: 1, col: 2, value: '大分類' },
      { row: 1, col: 3, value: '項目' },
      { row: 1, col: 4, value: '中分類' },
      { row: 1, col: 5, value: 'スキルフェーズ' }
    ];
    
    header1Cells.forEach(({ row, col, value }) => {
      const cell = displayWorksheet.getCell(row, col);
      cell.value = value;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE6CC' }
      };
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle
      };
    });
    
    // ヘッダー行2のスタイル設定（スキルフェーズ1～5）
    for (let col = 5; col <= 9; col++) {
      const cell = displayWorksheet.getCell(2, col);
      cell.value = String(col - 4);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE6CC' }
      };
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle
      };
    }
    
    // データ行のスタイル設定
    displayRows.forEach((row, idx) => {
      const rowIndex = 3 + idx; // データ行は3行目から（exceljsは1ベース）
      
      // 順序列（中央揃え、枠線）
      const cell0 = displayWorksheet.getCell(rowIndex, 1);
      cell0.alignment = { horizontal: 'center', vertical: 'middle' };
      cell0.font = { size: 10 };
      cell0.border = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle
      };
      
      // 大分類列（中央揃え、グレー背景、太字、枠線）
      const cell1 = displayWorksheet.getCell(rowIndex, 2);
      if (row.category) {
        cell1.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        };
        cell1.font = { bold: true, size: 10 };
      }
      cell1.alignment = { horizontal: 'center', vertical: 'middle' };
      cell1.border = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle
      };
      
      // 項目列（左揃え、薄いグレー背景、枠線）
      const cell2 = displayWorksheet.getCell(rowIndex, 3);
      if (row.item) {
        cell2.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFAFAFA' }
        };
      }
      cell2.alignment = { horizontal: 'left', vertical: 'middle' };
      cell2.font = { size: 10 };
      cell2.border = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle
      };
      
      // 中分類列（左揃え、枠線）
      const cell3 = displayWorksheet.getCell(rowIndex, 4);
      cell3.alignment = { horizontal: 'left', vertical: 'middle' };
      cell3.font = { size: 10 };
      cell3.border = {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle
      };
      
      // スキルフェーズ列（上揃え、枠線、折り返し表示）
      for (let col = 5; col <= 9; col++) {
        const cell = displayWorksheet.getCell(rowIndex, col);
        cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
        cell.font = { size: 9 };
        cell.border = {
          top: borderStyle,
          bottom: borderStyle,
          left: borderStyle,
          right: borderStyle
        };
      }
    });

    // Excelファイルを生成
    const excelBuffer = await workbook.xlsx.writeBuffer();

    // ファイル名に日時を含める
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const filename = `skill-mapping-data-${dateStr}-${timeStr}.xlsx`;

    // レスポンスを返す
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(`${MODULE_NAME} エラー:`, error);
    return NextResponse.json(
      { success: false, error: 'Excelファイルのエクスポートに失敗しました' },
      { status: 500 }
    );
  }
}
