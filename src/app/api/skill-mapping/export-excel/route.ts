// ExcelエクスポートAPI

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
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
    const workbook = XLSX.utils.book_new();

    // ===== シート1: データ（フラット形式、編集用） =====
    const dataWorksheetData = [
      // ヘッダー行
      ['順序', '大分類', '項目', '中分類', '小分類', 'スキルフェーズ', '取り組み名', '説明'],
      // データ行
      ...items.map(item => [
        item.displayOrder !== null && item.displayOrder !== undefined ? item.displayOrder : '',
        item.category,
        item.item,
        item.subCategory,
        item.smallCategory,
        item.phase,
        item.name,
        item.description || ''
      ])
    ];

    const dataWorksheet = XLSX.utils.aoa_to_sheet(dataWorksheetData);
    dataWorksheet['!cols'] = [
      { wch: 8 },  // 順序
      { wch: 15 }, // 大分類
      { wch: 20 }, // 項目
      { wch: 20 }, // 中分類
      { wch: 15 }, // 小分類
      { wch: 12 }, // スキルフェーズ
      { wch: 30 }, // 取り組み名
      { wch: 40 }  // 説明
    ];
    XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'データ');

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

    // 大分類ごとにグループ化
    const categoryGroups: Record<string, string[]> = {};
    Object.keys(grouped).forEach(key => {
      const [category] = key.split('|');
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(key);
    });

    // 表示用の行データを生成
    interface DisplayRow {
      displayOrder: number | null; // 順序番号（中分類行ごと）
      category: string | null;
      categoryRowspan: number;
      item: string | null;
      itemRowspan: number;
      subCategory: string;
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

    // 表示シートのデータを生成
    const displayWorksheetData: (string | number)[][] = [
      // ヘッダー行1
      ['順序', '大分類', '項目', '中分類', 'スキルフェーズ', '', '', '', ''],
      // ヘッダー行2
      ['', '', '', '', '1', '2', '3', '4', '5'],
      // データ行
      ...displayRows.map(row => [
        row.displayOrder !== null && row.displayOrder !== undefined ? row.displayOrder : '',
        row.category || '',
        row.item || '',
        row.subCategory,
        row.phase1 || '',
        row.phase2 || '',
        row.phase3 || '',
        row.phase4 || '',
        row.phase5 || ''
      ])
    ];

    const displayWorksheet = XLSX.utils.aoa_to_sheet(displayWorksheetData);

    // 結合セルを設定
    const merges: XLSX.Range[] = [];
    
    // ヘッダー行1の「順序」を結合（A1:A2）
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    // ヘッダー行1の「大分類」を結合（B1:B2）
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
    // ヘッダー行1の「項目」を結合（C1:C2）
    merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
    // ヘッダー行1の「中分類」を結合（D1:D2）
    merges.push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } });
    // ヘッダー行1の「スキルフェーズ」を結合（E1:I1）
    merges.push({ s: { r: 0, c: 4 }, e: { r: 0, c: 8 } });
    
    // データ行の結合セルを設定
    let currentRow = 2; // データ行は2行目から開始（0ベースなので2）
    displayRows.forEach((row, idx) => {
      const rowIndex = currentRow + idx;
      
      // 順序の結合（同じ順序番号の行を結合）
      if (row.displayOrder !== null) {
        // 同じ順序番号を持つ行を探す
        const sameOrderRows = displayRows.filter(r => r.displayOrder === row.displayOrder);
        if (sameOrderRows.length > 1) {
          const firstRowIndex = displayRows.findIndex(r => r.displayOrder === row.displayOrder);
          if (firstRowIndex === idx) {
            merges.push({
              s: { r: rowIndex, c: 0 },
              e: { r: rowIndex + sameOrderRows.length - 1, c: 0 }
            });
          }
        } else {
          // 単独行の場合も結合（1行だけでも結合セルとして設定）
          merges.push({
            s: { r: rowIndex, c: 0 },
            e: { r: rowIndex, c: 0 }
          });
        }
      }
      
      // 大分類の結合
      if (row.category && row.categoryRowspan > 1) {
        merges.push({
          s: { r: rowIndex, c: 1 },
          e: { r: rowIndex + row.categoryRowspan - 1, c: 1 }
        });
      }
      
      // 項目の結合
      if (row.item && row.itemRowspan > 1) {
        merges.push({
          s: { r: rowIndex, c: 2 },
          e: { r: rowIndex + row.itemRowspan - 1, c: 2 }
        });
      }
    });

    displayWorksheet['!merges'] = merges;

    // 列幅を設定
    displayWorksheet['!cols'] = [
      { wch: 8 },  // 順序
      { wch: 15 }, // 大分類
      { wch: 20 }, // 項目
      { wch: 20 }, // 中分類
      { wch: 30 }, // スキルフェーズ1
      { wch: 30 }, // スキルフェーズ2
      { wch: 30 }, // スキルフェーズ3
      { wch: 30 }, // スキルフェーズ4
      { wch: 30 }  // スキルフェーズ5
    ];

    // スタイリングを適用
    const range = XLSX.utils.decode_range(displayWorksheet['!ref'] || 'A1');
    
    // ヘッダー行のスタイル
    // 結合セルの罫線を正しく表示するため、結合セルの範囲全体に罫線を設定
    const borderStyle = {
      top: { style: 'thin' as const, color: { rgb: '000000' } },
      bottom: { style: 'thin' as const, color: { rgb: '000000' } },
      left: { style: 'thin' as const, color: { rgb: '000000' } },
      right: { style: 'thin' as const, color: { rgb: '000000' } }
    };
    
    // ヘッダー行1: 順序（A1:A2結合）
    const cellA1 = displayWorksheet['A1'] || { t: 's', v: '順序' };
    cellA1.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      font: { bold: true, color: { rgb: '000000' }, sz: 11 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: borderStyle
    };
    displayWorksheet['A1'] = cellA1;
    
    // ヘッダー行1: 大分類（B1:B2結合）
    const cellB1 = displayWorksheet['B1'] || { t: 's', v: '大分類' };
    cellB1.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      font: { bold: true, color: { rgb: '000000' }, sz: 11 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: borderStyle
    };
    displayWorksheet['B1'] = cellB1;
    
    // ヘッダー行1: 項目（C1:C2結合）
    const cellC1 = displayWorksheet['C1'] || { t: 's', v: '項目' };
    cellC1.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      font: { bold: true, color: { rgb: '000000' }, sz: 11 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: borderStyle
    };
    displayWorksheet['C1'] = cellC1;
    
    // ヘッダー行1: 中分類（D1:D2結合）
    const cellD1 = displayWorksheet['D1'] || { t: 's', v: '中分類' };
    cellD1.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      font: { bold: true, color: { rgb: '000000' }, sz: 11 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: borderStyle
    };
    displayWorksheet['D1'] = cellD1;
    
    // ヘッダー行1: スキルフェーズ（E1:I1結合）
    const cellE1 = displayWorksheet['E1'] || { t: 's', v: 'スキルフェーズ' };
    cellE1.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      font: { bold: true, color: { rgb: '000000' }, sz: 11 },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const },
      border: borderStyle
    };
    displayWorksheet['E1'] = cellE1;
    
    // 結合セルの右端（I1）にも罫線を設定
    const cellI1 = displayWorksheet['I1'] || { t: 's', v: '' };
    cellI1.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      border: {
        top: { style: 'thin' as const, color: { rgb: '000000' } },
        bottom: { style: 'thin' as const, color: { rgb: '000000' } },
        left: { style: 'thin' as const, color: { rgb: '000000' } },
        right: { style: 'thin' as const, color: { rgb: '000000' } }
      }
    };
    displayWorksheet['I1'] = cellI1;
    
    // ヘッダー行2: スキルフェーズ1～5（E2:I2）
    for (let c = 4; c <= 8; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c });
      const cell = displayWorksheet[cellAddress] || { t: 's', v: String(c - 3) };
      cell.s = {
        fill: { fgColor: { rgb: 'FFE6CC' } },
        font: { bold: true, color: { rgb: '000000' }, sz: 11 },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: borderStyle
      };
      displayWorksheet[cellAddress] = cell;
    }
    
    // I2セルにも右側の罫線を確実に設定
    const cellI2 = displayWorksheet['I2'] || { t: 's', v: '5' };
    if (!cellI2.s) {
      cellI2.s = {
        fill: { fgColor: { rgb: 'FFE6CC' } },
        font: { bold: true, color: { rgb: '000000' }, sz: 11 },
        alignment: { horizontal: 'center' as const, vertical: 'center' as const },
        border: borderStyle
      };
    } else {
      // 既存のスタイルがある場合は、右側の罫線を確実に設定
      cellI2.s.border = {
        ...cellI2.s.border,
        right: { style: 'thin' as const, color: { rgb: '000000' } }
      };
    }
    displayWorksheet['I2'] = cellI2;
    
    // 結合セル内のセル（A2, B2, C2, D2）にも罫線を設定（結合セルの境界を維持）
    const cellA2 = displayWorksheet['A2'] || { t: 's', v: '' };
    cellA2.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      border: {
        top: { style: 'thin' as const, color: { rgb: '000000' } },
        bottom: { style: 'thin' as const, color: { rgb: '000000' } },
        left: { style: 'thin' as const, color: { rgb: '000000' } },
        right: { style: 'thin' as const, color: { rgb: '000000' } }
      }
    };
    displayWorksheet['A2'] = cellA2;
    
    const cellB2 = displayWorksheet['B2'] || { t: 's', v: '' };
    cellB2.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      border: {
        top: { style: 'thin' as const, color: { rgb: '000000' } },
        bottom: { style: 'thin' as const, color: { rgb: '000000' } },
        left: { style: 'thin' as const, color: { rgb: '000000' } },
        right: { style: 'thin' as const, color: { rgb: '000000' } }
      }
    };
    displayWorksheet['B2'] = cellB2;
    
    const cellC2 = displayWorksheet['C2'] || { t: 's', v: '' };
    cellC2.s = {
      fill: { fgColor: { rgb: 'FFE6CC' } },
      border: {
        top: { style: 'thin' as const, color: { rgb: '000000' } },
        bottom: { style: 'thin' as const, color: { rgb: '000000' } },
        left: { style: 'thin' as const, color: { rgb: '000000' } },
        right: { style: 'thin' as const, color: { rgb: '000000' } }
      }
    };
    displayWorksheet['C2'] = cellC2;
    
    // データ行のスタイル
    for (let r = 2; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        if (!displayWorksheet[cellAddress]) {
          displayWorksheet[cellAddress] = { t: 's', v: '' };
        }
        
        const cell = displayWorksheet[cellAddress];
        const row = displayRows[r - 2]; // データ行のインデックス
        
        // 共通の枠線スタイル
        const borderStyle = {
          top: { style: 'thin' as const, color: { rgb: '000000' } },
          bottom: { style: 'thin' as const, color: { rgb: '000000' } },
          left: { style: 'thin' as const, color: { rgb: '000000' } },
          right: { style: 'thin' as const, color: { rgb: '000000' } }
        };
        
        if (row) {
          // 順序列（中央揃え、枠線）
          if (c === 0) {
            cell.s = {
              font: { color: { rgb: '000000' }, sz: 10 },
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: borderStyle
            };
          }
          // 大分類列（中央揃え、グレー背景、太字、枠線）
          else if (c === 1) {
            cell.s = {
              fill: { fgColor: { rgb: 'F0F0F0' } }, // グレー
              font: { bold: true, color: { rgb: '000000' }, sz: 10 },
              alignment: { horizontal: 'center' as const, vertical: 'center' as const },
              border: borderStyle
            };
          }
          // 項目列（左揃え、薄いグレー背景、枠線）
          else if (c === 2) {
            cell.s = {
              fill: { fgColor: { rgb: 'FAFAFA' } }, // 薄いグレー
              font: { color: { rgb: '000000' }, sz: 10 },
              alignment: { horizontal: 'left' as const, vertical: 'center' as const },
              border: borderStyle
            };
          }
          // 中分類列（左揃え、枠線）
          else if (c === 3) {
            cell.s = {
              font: { color: { rgb: '000000' }, sz: 10 },
              alignment: { horizontal: 'left' as const, vertical: 'center' as const },
              border: borderStyle
            };
          }
          // スキルフェーズ列（上揃え、枠線、折り返し表示）
          else if (c >= 4) {
            cell.s = {
              font: { color: { rgb: '000000' }, sz: 9 },
              alignment: { horizontal: 'left' as const, vertical: 'top' as const, wrapText: true },
              border: borderStyle
            };
          }
        } else {
          // 行データがない場合も枠線を適用
          cell.s = {
            border: borderStyle
          };
        }
      }
    }

    // 印刷範囲を設定（描画されているデータ範囲全体）
    const displayRange = displayWorksheet['!ref'];
    if (displayRange) {
      displayWorksheet['!printArea'] = displayRange;
    }
    
    XLSX.utils.book_append_sheet(workbook, displayWorksheet, '表示');

    // Excelファイルを生成
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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
