/**
 * タイムゾーン関連のユーティリティ関数
 * 日本時間（JST、UTC+9）を基準にした日付計算を行う
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // JSTはUTC+9時間

/**
 * 日本時間（JST）で「今日」の開始時刻（00:00:00）をUTCのDateオブジェクトとして取得
 * @returns 日本時間の「今日」の開始時刻（UTC形式）
 */
export function getJSTTodayStart(): Date {
  const now = new Date();
  // 現在時刻をJSTに変換して年・月・日を取得
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const date = jstNow.getUTCDate();
  
  // UTCベースでJSTの「今日」の00:00:00を作成（Date.UTCを使用）
  const jstTodayUTC = Date.UTC(year, month, date, 0, 0, 0, 0);
  // JSTオフセットを減算してUTC時刻に戻す
  return new Date(jstTodayUTC - JST_OFFSET_MS);
}

/**
 * 日本時間（JST）で「今日」の日付文字列（YYYY-MM-DD）を取得
 * @returns 日本時間の「今日」の日付文字列
 */
export function getJSTTodayString(): string {
  const jstTodayStart = getJSTTodayStart();
  const jstToday = new Date(jstTodayStart.getTime() + JST_OFFSET_MS);
  // UTCメソッドを使用してタイムゾーンに依存しない日付文字列を生成
  return `${jstToday.getUTCFullYear()}-${String(jstToday.getUTCMonth() + 1).padStart(2, '0')}-${String(jstToday.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 日本時間（JST）で指定日数前の開始時刻をUTCのDateオブジェクトとして取得
 * @param days 何日前か（0なら今日）
 * @returns 日本時間の指定日の開始時刻（UTC形式）
 */
export function getJSTDateStart(daysAgo: number): Date {
  const todayStart = getJSTTodayStart();
  const targetDate = new Date(todayStart);
  targetDate.setDate(targetDate.getDate() - daysAgo);
  return targetDate;
}

/**
 * 日本時間（JST）で指定日数の日付文字列（YYYY-MM-DD）を取得
 * @param daysAgo 何日前か（0なら今日）
 * @returns 日本時間の指定日の日付文字列
 */
export function getJSTDateString(daysAgo: number): string {
  const dateStart = getJSTDateStart(daysAgo);
  const jstDate = new Date(dateStart.getTime() + JST_OFFSET_MS);
  // UTCメソッドを使用してタイムゾーンに依存しない日付文字列を生成
  return `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jstDate.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 日本時間（JST）で今月の1日の開始時刻をUTCのDateオブジェクトとして取得
 * @returns 日本時間の今月1日の開始時刻（UTC形式）
 */
export function getJSTFirstDayOfMonth(): Date {
  const now = new Date();
  // 現在時刻をJSTに変換して年・月を取得
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  
  // UTCベースでJSTの今月1日の00:00:00を作成（Date.UTCを使用）
  const jstFirstDayUTC = Date.UTC(year, month, 1, 0, 0, 0, 0);
  // JSTオフセットを減算してUTC時刻に戻す
  return new Date(jstFirstDayUTC - JST_OFFSET_MS);
}

/**
 * UTC形式のISO文字列を日本時間（JST）の日付文字列（YYYY-MM-DD）に変換
 * @param utcIsoString UTC形式のISO文字列（例: "2025-11-11T05:10:17.460Z"）
 * @returns 日本時間の日付文字列（例: "2025-11-11"）
 */
export function convertUTCToJSTDateString(utcIsoString: string): string {
  const utcDate = new Date(utcIsoString);
  const jstDate = new Date(utcDate.getTime() + JST_OFFSET_MS);
  // UTCメソッドを使用してタイムゾーンに依存しない日付文字列を生成
  return `${jstDate.getUTCFullYear()}-${String(jstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(jstDate.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 現在時刻を日本時間（JST）のISO文字列として取得
 * @returns JSTのISO文字列（例: "2025-11-21T09:55:01.881+09:00"）
 */
export function getJSTNowISOString(): string {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  
  const year = jstNow.getUTCFullYear();
  const month = String(jstNow.getUTCMonth() + 1).padStart(2, '0');
  const date = String(jstNow.getUTCDate()).padStart(2, '0');
  const hours = String(jstNow.getUTCHours()).padStart(2, '0');
  const minutes = String(jstNow.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jstNow.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(jstNow.getUTCMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${date}T${hours}:${minutes}:${seconds}.${milliseconds}+09:00`;
}

