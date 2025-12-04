'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/contexts/UsersContext';
import { BarChart3, Users, Star, TrendingUp, Download, ArrowLeft, User, MessageSquare, Lightbulb } from 'lucide-react';
import { isPilotTestEnabled } from '@/config/pilot-test';
import Toast from '@/components/Toast';
import type { PilotFeedback } from '@/shared/lib/data-access/pilot-feedback';

interface Stats {
  scenes: {
    knowledge_registration: number;
    search_reference: number;
    share_utilization: number;
    operation: number;
  };
  averageScores: {
    usability: number;
    business_fit: number;
    performance: number;
    quality: number;
    content_richness: number;
  };
  scoreDistribution: {
    [key: string]: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

type Tab = 'overview' | 'scenes' | 'evaluations' | 'individual' | 'comments' | 'suggestions';

const SCENE_LABELS: Record<string, string> = {
  knowledge_registration: '資料の登録・編集',
  search_reference: '検索・閲覧',
  share_utilization: '共有・コミュニケーション',
  operation: '管理・運用',
};

const EVALUATION_LABELS: Record<string, string> = {
  usability: '使いやすさ (UI/UX)',
  business_fit: '業務適合度',
  performance: 'レスポンス / パフォーマンス',
  quality: '品質 / 信頼性',
  content_richness: '機能の充実度',
};

export default function PilotFeedbackStatsPage() {
  const { user } = useAuth();
  const { users, getUsers } = useUsers();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedbacks, setFeedbacks] = useState<PilotFeedback[]>([]);
  const [currentTab, setCurrentTab] = useState<Tab>('overview');
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // ユーザー情報を取得
  useEffect(() => {
    if (feedbacks.length > 0) {
      const userIds = feedbacks.map((f) => f.user_id);
      getUsers(userIds).catch((err) => {
        console.error('ユーザー情報取得エラー:', err);
      });
    }
  }, [feedbacks, getUsers]);

  // ユーザーIDから表示名を取得する関数
  const getUserDisplayName = useMemo(() => {
    return (userId: string): string => {
      const userData = users.get(userId);
      if (userData) {
        return userData.display_name || userData.username || userId;
      }
      return userId;
    };
  }, [users]);

  useEffect(() => {
    // 機能が有効かチェック
    if (!isPilotTestEnabled()) {
      router.push('/admin');
      return;
    }

    // 管理者権限チェック
    if (user?.role !== 'admin') {
      router.push('/admin');
      return;
    }

    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pilot-feedback/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
        setFeedbacks(data.feedbacks || []);
      } else {
        setToastMessage(data.error || '統計情報の取得に失敗しました');
        setIsToastVisible(true);
      }
    } catch (err) {
      console.error('統計情報取得エラー:', err);
      setToastMessage('統計情報の取得に失敗しました');
      setIsToastVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (feedbacks.length === 0) {
      setToastMessage('エクスポートするデータがありません');
      setIsToastVisible(true);
      return;
    }

    // CSVヘッダー
    const headers = [
      'ID',
      'ユーザーID',
      '作成日時',
      '利用シーン',
      '使いやすさスコア',
      '使いやすさコメント',
      '業務適合度スコア',
      '業務適合度コメント',
      'パフォーマンススコア',
      'パフォーマンスコメント',
      '品質スコア',
      '品質コメント',
      '内容充実度スコア',
      '内容充実度コメント',
      '改善アイデア',
      'その他コメント',
    ];

    // CSVデータ
    const rows = feedbacks.map((feedback) => {
      const scenes = feedback.scenes.map((s) => SCENE_LABELS[s] || s).join('; ');
      return [
        feedback.id,
        feedback.user_id,
        feedback.created_date,
        scenes,
        feedback.evaluations.usability?.score || '',
        (feedback.evaluations.usability?.comment || '').replace(/\n/g, ' '),
        feedback.evaluations.business_fit?.score || '',
        (feedback.evaluations.business_fit?.comment || '').replace(/\n/g, ' '),
        feedback.evaluations.performance?.score || '',
        (feedback.evaluations.performance?.comment || '').replace(/\n/g, ' '),
        feedback.evaluations.quality?.score || '',
        (feedback.evaluations.quality?.comment || '').replace(/\n/g, ' '),
        feedback.evaluations.content_richness?.score || '',
        (feedback.evaluations.content_richness?.comment || '').replace(/\n/g, ' '),
        (feedback.improvement_ideas || '').replace(/\n/g, ' '),
        (feedback.additional_comments || '').replace(/\n/g, ' '),
      ];
    });

    // CSV文字列を生成
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // BOMを追加してExcelで正しく開けるようにする
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pilot_feedback_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>管理者画面に戻る</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <BarChart3 className="w-6 h-6 mr-2" />
                パイロットテストフィードバック統計
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                回答数: {feedbacks.length}件
              </p>
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              <span>CSVエクスポート</span>
            </button>
          </div>
        </div>

        {/* タブ */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview' as Tab, label: '概要' },
              { id: 'scenes' as Tab, label: '利用シーン' },
              { id: 'evaluations' as Tab, label: '評価項目' },
              { id: 'individual' as Tab, label: '個別評価' },
              { id: 'comments' as Tab, label: '評価コメント' },
              { id: 'suggestions' as Tab, label: 'ご意見・要望' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* 概要タブ */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">回答数</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {feedbacks.length}
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">平均スコア</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Object.values(stats.averageScores).length > 0
                      ? (
                          Object.values(stats.averageScores).reduce((a, b) => a + b, 0) /
                          Object.values(stats.averageScores).length
                        ).toFixed(2)
                      : '0.00'}
                  </div>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">満足度（4-5点）</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {(() => {
                      const highScores = Object.values(stats.scoreDistribution).reduce(
                        (sum, dist) => sum + (dist[4] || 0) + (dist[5] || 0),
                        0
                      );
                      const totalScores = Object.values(stats.scoreDistribution).reduce(
                        (sum, dist) => sum + Object.values(dist).reduce((a, b) => a + b, 0),
                        0
                      );
                      return totalScores > 0
                        ? Math.round((highScores / totalScores) * 100)
                        : 0;
                    })()}
                    %
                  </div>
                </div>
              </div>

