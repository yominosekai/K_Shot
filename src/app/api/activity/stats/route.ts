// 統計データ取得API（ローカルDBと共有DBから統計を取得）

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/shared/lib/database/db';
import { getActivityAggregatorDb } from '@/shared/lib/activity-aggregator/local-db';
import { getJSTDateString, convertUTCToJSTDateString } from '@/shared/lib/utils/timezone';
import { error, info } from '@/shared/lib/logger';
import type { ActivityStatsResponse, UserActivityStats, OverallStats, UserDistribution, Period } from '@/app/overview/types';

const MODULE_NAME = 'api/activity/stats';

/**
 * 全体統計を取得
 */
function getOverallStats(): OverallStats {
  const sharedDb = getDatabase();
  const localDb = getActivityAggregatorDb();

  // 総ログイン数（ローカルDBから）
  const totalLoginsStmt = localDb.prepare(`
    SELECT COUNT(*) as count FROM login_events
  `);
  const totalLogins = (totalLoginsStmt.get() as { count: number })?.count || 0;

  // 総閲覧数（共有DBから）
  const totalViewsStmt = sharedDb.prepare(`
    SELECT COUNT(*) as count FROM material_views
  `);
  const totalViews = (totalViewsStmt.get() as { count: number })?.count || 0;

  // 総ユーザー数
  const totalUsersStmt = sharedDb.prepare(`
    SELECT COUNT(*) as count FROM users WHERE is_active = 1
  `);
  const totalUsers = (totalUsersStmt.get() as { count: number })?.count || 0;

  // 平均閲覧数
  const avgViews = totalUsers > 0 ? Math.floor(totalViews / totalUsers) : 0;

  // 活発ユーザー数（5日以上活動、ログイン日数ベース）
  const activeUsersStmt = localDb.prepare(`
    SELECT user_sid, COUNT(DISTINCT date) as days
    FROM login_events
    GROUP BY user_sid
    HAVING COUNT(DISTINCT date) >= 5
  `);
  const activeUsersRows = activeUsersStmt.all() as Array<{ user_sid: string; days: number }>;
  const activeUsers = activeUsersRows.length;

  // 総資料数
  const totalMaterialsStmt = sharedDb.prepare(`
    SELECT COUNT(*) as count FROM materials WHERE is_published = 1
  `);
  const totalMaterials = (totalMaterialsStmt.get() as { count: number })?.count || 0;

  return {
    totalLogins,
    totalViews,
    avgViews,
    activeUsers,
    totalMaterials,
    totalUsers,
  };
}

/**
 * ユーザー別活動ランキングを取得（最適化版：N+1問題を解決）
 */
