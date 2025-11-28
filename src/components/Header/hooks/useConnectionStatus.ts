// 接続状態管理のカスタムフック

import { useState, useCallback } from 'react';

export type ConnectionStatus = 'online' | 'offline' | 'disabled';

interface UseConnectionStatusProps {
  onStatusChange?: (status: ConnectionStatus) => void;
}

/**
 * 接続状態を管理するフック
 */
export function useConnectionStatus({ onStatusChange }: UseConnectionStatusProps = {}) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');

  const updateStatus = useCallback(
    (status: ConnectionStatus) => {
      setConnectionStatus(status);
      if (onStatusChange) {
        onStatusChange(status);
      }
    },
    [onStatusChange]
  );

  return {
    connectionStatus,
    updateStatus,
  };
}

