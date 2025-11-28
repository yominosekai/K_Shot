// ユーザー活動履歴管理（localStorage）

export interface ActivityHistoryItem {
  materialId: string;
  materialTitle: string;
  viewedAt: string; // ISO 8601形式
}

const ACTIVITY_HISTORY_KEY = 'user_activity_history';
const MAX_HISTORY_ITEMS = 30; // 保持する最大件数
const DISPLAY_ITEMS = 10; // 表示する件数

/**
 * 活動履歴に資料閲覧を追加
 */
export function addMaterialView(materialId: string, materialTitle: string): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getActivityHistory();
    
    // 既に同じ資料が履歴にある場合は削除（重複防止）
    const filteredHistory = history.filter((item) => item.materialId !== materialId);
    
    // 新しい履歴を先頭に追加
    const newItem: ActivityHistoryItem = {
      materialId,
      materialTitle,
      viewedAt: new Date().toISOString(),
    };
    
    const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (err) {
    console.error('活動履歴の保存に失敗しました:', err);
  }
}

/**
 * 活動履歴を取得（表示用、最新N件）
 */
export function getActivityHistory(limit: number = DISPLAY_ITEMS): ActivityHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(ACTIVITY_HISTORY_KEY);
    if (!stored) return [];

    const history: ActivityHistoryItem[] = JSON.parse(stored);
    
    // 日時でソート（新しい順）
    const sorted = history.sort((a, b) => 
      new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
    );
    
    return sorted.slice(0, limit);
  } catch (err) {
    console.error('活動履歴の取得に失敗しました:', err);
    return [];
  }
}

/**
 * 活動履歴から特定の項目を削除
 */
export function removeActivityItem(materialId: string, viewedAt: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(ACTIVITY_HISTORY_KEY);
    if (!stored) return;

    const history: ActivityHistoryItem[] = JSON.parse(stored);
    
    // materialIdとviewedAtで一致する項目を削除
    const filteredHistory = history.filter(
      (item) => !(item.materialId === materialId && item.viewedAt === viewedAt)
    );
    
    localStorage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(filteredHistory));
  } catch (err) {
    console.error('活動履歴の削除に失敗しました:', err);
  }
}

/**
 * 活動履歴をクリア
 */
export function clearActivityHistory(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(ACTIVITY_HISTORY_KEY);
  } catch (err) {
    console.error('活動履歴のクリアに失敗しました:', err);
  }
}