function getUserRankings(): UserActivityStats[] {
  const sharedDb = getDatabase();
  const localDb = getActivityAggregatorDb();

  // ユーザー一覧を取得
  const usersStmt = sharedDb.prepare(`
    SELECT sid, display_name FROM users WHERE is_active = 1
  `);
  const users = usersStmt.all() as Array<{ sid: string; display_name: string }>;

  if (users.length === 0) {
    return [];
  }

  // ユーザーSIDのリストを作成
  const userSids = users.map(u => u.sid);
  const userSidSet = new Set(userSids);

  // 1. 全ユーザーの閲覧数を一括取得（共有DB）
  const viewCountsStmt = sharedDb.prepare(`
    SELECT user_sid, COUNT(*) as count
    FROM material_views
    WHERE user_sid IN (${userSids.map(() => '?').join(',')})
    GROUP BY user_sid
  `);
  const viewCountsRows = viewCountsStmt.all(...userSids) as Array<{ user_sid: string; count: number }>;
  const viewCountsMap = new Map<string, number>();
  viewCountsRows.forEach(row => {
    viewCountsMap.set(row.user_sid, row.count);
  });

  // 2. 全ユーザーのユニーク資料数を一括取得（共有DB）
  const uniqueMaterialsStmt = sharedDb.prepare(`
    SELECT user_sid, COUNT(DISTINCT material_id) as count
    FROM material_views
    WHERE user_sid IN (${userSids.map(() => '?').join(',')})
    GROUP BY user_sid
  `);
  const uniqueMaterialsRows = uniqueMaterialsStmt.all(...userSids) as Array<{ user_sid: string; count: number }>;
  const uniqueMaterialsMap = new Map<string, number>();
  uniqueMaterialsRows.forEach(row => {
    uniqueMaterialsMap.set(row.user_sid, row.count);
  });

  // 3. 全ユーザーのアップロード資料数を一括取得（共有DB）
  const uploadedMaterialsStmt = sharedDb.prepare(`
    SELECT created_by as user_sid, COUNT(*) as count
    FROM materials
    WHERE created_by IN (${userSids.map(() => '?').join(',')}) AND is_published = 1
    GROUP BY created_by
  `);
  const uploadedMaterialsRows = uploadedMaterialsStmt.all(...userSids) as Array<{ user_sid: string; count: number }>;
  const uploadedMaterialsMap = new Map<string, number>();
  uploadedMaterialsRows.forEach(row => {
    uploadedMaterialsMap.set(row.user_sid, row.count);
  });

  // 4. 全ユーザーの日別データを一括取得（過去30日、共有DB）
  const startDate = getJSTDateString(30);
  const dailyDataStmt = sharedDb.prepare(`
    SELECT user_sid, view_date as date, COUNT(*) as count
    FROM material_views
    WHERE user_sid IN (${userSids.map(() => '?').join(',')}) AND view_date >= ?
    GROUP BY user_sid, view_date
    ORDER BY user_sid, view_date ASC
  `);
  const dailyDataRows = dailyDataStmt.all(...userSids, startDate) as Array<{ user_sid: string; date: string; count: number }>;
  const dailyDataMap = new Map<string, Array<{ date: string; count: number }>>();
  dailyDataRows.forEach(row => {
    if (!dailyDataMap.has(row.user_sid)) {
      dailyDataMap.set(row.user_sid, []);
    }
    dailyDataMap.get(row.user_sid)!.push({
      date: row.date,
      count: row.count,
    });
  });

  // 5. 全ユーザーの資料別閲覧数を一括取得（共有DB）
  // 各ユーザーごとに上位10件を取得するため、サブクエリを使用
  const materialDataStmt = sharedDb.prepare(`
    SELECT 
      mv.user_sid,
      mv.material_id,
      m.title,
      COUNT(*) as count
    FROM material_views mv
    LEFT JOIN materials m ON mv.material_id = m.id
    WHERE mv.user_sid IN (${userSids.map(() => '?').join(',')})
    GROUP BY mv.user_sid, mv.material_id, m.title
    ORDER BY mv.user_sid, count DESC
  `);
  const materialDataRows = materialDataStmt.all(...userSids) as Array<{
    user_sid: string;
    material_id: string;
    title: string | null;
    count: number;
  }>;
  const materialDataMap = new Map<string, Array<{ materialId: string; title: string; count: number }>>();
  materialDataRows.forEach(row => {
    if (!materialDataMap.has(row.user_sid)) {
      materialDataMap.set(row.user_sid, []);
    }
    const userMaterials = materialDataMap.get(row.user_sid)!;
    // 各ユーザーごとに上位10件まで
    if (userMaterials.length < 10) {
      userMaterials.push({
        materialId: row.material_id,
        title: row.title || 'タイトル不明',
        count: row.count,
      });
    }
  });

  // 6. ローカルDBからログイン回数とアクティブ日数を取得（個別クエリ、ローカルDBなので許容範囲内）
  const loginCountsMap = new Map<string, number>();
  const activeDaysMap = new Map<string, number>();

  for (const userSid of userSids) {
    // ログイン回数（ローカルDBから）
    const loginCountStmt = localDb.prepare(`
      SELECT COUNT(*) as count FROM login_events WHERE user_sid = ?
    `);
    const loginCount = (loginCountStmt.get(userSid) as { count: number })?.count || 0;
    loginCountsMap.set(userSid, loginCount);

    // アクティブ日数（ローカルDBから）
    const activeDaysStmt = localDb.prepare(`
      SELECT COUNT(DISTINCT date) as count FROM login_events WHERE user_sid = ?
    `);
    const activeDays = (activeDaysStmt.get(userSid) as { count: number })?.count || 0;
    activeDaysMap.set(userSid, activeDays);
  }

  // ランキングデータを構築
  const rankings: UserActivityStats[] = users.map(user => {
    const userSid = user.sid;
    return {
      userSid,
      displayName: user.display_name,
      loginCount: loginCountsMap.get(userSid) || 0,
      viewCount: viewCountsMap.get(userSid) || 0,
      uniqueMaterials: uniqueMaterialsMap.get(userSid) || 0,
      uploadedMaterials: uploadedMaterialsMap.get(userSid) || 0,
      activeDays: activeDaysMap.get(userSid) || 0,
      dailyData: dailyDataMap.get(userSid) || [],
      activityData: [], // ランキング表示では不要なため空配列
      materialData: materialDataMap.get(userSid) || [],
    };
  });

  // 閲覧数でソート
  return rankings.sort((a, b) => b.viewCount - a.viewCount);
}

