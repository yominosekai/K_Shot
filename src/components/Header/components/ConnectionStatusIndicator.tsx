// 接続状態インジケーターコンポーネント

'use client';

import { WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useNotificationPolling';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
}

export default function ConnectionStatusIndicator({ status }: ConnectionStatusIndicatorProps) {
  return (
    <div className="relative group">
      {status === 'online' && (
        <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
        </div>
      )}
      {status === 'offline' && (
        <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
          <WifiOff className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mr-2" />
          <span className="text-xs font-medium text-red-700 dark:text-red-400">Dead</span>
        </div>
      )}
      {status === 'disabled' && (
        <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Inactive</span>
        </div>
      )}
    </div>
  );
}


