// 初期設定ページのトークン警告モーダル管理フック

import { useState, useCallback } from 'react';

export function useTokenWarning() {
  const [showTokenWarningModal, setShowTokenWarningModal] = useState(false);
  const [tokenWarningMessage, setTokenWarningMessage] = useState('');

  const showWarning = useCallback((message: string) => {
    setTokenWarningMessage(message);
    setTimeout(() => {
      setShowTokenWarningModal(true);
    }, 300);
  }, []);

  const closeWarning = useCallback(() => {
    setShowTokenWarningModal(false);
  }, []);

  return {
    showTokenWarningModal,
    tokenWarningMessage,
    showWarning,
    closeWarning,
  };
}
