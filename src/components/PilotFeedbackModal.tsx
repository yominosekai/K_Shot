'use client';

import { useState, useEffect } from 'react';
import { X, Save, Star, ChevronRight, ChevronLeft, FileText, Search, MessageSquare, Settings, Zap, Shield, Database, CheckCircle } from 'lucide-react';
import ProgressModal from './ProgressModal';
import { useAuth } from '@/contexts/AuthContext';
import Toast from '@/components/Toast';
import type { 
  PilotFeedbackScene, 
  EvaluationScore, 
  PilotFeedbackEvaluation,
  PilotFeedback 
} from '@/shared/lib/data-access/pilot-feedback';

interface PilotFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

// プロジェクトの実際の機能に合わせた利用シーンの説明
const SCENES: { value: PilotFeedbackScene; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'knowledge_registration',
    label: '資料の登録・編集',
    description: 'ナレッジ（資料）の作成・編集・アップロードを行うシーン。フォルダ選択、カテゴリ・タイプ設定、Markdown編集、添付ファイルのアップロード、下書き保存などの使いやすさを確認。',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    value: 'search_reference',
    label: '検索・閲覧',
    description: '必要な資料を検索して閲覧するシーン。ヘッダー検索の使いやすさ、検索結果の精度、資料詳細の表示、階層フォルダでの資料探し、お気に入り機能の使いやすさを確認。',
    icon: <Search className="w-5 h-5" />,
  },
  {
    value: 'share_utilization',
    label: '共有・コミュニケーション',
    description: '資料へのコメント投稿、通知の受信・確認、他ユーザーへの通知送信を行うシーン。コメント機能の使いやすさ、通知の届き方、リアクション（いいね）の使いやすさを確認。',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    value: 'operation',
    label: '管理・運用',
    description: '管理者として権限管理、データベース確認、ログ閲覧、バックアップ設定などを行うシーン。管理画面の使いやすさ、設定項目の分かりやすさ、統計情報の見やすさを確認。',
    icon: <Settings className="w-5 h-5" />,
  },
];

const EVALUATION_ITEMS: { 
  key: keyof PilotFeedback['evaluations']; 
  label: string; 
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'usability',
    label: '使いやすさ (UI/UX)',
    description: '画面の構成、ボタンの配置、操作フローが直感的かどうか。迷わず操作できるか。',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    key: 'business_fit',
    label: '業務適合度',
    description: '現行の仕事の流れにどれだけフィットするか。無理な手順や不便な点がないか。',
    icon: <Settings className="w-5 h-5" />,
  },
  {
    key: 'performance',
    label: 'レスポンス / パフォーマンス',
    description: '表示速度、検索結果までの時間、ファイルアップロード速度、ネットワークドライブ接続時の体感スピード。',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    key: 'quality',
    label: '品質 / 信頼性',
    description: 'バグやエラーの発生、データの整合性、通知の遅延、同時アクセス時の安定性。',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    key: 'content_richness',
    label: '機能の充実度',
    description: '必要な機能が揃っているか。資料管理、検索、コメント、通知などの機能が十分か。',
    icon: <Database className="w-5 h-5" />,
  },
];

const SCORE_LABELS: Record<EvaluationScore, string> = {
  1: '非常に不満',
  2: 'やや不満',
  3: '普通',
  4: 'やや満足',
  5: '非常に満足',
};

