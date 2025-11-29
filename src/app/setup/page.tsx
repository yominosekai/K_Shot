// 初期設定ページ

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, AlertCircle, CheckCircle, Loader2, Upload, Smartphone } from 'lucide-react';
import { SessionManager } from '@/features/auth/utils/session';
import ConfirmDialog from '@/components/ConfirmDialog';

interface DriveConfig {
  networkPath: string;
  driveLetter: string;
  fullPath: string;
  setupCompleted: boolean;
}

export default function SetupPage() {
  const router = useRouter();
  const [networkPath, setNetworkPath] = useState('');
  const [driveLetter, setDriveLetter] = useState('');
  const [availableDriveLetters, setAvailableDriveLetters] = useState<Array<{ letter: string; hasExistingFolder: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [mounting, setMounting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [folderExists, setFolderExists] = useState<boolean | null>(null);
  const [createFolder, setCreateFolder] = useState(false);
  const [isForceMode, setIsForceMode] = useState(false); // 強制表示モードかどうか
  
  // 証明ファイルインポート関連
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
  // トークン状態モーダル
  const [showTokenWarningModal, setShowTokenWarningModal] = useState(false);
  const [tokenWarningMessage, setTokenWarningMessage] = useState('');

  // 初期データの読み込み
  useEffect(() => {
    const fetchData = async () => {
      try {
        // URLパラメータを確認（強制表示フラグ）
        const searchParams = new URLSearchParams(window.location.search);
        const force = searchParams.get('force') === 'true';
        setIsForceMode(force);

        const response = await fetch('/api/setup/check');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setAvailableDriveLetters(data.availableDriveLetters || []);
            
            // デバイストークンが存在しない、またはDBに存在しない場合は、設定が完了していても/setupに留まる
            const hasValidToken = data.tokenStatus?.exists && data.tokenStatus?.validInDb;
            
            // 既に設定が完了している場合、かつ強制表示フラグがなく、かつ有効なトークンがある場合のみホームにリダイレクト
            if (data.isSetupCompleted && data.config && !force && hasValidToken) {
              router.push('/');
              return;
            }
            
            // 既存の設定がある場合は表示
            if (data.config) {
              setNetworkPath(data.config.networkPath || '');
              setDriveLetter(data.config.driveLetter || '');
            }
            
            // 画面の読み込みが完了してから、トークンファイルが存在するがDBに存在しない場合、モーダルを表示
            // または、端末で初期設定が完了しているが、トークンファイルがない場合もモーダルを表示
            if (data.tokenStatus?.exists && !data.tokenStatus?.validInDb) {
              // トークンファイルが見つかったが、DBに登録されていない場合
              setTokenWarningMessage('トークンファイルが見つかりましたが、データベースに登録されていません。管理者からトークンファイルを再発行してもらう必要があります。');
              setTimeout(() => {
                setShowTokenWarningModal(true);
              }, 300);
            } else if (data.deviceSetupCompleted && !data.tokenStatus?.exists) {
              // 端末で初期設定が完了しているが、トークンファイルがない場合
              setTokenWarningMessage('トークンファイルが破損または消失している可能性があります。管理者からトークンファイルを再発行してもらう必要があります。');
              setTimeout(() => {
                setShowTokenWarningModal(true);
              }, 300);
            } else if (!data.deviceSetupCompleted && data.tokenStatus?.exists && data.tokenStatus?.validInDb) {
              // トークンは有効だが端末フラグが未設定
              setTokenWarningMessage('この端末には有効なトークンが保存されています。初期設定を完了すると通常どおり利用できます。');
              setTimeout(() => {
                setShowTokenWarningModal(true);
              }, 300);
            }
          }
        }
      } catch (err) {
        console.error('設定確認エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // マウント処理
  const handleMount = async () => {
    if (!networkPath || !driveLetter) {
      setError('ネットワークパスとドライブレターを入力してください');
      return;
    }

    setMounting(true);
    setError(null);
    setSuccess(null);
    setFolderExists(null);

    try {
      const response = await fetch('/api/setup/mount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkPath, driveLetter }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(data.message || 'マウントが完了しました');
        setFolderExists(data.folderExists !== undefined ? data.folderExists : null);
        if (data.alreadyMounted) {
          // 既にマウントされている場合
          setFolderExists(data.folderExists !== undefined ? data.folderExists : null);
        }
        if (data.folderExists === false) {
          setCreateFolder(true);
        }
      } else {
        setError(data.error || 'マウントに失敗しました');
      }
    } catch (err) {
      console.error('マウントエラー:', err);
      setError('マウント処理中にエラーが発生しました');
    } finally {
      setMounting(false);
    }
  };

  const clearClientCaches = () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem('folders_cache');
      localStorage.removeItem('folders_cache_timestamp');
      localStorage.removeItem('categories_cache');
      localStorage.removeItem('categories_cache_timestamp');
      localStorage.removeItem('users_cache');
      localStorage.removeItem('materials_last_fetch_time');
      localStorage.removeItem('materials_last_filter_key');
    } catch (err) {
      console.warn('[Setup] ローカルキャッシュのクリアに失敗しました', err);
    }

    try {
      const sessionManager = SessionManager.getInstance();
      sessionManager.clearSession();
    } catch (err) {
      console.warn('[Setup] セッションのクリアに失敗しました', err);
    }
  };

  // 証明ファイルインポート処理
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError('JSONファイルを選択してください');
      return;
    }

    try {
      setImporting(true);
      setImportError(null);
      setImportSuccess(false);

      const text = await file.text();
      const deviceTokenFile = JSON.parse(text);

      // 必須フィールドの検証
      const requiredFields = ['schema_version', 'token', 'signature', 'user_id', 'issued_at'];
      for (const field of requiredFields) {
        if (!deviceTokenFile[field]) {
          throw new Error(`必須フィールドが不足しています: ${field}`);
        }
      }

      const response = await fetch('/api/users/device-tokens/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_token_file: deviceTokenFile }),
      });

      const data = await response.json();

      if (data.success) {
        setImportSuccess(true);
        // ファイル入力をリセット
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setImportError(data.error || '証明ファイルのインポートに失敗しました');
      }
    } catch (err) {
      console.error('証明ファイルインポートエラー:', err);
      setImportError(
        err instanceof Error
          ? err.message
          : '証明ファイルの読み込みに失敗しました'
      );
    } finally {
      setImporting(false);
    }
  };

  // 設定保存処理
  const handleSave = async () => {
    if (!networkPath || !driveLetter) {
      setError('ネットワークパスとドライブレターを入力してください');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          networkPath,
          driveLetter,
          createFolder: folderExists === false && createFolder,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        clearClientCaches();
        if (typeof window !== 'undefined') {
          localStorage.setItem('setup_completed', 'true');
        }
        setSuccess('設定が完了しました。ページをリロードします...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setError(data.error || '設定の保存に失敗しました');
      }
    } catch (err) {
      console.error('保存エラー:', err);
      setError('設定の保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Settings className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                初期設定
              </h1>
            </div>
            {isForceMode && (
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            ネットワークドライブの設定を行います。{isForceMode ? '設定を変更できます。' : '初回起動時のみ表示されます。'}
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 成功メッセージ */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* ネットワークパス入力 */}
          <div>
            <label htmlFor="networkPath" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ネットワークパス（UNCパス）
            </label>
            <input
              type="text"
              id="networkPath"
              value={networkPath}
              onChange={(e) => setNetworkPath(e.target.value)}
              placeholder="\\\\server-name\\share\\"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              例: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">\\\\server-name\\share\\</code>
            </p>
          </div>

          {/* ドライブレター選択 */}
          <div>
            <label htmlFor="driveLetter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ドライブレター
            </label>
            <select
              id="driveLetter"
              value={driveLetter}
              onChange={(e) => {
                setDriveLetter(e.target.value);
                // 既存フォルダがあるドライブを選択した場合、folderExistsをtrueに設定
                const selected = availableDriveLetters.find(item => item.letter === e.target.value);
                if (selected?.hasExistingFolder) {
                  setFolderExists(true);
                  setCreateFolder(false);
                } else {
                  setFolderExists(null);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">選択してください</option>
              {availableDriveLetters.map((item) => (
                <option key={item.letter} value={item.letter}>
                  {item.letter}: {item.hasExistingFolder ? '(既存フォルダあり)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              利用可能なドライブレターから選択してください。既存フォルダがあるドライブも選択できます。
            </p>
          </div>

          {/* フォルダ作成オプション */}
          {folderExists === false && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <code className="font-mono">{driveLetter}:\\k_shot</code> フォルダが存在しません。
                </p>
              </div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createFolder}
                  onChange={(e) => setCreateFolder(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  フォルダを自動作成する
                </span>
              </label>
            </div>
          )}

          {/* ボタン */}
          <div className="flex space-x-3">
            <button
              onClick={handleMount}
              disabled={mounting || !networkPath || !driveLetter}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {mounting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>マウント中...</span>
                </>
              ) : (
                <span>マウント</span>
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !networkPath ||
                !driveLetter ||
                (folderExists === null && !mounting)
              }
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <span>設定を保存</span>
              )}
            </button>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <strong>手順:</strong> 1. ネットワークパスとドライブレターを入力 → 2. 「マウント」ボタンをクリック → 3. マウント成功後、「設定を保存」ボタンをクリック
            </p>
          </div>

          {/* 証明ファイルインポート */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center space-x-2 mb-3">
                <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  証明ファイルをインポート
                </h3>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                既存のアカウントを使用する場合は、管理者から受け取った証明ファイル（device-token.json）をインポートしてください。
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
              />

              <div className="space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>{importing ? 'インポート中...' : '証明ファイルを選択'}</span>
                </button>

                {importError && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-xs text-red-600 dark:text-red-400">{importError}</p>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <p className="text-xs text-green-600 dark:text-green-400">
                      証明ファイルをインポートしました。上記のネットワークドライブ設定を完了してください。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* トークンファイル警告モーダル */}
      <ConfirmDialog
        open={showTokenWarningModal}
        title="トークンファイルの確認"
        message={tokenWarningMessage}
        confirmText="了解"
        cancelText=""
        hideCancel={true}
        variant="info"
        onConfirm={() => setShowTokenWarningModal(false)}
        onCancel={() => setShowTokenWarningModal(false)}
      />
    </div>
  );
}