              {/* 評価項目別平均スコア */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  評価項目別平均スコア
                </h3>
                <div className="space-y-3">
                  {Object.entries(stats.averageScores).map(([key, score]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {EVALUATION_LABELS[key] || key}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {score.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(score / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 利用シーンタブ */}
          {currentTab === 'scenes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                利用シーン別回答数
              </h3>
              {Object.entries(stats.scenes).map(([key, count]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {SCENE_LABELS[key] || key}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {count}件
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full"
                      style={{
                        width: `${
                          feedbacks.length > 0 ? (count / feedbacks.length) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 評価項目タブ */}
          {currentTab === 'evaluations' && (
            <div className="space-y-6">
              {Object.entries(stats.scoreDistribution).map(([key, distribution]) => (
                <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {EVALUATION_LABELS[key] || key}
                  </h3>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((score) => {
                      const count = distribution[score as 1 | 2 | 3 | 4 | 5] || 0;
                      const total = Object.values(distribution).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      
                      return (
                        <div key={score} className="flex items-center space-x-4">
                          <div className="w-12 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {score}点
                          </div>
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                            <div
                              className="bg-blue-600 h-4 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right">
                            {count}件 ({percentage.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 個別評価タブ */}
          {currentTab === 'individual' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                各ユーザーごとの評価
              </h3>
              {feedbacks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  フィードバックがありません
                </p>
              ) : (
                <div className="space-y-6">
                  {feedbacks.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {getUserDisplayName(feedback.user_id)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            最終更新: {new Date(feedback.updated_date).toLocaleString('ja-JP')}
                          </div>
                        </div>
                      </div>
                      
                      {/* 利用シーン */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          利用シーン:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {feedback.scenes.map((scene) => (
                            <span
                              key={scene}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md text-sm"
                            >
                              {SCENE_LABELS[scene] || scene}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 評価スコア */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          評価スコア:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(feedback.evaluations).map(([key, evaluation]) => (
                            <div
                              key={key}
                              className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {EVALUATION_LABELS[key] || key}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-4 h-4 ${
                                        s <= evaluation.score
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300 dark:text-gray-600'
                                      }`}
                                    />
                                  ))}
                                  <span className="ml-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {evaluation.score}点
                                  </span>
                                </div>
                              </div>
                              {evaluation.comment && (
                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                                  {evaluation.comment}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 評価コメントタブ */}
          {currentTab === 'comments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                評価項目別コメント一覧
              </h3>
              {Object.entries(EVALUATION_LABELS).map(([key, label]) => {
                const comments = feedbacks
                  .map((f) => {
                    const evaluation = f.evaluations[key as keyof typeof f.evaluations];
                    if (evaluation?.comment && evaluation.comment.trim()) {
                      return {
                        userId: f.user_id,
                        score: evaluation.score,
                        comment: evaluation.comment,
                        updatedDate: f.updated_date,
                      };
                    }
                    return null;
                  })
                  .filter((c): c is NonNullable<typeof c> => c !== null);

                if (comments.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={key}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-5"
                  >
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {label}
                    </h4>
                    <div className="space-y-4">
                      {comments.map((comment, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-l-4 border-blue-500"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {getUserDisplayName(comment.userId)}
                              </span>
                              <div className="flex items-center space-x-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${
                                      s <= comment.score
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                  />
                                ))}
                                <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">
                                  {comment.score}点
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(comment.updatedDate).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {comment.comment}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.entries(EVALUATION_LABELS).every(([key]) => {
                const hasComments = feedbacks.some((f) => {
                  const evaluation = f.evaluations[key as keyof typeof f.evaluations];
                  return evaluation?.comment && evaluation.comment.trim();
                });
                return !hasComments;
              }) && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  コメントがありません
                </p>
              )}
            </div>
          )}

          {/* ご意見・要望タブ */}
          {currentTab === 'suggestions' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                ご意見・要望一覧
              </h3>
              {feedbacks.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  フィードバックがありません
                </p>
              ) : (
                <div className="space-y-6">
                  {/* 改善アイデア */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
                      改善アイデア・要望
                    </h4>
                    <div className="space-y-4">
                      {feedbacks
                        .filter((f) => f.improvement_ideas && f.improvement_ideas.trim())
                        .map((feedback) => (
                          <div
                            key={feedback.id}
                            className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {getUserDisplayName(feedback.user_id)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(feedback.updated_date).toLocaleString('ja-JP')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {feedback.improvement_ideas}
                            </div>
                          </div>
                        ))}
                      {feedbacks.every((f) => !f.improvement_ideas || !f.improvement_ideas.trim()) && (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                          改善アイデアはありません
                        </p>
                      )}
                    </div>
                  </div>

                  {/* その他コメント */}
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                      その他コメント
                    </h4>
                    <div className="space-y-4">
                      {feedbacks
                        .filter((f) => f.additional_comments && f.additional_comments.trim())
                        .map((feedback) => (
                          <div
                            key={feedback.id}
                            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {getUserDisplayName(feedback.user_id)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(feedback.updated_date).toLocaleString('ja-JP')}
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {feedback.additional_comments}
                            </div>
                          </div>
                        ))}
                      {feedbacks.every((f) => !f.additional_comments || !f.additional_comments.trim()) && (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                          その他コメントはありません
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <Toast
        message={toastMessage}
        isVisible={isToastVisible}
        onClose={() => setIsToastVisible(false)}
      />
    </div>
  );
}

