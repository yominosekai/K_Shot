// データ比較ユーティリティ（表記ゆれ検出）

import type { SkillPhaseItem } from '../types';

export interface NewItems {
  categories: string[];
  items: string[];
  subCategories: string[];
  smallCategories: string[];
}

export interface SimilarItem {
  new: string;
  existing: string;
  similarity: number;
}

export interface ComparisonResult {
  newItems: NewItems;
  similarItems: {
    categories: SimilarItem[];
    items: SimilarItem[];
    subCategories: SimilarItem[];
    smallCategories: SimilarItem[];
  };
}

// 文字列の類似度を計算（レーベンシュタイン距離ベース）
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // 完全一致チェック
  if (str1 === str2) return 1.0;
  
  // 正規化（空白削除、大文字小文字統一）
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
  const n1 = normalize(str1);
  const n2 = normalize(str2);
  
  if (n1 === n2) return 0.95; // 空白や大文字小文字の違いのみ
  
  // レーベンシュタイン距離を計算
  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  
  return 1 - (distance / maxLength);
}

// レーベンシュタイン距離の計算
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// 類似項目を検出
function findSimilarItems(
  newItems: string[],
  existingItems: string[],
  threshold: number = 0.7
): SimilarItem[] {
  const similar: SimilarItem[] = [];
  
  newItems.forEach(newItem => {
    existingItems.forEach(existingItem => {
      const similarity = calculateSimilarity(newItem, existingItem);
      if (similarity >= threshold && similarity < 1.0) {
        similar.push({
          new: newItem,
          existing: existingItem,
          similarity: Math.round(similarity * 100) / 100
        });
      }
    });
  });
  
  // 類似度の高い順にソート
  return similar.sort((a, b) => b.similarity - a.similarity);
}

export function compareData(
  existingData: SkillPhaseItem[],
  editedData: SkillPhaseItem[]
): ComparisonResult {
  // 既存データからユニーク値を取得
  const existingCategories = new Set(existingData.map(r => r.category).filter(Boolean));
  const existingItems = new Set(existingData.map(r => r.item).filter(Boolean));
  const existingSubCategories = new Set(existingData.map(r => r.subCategory).filter(Boolean));
  const existingSmallCategories = new Set(existingData.map(r => r.smallCategory).filter(Boolean));
  
  // 編集データからユニーク値を取得
  const editedCategories = new Set(editedData.map(r => r.category).filter(Boolean));
  const editedItems = new Set(editedData.map(r => r.item).filter(Boolean));
  const editedSubCategories = new Set(editedData.map(r => r.subCategory).filter(Boolean));
  const editedSmallCategories = new Set(editedData.map(r => r.smallCategory).filter(Boolean));
  
  // 新規追加される項目を抽出
  const newCategories = Array.from(editedCategories).filter(cat => !existingCategories.has(cat));
  const newItems = Array.from(editedItems).filter(item => !existingItems.has(item));
  const newSubCategories = Array.from(editedSubCategories).filter(sub => !existingSubCategories.has(sub));
  const newSmallCategories = Array.from(editedSmallCategories).filter(small => !existingSmallCategories.has(small));
  
  // 類似項目を検出
  const similarCategories = findSimilarItems(newCategories, Array.from(existingCategories));
  const similarItems = findSimilarItems(newItems, Array.from(existingItems));
  const similarSubCategories = findSimilarItems(newSubCategories, Array.from(existingSubCategories));
  const similarSmallCategories = findSimilarItems(newSmallCategories, Array.from(existingSmallCategories));
  
  return {
    newItems: {
      categories: newCategories,
      items: newItems,
      subCategories: newSubCategories,
      smallCategories: newSmallCategories
    },
    similarItems: {
      categories: similarCategories,
      items: similarItems,
      subCategories: similarSubCategories,
      smallCategories: similarSmallCategories
    }
  };
}

