// 編集モード用の型定義

import type { SkillPhaseItem as BaseSkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';

// 編集モード用の拡張型（newRowIdを追加）
export interface SkillPhaseItem extends BaseSkillPhaseItem {
  newRowId?: string; // 新規行のデータを識別するためのID（新規行の場合のみ）
}

export interface NewRow {
  id: string;
  category: string;
  item: string;
  subCategory: string;
  insertAfter?: string;
}

export interface ValidationResult {
  errors: string[];
  errorRowIds: Set<string>; // エラーがある行のID（category|item|subCategory|phase）
}