/**
 * ユーザー分布を取得
 */
function getUserDistribution(): UserDistribution[] {
  const sharedDb = getDatabase();

  // ユーザー別の閲覧数とユニーク資料数を取得
  const distributionStmt = sharedDb.prepare(`
    SELECT 
      mv.user_sid,
      u.display_name,
      COUNT(*) as view_count,
      COUNT(DISTINCT mv.material_id) as unique_materials
    FROM material_views mv
    LEFT JOIN users u ON mv.user_sid = u.sid
    WHERE u.is_active = 1
    GROUP BY mv.user_sid, u.display_name
  `);
  const distributionRows = distributionStmt.all() as Array<{
    user_sid: string;
    display_name: string;
    view_count: number;
    unique_materials: number;
  }>;

  // 活動レベルを計算（閲覧数とユニーク資料数の平均で判定）
  const maxViews = Math.max(...distributionRows.map(r => r.view_count), 1);
  const maxUnique = Math.max(...distributionRows.map(r => r.unique_materials), 1);

  return distributionRows.map(row => {
    const viewRatio = row.view_count / maxViews;
    const uniqueRatio = row.unique_materials / maxUnique;
    const activityScore = (viewRatio + uniqueRatio) / 2;

    let activityLevel: 'high' | 'medium' | 'low';
    if (activityScore > 0.7) {
      activityLevel = 'high';
    } else if (activityScore > 0.4) {
      activityLevel = 'medium';
    } else {
      activityLevel = 'low';
    }

    return {
      userSid: row.user_sid,
      displayName: row.display_name,
      viewCount: row.view_count,
      uniqueMaterials: row.unique_materials,
      activityLevel,
    };
  });
}

