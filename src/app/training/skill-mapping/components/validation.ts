// バリデーション関数

import type { SkillPhaseItem, NewRow, ValidationResult } from './types';

export function validateData(
  data: SkillPhaseItem[], 
  newRows?: NewRow[]
): ValidationResult {
  const errors: string[] = [];
  const errorRowIds = new Set<string>();
  
  // 既存データのバリデーション
  data.forEach((row, idx) => {
    const rowId = `${row.category}|${row.item}|${row.subCategory}|${row.phase}`;
    let hasError = false;
    
    if (!row.category || row.category.trim() === '') {
      errors.push(`行${idx + 1}: 大分類が空です`);
      hasError = true;
    }
    if (!row.item || row.item.trim() === '') {
      errors.push(`行${idx + 1}: 項目が空です`);
      hasError = true;
    }
    if (!row.subCategory || row.subCategory.trim() === '') {
      errors.push(`行${idx + 1}: 中分類が空です`);
      hasError = true;
    }
    if (!row.smallCategory || row.smallCategory.trim() === '') {
      errors.push(`行${idx + 1}: 小分類が空です`);
      hasError = true;
    }
    if (!row.phase || row.phase < 1 || row.phase > 5) {
      errors.push(`行${idx + 1}: スキルフェーズは1～5の範囲で指定してください`);
      hasError = true;
    }
    if (!row.name || row.name.trim() === '') {
      errors.push(`行${idx + 1}: 取り組み名が空です`);
      hasError = true;
    }
    
    if (hasError) {
      errorRowIds.add(rowId);
    }
  });
  
  // 新規追加行のバリデーション
  if (newRows && newRows.length > 0) {
    newRows.forEach((newRow, idx) => {
      const rowKey = `新規追加行${idx + 1}`;
      let hasError = false;
      
      if (!newRow.category || newRow.category.trim() === '') {
        errors.push(`${rowKey}: 大分類が空です`);
        hasError = true;
      }
      if (!newRow.item || newRow.item.trim() === '') {
        errors.push(`${rowKey}: 項目が空です`);
        hasError = true;
      }
      if (!newRow.subCategory || newRow.subCategory.trim() === '') {
        errors.push(`${rowKey}: 中分類が空です`);
        hasError = true;
      }
      
      // エラーがある場合、その行のIDを記録（表示用）
      if (hasError) {
        // 新規追加行の場合は、行IDとしてnewRow.idを使用
        errorRowIds.add(`new-${newRow.id}`);
      }
    });
  }
  
  return { errors, errorRowIds };
}

