// 階層ブラウザのトースト管理フック

import { useState, useCallback } from 'react';

export function useMaterialBrowserToast() {
  const [toastMessage, setToastMessage] = useState<string>('');
  const [isToastVisible, setIsToastVisible] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setIsToastVisible(false);
  }, []);

  return {
    toastMessage,
    isToastVisible,
    showToast,
    hideToast,
  };
}

