// 日付フォーマットユーティリティ

export function formatDate(dateStr: string, granularity: 'daily' | 'weekly' | 'monthly'): string {
  const date = new Date(dateStr);
  if (granularity === 'daily') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } else if (granularity === 'weekly') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } else {
    return `${date.getFullYear()}/${date.getMonth() + 1}`;
  }
}

export function getAvailableGranularities(
  period: '7' | '30' | '90' | '365'
): ('daily' | 'weekly' | 'monthly')[] {
  if (period === '7') {
    return ['daily'];
  } else if (period === '30') {
    return ['daily', 'weekly'];
  } else if (period === '90') {
    return ['weekly', 'monthly'];
  } else {
    return ['monthly'];
  }
}



