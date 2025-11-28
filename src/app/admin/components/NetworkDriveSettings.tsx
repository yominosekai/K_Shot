// ネットワークドライブ設定セクション

'use client';

import { Settings, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface NetworkDriveSettingsProps {
  driveConfig: { networkPath?: string; driveLetter?: string } | null;
}

export default function NetworkDriveSettings({ driveConfig }: NetworkDriveSettingsProps) {
  const router = useRouter();
  const confirmDialog = useConfirmDialog();

  const handleRestartSetup = async () => {
    const confirmed = await confirmDialog({
      title: '初期設定の再開',
      message: '初期設定を再開しますか？現在の設定は保持されますが、設定を変更できます。',
      confirmText: '再開する',
      cancelText: 'キャンセル',
    });
    if (!confirmed) {
      return;
    }
    router.push('/setup?force=true');
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3 mb-4">
        <Settings className="w-5 h-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ネットワークドライブ設定</h3>
      </div>
      <div className="space-y-4">
        {driveConfig ? (
          <>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>ネットワークパス:</strong>{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {driveConfig.networkPath || '-'}
                </code>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                <strong>ドライブレター:</strong>{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {driveConfig.driveLetter || '-'}:
                </code>
              </p>
            </div>
            <button
              onClick={handleRestartSetup}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>初期設定を再開</span>
            </button>
          </>
        ) : (
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">初期設定が完了していません。</p>
            <button
              onClick={handleRestartSetup}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>初期設定を開始</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