/**
 * 全体統計を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'overall' | 'individual'
    const userSid = searchParams.get('userSid');
    const period = searchParams.get('period') as Period || '1month';
    const startDate = searchParams.get('startDate'); // カスタム範囲の開始日
    const endDate = searchParams.get('endDate');     // カスタム範囲の終了日
    const granularityParam = searchParams.get('granularity') as 'daily' | 'weekly' | 'monthly' | null;

    if (type === 'individual' && userSid) {
      // 個別統計を取得
      const sharedDb = getDatabase();
      const localDb = getActivityAggregatorDb();

      // 期間を計算（カスタム範囲の場合は指定された日付を使用）
      let filterStartDate: string;
      if (period === 'custom' && startDate && endDate) {
        filterStartDate = startDate; // カスタム範囲の開始日
      } else {
        const days = period === '1month' ? 30 : period === '3months' ? 90 : period === '6months' ? 180 : 365;
        filterStartDate = getJSTDateString(days);
      }

      // ユーザー情報を取得
      const userStmt = sharedDb.prepare(`
        SELECT sid, display_name FROM users WHERE sid = ?
      `);
      const user = userStmt.get(userSid) as { sid: string; display_name: string } | undefined;

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // 終了日の設定（カスタム範囲の場合は指定された日付、それ以外は今日）
      const filterEndDate = period === 'custom' && endDate ? endDate : getJSTDateString(0);

      // 粒度を決定（期間に応じて自動決定、またはパラメータで指定）
      let granularity: 'daily' | 'weekly' | 'monthly';
      if (granularityParam) {
        granularity = granularityParam;
      } else {
        // 期間から粒度を自動決定
        const startDateObj = new Date(filterStartDate);
        const endDateObj = new Date(filterEndDate);
        const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 30) {
          granularity = 'daily';
        } else if (daysDiff <= 90) {
          granularity = 'weekly';
        } else {
          granularity = 'monthly';
        }
      }

      // ログイン回数
      const loginCountStmt = localDb.prepare(`
        SELECT COUNT(*) as count FROM login_events WHERE user_sid = ? AND date >= ? AND date <= ?
      `);
      const loginCount = (loginCountStmt.get(userSid, filterStartDate, filterEndDate) as { count: number })?.count || 0;

      // 閲覧数
      const viewCountStmt = sharedDb.prepare(`
        SELECT COUNT(*) as count FROM material_views WHERE user_sid = ? AND view_date >= ? AND view_date <= ?
      `);
      const viewCount = (viewCountStmt.get(userSid, filterStartDate, filterEndDate) as { count: number })?.count || 0;

      // ユニーク資料数
      const uniqueMaterialsStmt = sharedDb.prepare(`
        SELECT COUNT(DISTINCT material_id) as count FROM material_views WHERE user_sid = ? AND view_date >= ? AND view_date <= ?
      `);
      const uniqueMaterials = (uniqueMaterialsStmt.get(userSid, filterStartDate, filterEndDate) as { count: number })?.count || 0;

      // アップロード資料数（期間フィルタ付き）
      const uploadedMaterialsStmt = sharedDb.prepare(`
        SELECT COUNT(*) as count FROM materials WHERE created_by = ? AND is_published = 1 AND created_date >= ? AND created_date <= ?
      `);
      const uploadedMaterials = (uploadedMaterialsStmt.get(userSid, filterStartDate, filterEndDate) as { count: number })?.count || 0;

      // アクティブ日数（ログイン日数と同じロジック）
      const activeDaysStmt = localDb.prepare(`
        SELECT COUNT(DISTINCT date) as count FROM login_events WHERE user_sid = ? AND date >= ? AND date <= ?
      `);
      const activeDays = (activeDaysStmt.get(userSid, filterStartDate, filterEndDate) as { count: number })?.count || 0;

      // アクティビティデータ（粒度に応じて集計）
      // 閲覧数とアップロード数の両方を取得
      let activityData: Array<{ date: string; viewCount: number; uploadCount: number }> = [];
      
      if (granularity === 'daily') {
        // 日次データ - 閲覧数
        const dailyViewDataStmt = sharedDb.prepare(`
          SELECT view_date as date, COUNT(*) as count
          FROM material_views
          WHERE user_sid = ? AND view_date >= ? AND view_date <= ?
          GROUP BY view_date
          ORDER BY view_date ASC
        `);
        const dailyViewRows = dailyViewDataStmt.all(userSid, filterStartDate, filterEndDate) as Array<{ date: string; count: number }>;
        
        // 日次データ - アップロード数（created_dateをJSTに変換して集計）
        const uploadDataStmt = sharedDb.prepare(`
          SELECT created_date
          FROM materials
          WHERE created_by = ? AND is_published = 1 AND created_date >= ? AND created_date <= ?
        `);
        const startDateUTC = new Date(filterStartDate + 'T00:00:00+09:00').toISOString();
        const endDateUTC = new Date(filterEndDate + 'T23:59:59+09:00').toISOString();
        const uploadRows = uploadDataStmt.all(userSid, startDateUTC, endDateUTC) as Array<{ created_date: string }>;
        
        // アップロード数を日付ごとに集計
        const uploadMap = new Map<string, number>();
        uploadRows.forEach((row) => {
          const jstDate = convertUTCToJSTDateString(row.created_date);
          if (jstDate >= filterStartDate && jstDate <= filterEndDate) {
            uploadMap.set(jstDate, (uploadMap.get(jstDate) || 0) + 1);
          }
        });
        
        // 閲覧数とアップロード数をマージ
        const viewMap = new Map<string, number>();
        dailyViewRows.forEach((row) => {
          viewMap.set(row.date, row.count);
        });
        
        // 全期間の日付を生成してマージ
        const allDates = new Set<string>();
        dailyViewRows.forEach((row) => allDates.add(row.date));
        uploadMap.forEach((_, date) => allDates.add(date));
        
        // 開始日から終了日までの全期間を生成
        const startDateObj = new Date(filterStartDate + 'T00:00:00+09:00');
        const endDateObj = new Date(filterEndDate + 'T23:59:59+09:00');
        let currentDate = new Date(startDateObj);
        while (currentDate <= endDateObj) {
          const dateStr = currentDate.toISOString().split('T')[0];
          allDates.add(dateStr);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        activityData = Array.from(allDates)
          .sort()
          .map(date => ({
            date,
            viewCount: viewMap.get(date) || 0,
            uploadCount: uploadMap.get(date) || 0,
          }));
      } else if (granularity === 'weekly') {
        // 週次データ（7日ごとに集計）
        const startDateObj = new Date(filterStartDate + 'T00:00:00+09:00');
        const endDateObj = new Date(filterEndDate + 'T23:59:59+09:00');
        const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        const weeks = Math.ceil(daysDiff / 7);
        
        for (let i = 0; i < weeks; i++) {
          const weekStart = new Date(startDateObj);
          weekStart.setDate(weekStart.getDate() + i * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          // JST形式の日付文字列に変換
          const weekStartStr = weekStart.toISOString().split('T')[0];
          const weekEndStr = weekEnd.toISOString().split('T')[0];
          const weekStartUTC = weekStart.toISOString();
          const weekEndUTC = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
          
          // 閲覧数
          const weekViewStmt = sharedDb.prepare(`
            SELECT COUNT(*) as count
            FROM material_views
            WHERE user_sid = ? AND view_date >= ? AND view_date <= ?
          `);
          const weekViewData = weekViewStmt.get(userSid, weekStartStr, weekEndStr) as { count: number } | undefined;
          
          // アップロード数
          const weekUploadStmt = sharedDb.prepare(`
            SELECT created_date
            FROM materials
            WHERE created_by = ? AND is_published = 1 AND created_date >= ? AND created_date < ?
          `);
          const weekUploadRows = weekUploadStmt.all(userSid, weekStartUTC, weekEndUTC) as Array<{ created_date: string }>;
          
          // アップロード数を週の範囲内で集計
          let uploadCount = 0;
          weekUploadRows.forEach((row) => {
            const jstDate = convertUTCToJSTDateString(row.created_date);
            if (jstDate >= weekStartStr && jstDate <= weekEndStr) {
              uploadCount++;
            }
          });
          
          activityData.push({
            date: weekStartStr,
            viewCount: weekViewData?.count || 0,
            uploadCount,
          });
        }
      } else {
        // 月次データ
        const startDateObj = new Date(filterStartDate + 'T00:00:00+09:00');
        const endDateObj = new Date(filterEndDate + 'T23:59:59+09:00');
        
        let currentDate = new Date(startDateObj);
        while (currentDate <= endDateObj) {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          
          // 月の開始日と終了日
          const monthStart = new Date(year, month, 1);
          const monthEnd = new Date(year, month + 1, 0);
          
          // 期間の範囲内に収める
          const actualStart = monthStart > startDateObj ? monthStart : startDateObj;
          const actualEnd = monthEnd < endDateObj ? monthEnd : endDateObj;
          
          const monthStartStr = actualStart.toISOString().split('T')[0];
          const monthEndStr = actualEnd.toISOString().split('T')[0];
          const monthStartUTC = actualStart.toISOString();
          const monthEndUTC = new Date(actualEnd.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
          
          // 閲覧数
          const monthViewStmt = sharedDb.prepare(`
            SELECT COUNT(*) as count
            FROM material_views
            WHERE user_sid = ? AND view_date >= ? AND view_date <= ?
          `);
          const monthViewData = monthViewStmt.get(userSid, monthStartStr, monthEndStr) as { count: number } | undefined;
          
          // アップロード数
          const monthUploadStmt = sharedDb.prepare(`
            SELECT created_date
            FROM materials
            WHERE created_by = ? AND is_published = 1 AND created_date >= ? AND created_date < ?
          `);
          const monthUploadRows = monthUploadStmt.all(userSid, monthStartUTC, monthEndUTC) as Array<{ created_date: string }>;
          
          // アップロード数を月の範囲内で集計
          let uploadCount = 0;
          monthUploadRows.forEach((row) => {
            const jstDate = convertUTCToJSTDateString(row.created_date);
            if (jstDate >= monthStartStr && jstDate <= monthEndStr) {
              uploadCount++;
            }
          });
          
          activityData.push({
            date: monthStartStr,
            viewCount: monthViewData?.count || 0,
            uploadCount,
          });
          
          // 次の月へ
          currentDate = new Date(year, month + 1, 1);
        }
      }
      
      // 後方互換性のためdailyDataも設定（countフィールドを追加）
      const dailyData = granularity === 'daily' ? activityData.map(item => ({
        date: item.date,
        count: item.viewCount, // 閲覧数をcountとして設定
      })) : [];

      // 資料別閲覧数
      const materialDataStmt = sharedDb.prepare(`
        SELECT 
          mv.material_id,
          m.title,
          COUNT(*) as count
        FROM material_views mv
        LEFT JOIN materials m ON mv.material_id = m.id
        WHERE mv.user_sid = ? AND mv.view_date >= ? AND mv.view_date <= ?
        GROUP BY mv.material_id, m.title
        ORDER BY count DESC
        LIMIT 10
      `);
      const materialDataRows = materialDataStmt.all(userSid, filterStartDate, filterEndDate) as Array<{
        material_id: string;
        title: string | null;
        count: number;
      }>;
      const materialData = materialDataRows.map(row => ({
        materialId: row.material_id,
        title: row.title || 'タイトル不明',
        count: row.count,
      }));

      const userStats: UserActivityStats = {
        userSid: user.sid,
        displayName: user.display_name,
        loginCount,
        viewCount,
        uniqueMaterials,
        uploadedMaterials,
        activeDays,
        dailyData,
        activityData,
        materialData,
      };

      return NextResponse.json({
        user: userStats,
        period,
      });
    } else {
      // 全体統計を取得
      const overallStats = getOverallStats();
      const userRankings = getUserRankings();
      const userDistribution = getUserDistribution();

      const response: ActivityStatsResponse = {
        overallStats,
        userRankings,
        userDistribution,
      };

      return NextResponse.json(response);
    }
  } catch (err) {
    error(MODULE_NAME, '統計データ取得エラー:', err);
    return NextResponse.json(
      { error: '統計データの取得に失敗しました', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

