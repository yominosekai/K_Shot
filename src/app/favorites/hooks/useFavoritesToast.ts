// お気に入りページのトースト管理フック

import { useState, useCallback } from 'react';

export function useFavoritesToast() {
  const [toastMessage, setToastMessage] = useState('');
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
