// 初期設定ページ

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, AlertCircle, CheckCircle, Loader2, Upload, Smartphone } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSetupInitialization } from './hooks/useSetupInitialization';
import { useDriveMount } from './hooks/useDriveMount';
import { useDeviceTokenImport } from './hooks/useDeviceTokenImport';
import { useTokenWarning } from './hooks/useTokenWarning';
import { useSetupSave } from './hooks/useSetupSave';

export default function SetupPage() {
  const router = useRouter();
  const [folderExists, setFolderExists] = useState<boolean | null>(null);
  const [createFolder, setCreateFolder] = useState(false);

  // トークン警告管理
  const tokenWarning = useTokenWarning();

  // 初期化処理
  const initialization = useSetupInitialization({
    onTokenWarning: tokenWarning.showWarning,
  });

  // マウント処理
  const mount = useDriveMount({
    networkPath: initialization.networkPath,
    driveLetter: initialization.driveLetter,
    setFolderExists,
    setCreateFolder,
  });

  // 保存処理
  const save = useSetupSave({
    networkPath: initialization.networkPath,
    driveLetter: initialization.driveLetter,
    folderExists,
    createFolder,
  });

  // 証明ファイルインポート処理
  const tokenImport = useDeviceTokenImport();

  // エラーと成功メッセージを統合（マウントと保存の両方から）
  const error = mount.error || save.error;
  const success = mount.success || save.success;

  if (initialization.loading) {
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
            {initialization.isForceMode && (
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                キャンセル
              </button>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            ネットワークドライブの設定を行います。{initialization.isForceMode ? '設定を変更できます。' : '初回起動時のみ表示されます。'}
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
              value={initialization.networkPath}
              onChange={(e) => initialization.setNetworkPath(e.target.value)}
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
              value={initialization.driveLetter}
              onChange={(e) => {
                initialization.setDriveLetter(e.target.value);
                // 既存フォルダがあるドライブを選択した場合、folderExistsをtrueに設定
                const selected = initialization.availableDriveLetters.find(item => item.letter === e.target.value);
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
              {initialization.availableDriveLetters.map((item) => (
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
                  <code className="font-mono">{initialization.driveLetter}:\\k_shot</code> フォルダが存在しません。
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
              onClick={mount.handleMount}
              disabled={mount.mounting || !initialization.networkPath || !initialization.driveLetter}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {mount.mounting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>マウント中...</span>
                </>
              ) : (
                <span>マウント</span>
              )}
            </button>
            <button
              onClick={save.handleSave}
              disabled={
                save.saving ||
                !initialization.networkPath ||
                !initialization.driveLetter ||
                (folderExists === null && !mount.mounting)
              }
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {save.saving ? (
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
                ref={tokenImport.fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={tokenImport.handleFileImport}
                className="hidden"
              />

              <div className="space-y-2">
                <button
                  onClick={() => tokenImport.fileInputRef.current?.click()}
                  disabled={tokenImport.importing}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>{tokenImport.importing ? 'インポート中...' : '証明ファイルを選択'}</span>
                </button>

                {tokenImport.importError && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-xs text-red-600 dark:text-red-400">{tokenImport.importError}</p>
                  </div>
                )}

                {tokenImport.importSuccess && (
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
        open={tokenWarning.showTokenWarningModal}
        title="トークンファイルの確認"
        message={tokenWarning.tokenWarningMessage}
        confirmText="了解"
        cancelText=""
        hideCancel={true}
        variant="info"
        onConfirm={tokenWarning.closeWarning}
        onCancel={tokenWarning.closeWarning}
      />
    </div>
  );
}