export default function PilotFeedbackModal({ isOpen, onClose }: PilotFeedbackModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('読み込み中...');
  
  // フォームデータ
  const [scenes, setScenes] = useState<PilotFeedbackScene[]>([]);
  const [evaluations, setEvaluations] = useState<Partial<PilotFeedback['evaluations']>>({});
  const [improvementIdeas, setImprovementIdeas] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [existingFeedback, setExistingFeedback] = useState<PilotFeedback | null>(null);

  // 既存のフィードバックを読み込む
  useEffect(() => {
    if (isOpen && user?.id) {
      loadExistingFeedback();
    } else if (!isOpen) {
      // モーダルを閉じた時にリセット
      setCurrentStep(1);
      setScenes([]);
      setEvaluations({});
      setImprovementIdeas('');
      setAdditionalComments('');
      setExistingFeedback(null);
      setCountdown(null);
      setIsLoading(false);
      setLoadingProgress(0);
      setLoadingMessage('読み込み中...');
    }
  }, [isOpen, user?.id]);

  const loadExistingFeedback = async () => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('フィードバックデータを読み込み中...');

    try {
      // 簡易的なプログレスバー（API読み込みの進捗は正確に取得できないため）
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          const newProgress = prev + 10; // 10%ずつ増加
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 100); // 100msごとに更新

      const response = await fetch('/api/pilot-feedback');
      
      clearInterval(progressInterval);
      setLoadingProgress(100);
      setLoadingMessage('読み込み完了');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.feedback) {
          const feedback = data.feedback;
          setExistingFeedback(feedback);
          setScenes(feedback.scenes || []);
          setEvaluations(feedback.evaluations || {});
          setImprovementIdeas(feedback.improvement_ideas || '');
          setAdditionalComments(feedback.additional_comments || '');
        }
      }

      // 少し待ってからモーダルを表示（プログレスバーが100%になるのを見せるため）
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
      }, 300);
    } catch (err) {
      console.error('既存フィードバック読み込みエラー:', err);
      setLoadingMessage('読み込みエラーが発生しました');
      setTimeout(() => {
        setIsLoading(false);
        setLoadingProgress(0);
      }, 1000);
    }
  };

  const handleSceneToggle = (scene: PilotFeedbackScene) => {
    setScenes((prev) =>
      prev.includes(scene) ? prev.filter((s) => s !== scene) : [...prev, scene]
    );
  };

  const handleEvaluationChange = (
    key: keyof PilotFeedback['evaluations'],
    score: EvaluationScore,
    comment?: string
  ) => {
    setEvaluations((prev) => ({
      ...prev,
      [key]: {
        score,
        comment: comment || prev[key]?.comment || '',
      },
    }));
  };

  const handleEvaluationCommentChange = (
    key: keyof PilotFeedback['evaluations'],
    comment: string
  ) => {
    setEvaluations((prev) => ({
      ...prev,
      [key]: {
        score: prev[key]?.score || 3,
        comment,
      },
    }));
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // バリデーション
    if (scenes.length === 0) {
      setToastMessage('少なくとも1つの利用シーンを選択してください');
      setIsToastVisible(true);
      return;
    }

    const allEvaluationsComplete = EVALUATION_ITEMS.every(
      (item) => evaluations[item.key]?.score !== undefined
    );

    if (!allEvaluationsComplete) {
      setToastMessage('すべての評価項目にスコアを入力してください');
      setIsToastVisible(true);
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/pilot-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes,
          evaluations: evaluations as PilotFeedback['evaluations'],
          improvement_ideas: improvementIdeas,
          additional_comments: additionalComments,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setToastMessage('フィードバックを保存しました');
        setIsToastVisible(true);
        await loadExistingFeedback();
        
        // カウントダウンを開始
        setCountdown(3);
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        
        // 3秒後に自動的に閉じる
        setTimeout(() => {
          clearInterval(countdownInterval);
          setCountdown(null);
          onClose();
        }, 3000);
      } else {
        setToastMessage(data.error || 'フィードバックの保存に失敗しました');
        setIsToastVisible(true);
      }
    } catch (err) {
      console.error('フィードバック保存エラー:', err);
      setToastMessage('フィードバックの保存に失敗しました');
      setIsToastVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (scenes.length === 0) {
        setToastMessage('少なくとも1つの利用シーンを選択してください');
        setIsToastVisible(true);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const allEvaluationsComplete = EVALUATION_ITEMS.every(
        (item) => evaluations[item.key]?.score !== undefined
      );
      if (!allEvaluationsComplete) {
        setToastMessage('すべての評価項目にスコアを入力してください');
        setIsToastVisible(true);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  if (!isOpen) return null;

  // 読み込み中はプログレスバーのみ表示
  if (isLoading) {
    return (
      <ProgressModal
        isVisible={isLoading}
        progress={loadingProgress}
        message={loadingMessage}
        title="読込中..."
        zIndex={200}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              パイロットテスト評価
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ご利用いただいた感想をお聞かせください（所要時間: 5-10分）
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 進捗インジケーター */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      currentStep >= step
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step === 1 && '利用シーン'}
                    {step === 2 && '評価項目'}
                    {step === 3 && '自由記述'}
                  </span>
                </div>
                {step < 3 && (
                  <div className="flex-1 h-0.5 mx-4 bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-full transition-all ${
                        currentStep > step ? 'bg-blue-600' : ''
                      }`}
                      style={{ width: currentStep > step ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ステップ1: 利用シーン選択 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                試していただいた機能・シーンを選択してください（複数選択可）
              </p>
              <div className="space-y-3">
                {SCENES.map((scene) => (
                  <label
                    key={scene.value}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      scenes.includes(scene.value)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={scenes.includes(scene.value)}
                      onChange={() => handleSceneToggle(scene.value)}
                      className="mt-1 mr-3 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="text-blue-600 dark:text-blue-400">
                          {scene.icon}
                        </div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {scene.label}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {scene.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ステップ2: 評価項目 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                各項目について5段階で評価してください（必須）
              </p>
              {EVALUATION_ITEMS.map((item) => {
                const evaluation = evaluations[item.key];
                const score = evaluation?.score || 0;
                
                return (
                  <div
                    key={item.key}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30"
                  >
                    <div className="flex items-start mb-3">
                      <div className="text-blue-600 dark:text-blue-400 mr-2">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {item.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    
                    {/* スコア選択 */}
                    <div className="mt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleEvaluationChange(item.key, s as EvaluationScore)}
                            className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 transition-all ${
                              score === s
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            <Star
                              className={`w-6 h-6 ${
                                score >= s ? 'fill-current' : ''
                              }`}
                            />
                          </button>
                        ))}
                        {score > 0 && (
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                            {SCORE_LABELS[score as EvaluationScore]}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* コメント（任意） */}
                    <div className="mt-3">
                      <textarea
                        value={evaluation?.comment || ''}
                        onChange={(e) => handleEvaluationCommentChange(item.key, e.target.value)}
                        placeholder="コメント（任意）"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ステップ3: 自由記述 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  改善アイデア・要望（任意）
                </label>
                <textarea
                  value={improvementIdeas}
                  onChange={(e) => setImprovementIdeas(e.target.value)}
                  placeholder="欲しい追加機能、余分に感じた機能、運用ルール面での提案など"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  その他のコメント（任意）
                </label>
                <textarea
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  placeholder="その他、ご意見・ご感想をお聞かせください"
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {existingFeedback && (
              <span>最終更新: {new Date(existingFeedback.updated_date).toLocaleString('ja-JP')}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrev}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>戻る</span>
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <span>次へ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || countdown !== null}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>保存中...</span>
                  </>
                ) : countdown !== null ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>保存完了。{countdown}秒後に閉じます</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>保存する</span>
                  </>
                )}
              </button>
            )}
          </div>
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
