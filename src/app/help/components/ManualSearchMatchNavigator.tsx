'use client';

import { useEffect, useRef } from 'react';

type ManualSearchMatchNavigatorProps = {
  matchIndex: number;
  query?: string;
  docId?: string;
};

export default function ManualSearchMatchNavigator({ matchIndex, query, docId }: ManualSearchMatchNavigatorProps) {
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!query || !matchIndex || !docId) {
      return;
    }

    // カスタムイベントで通知された場合はスキップ（ManualSearchBarで既に処理済み）
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    const scrollToMatch = () => {
      const selector = `[data-manual-hit="true"][data-hit-index="${matchIndex}"][data-doc-id="${docId}"]`;
      const target = document.querySelector<HTMLElement>(selector);
      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    };

    // 通常のprops変更によるスクロール（新規検索時など）
    scrollToMatch();
  }, [matchIndex, query, docId]);

  useEffect(() => {
    // カスタムイベントをリッスン
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ matchIndex: number; docId?: string }>;
      if (customEvent.detail?.matchIndex === matchIndex && customEvent.detail?.docId === docId) {
        // このコンポーネントのmatchIndexと一致する場合は、ManualSearchBarで処理済みなのでスキップ
        isNavigatingRef.current = true;
      }
    };

    window.addEventListener('manual-search-navigate', handleNavigate);

    return () => {
      window.removeEventListener('manual-search-navigate', handleNavigate);
    };
  }, [matchIndex, docId]);

  return null;
}


