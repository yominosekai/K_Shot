'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search, ArrowUp, ArrowDown, X } from 'lucide-react';

type MatchInfo = { docId: string; localIndex: number; globalIndex: number };

type ManualSearchBarProps = {
  docs: Array<{ id: string; title: string; content: string }>;
  activeDocId: string;
  initialQuery?: string;
  matchCount: number;
  currentMatchIndex: number;
  allMatches?: MatchInfo[];
};

const normalize = (value: string) => value.toLowerCase();

export default function ManualSearchBar({
  docs,
  activeDocId,
  initialQuery = '',
  matchCount,
  currentMatchIndex,
  allMatches = [],
}: ManualSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [notFound, setNotFound] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localMatchIndex, setLocalMatchIndex] = useState(currentMatchIndex);
  const normalizedInitialQuery = normalize(initialQuery);
  
  // URLパラメータから現在のmatchIndexを取得（リアルタイムで更新される）
  const currentMatchFromUrl = useMemo(() => {
    const matchParam = searchParams.get('match');
    return matchParam ? Number(matchParam) || 1 : 1;
  }, [searchParams]);
  
  // currentMatchIndexが変更されたら、ローカルstateも更新
  useEffect(() => {
    setLocalMatchIndex(currentMatchIndex);
  }, [currentMatchIndex]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const docIndex = useMemo(
    () =>
      docs.map((doc) => ({
        ...doc,
        normalizedContent: normalize(doc.content),
      })),
    [docs]
  );

  const prioritizedDocs = useMemo(() => {
    const currentDoc = docIndex.find((doc) => doc.id === activeDocId);
    const others = docIndex.filter((doc) => doc.id !== activeDocId);
    return currentDoc ? [currentDoc, ...others] : docIndex;
  }, [docIndex, activeDocId]);

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!query.trim() || matchCount === 0 || allMatches.length === 0) {
      return;
    }
    
    // グローバルインデックスから現在のマッチを取得
    const currentGlobalIndex = localMatchIndex;
    const currentMatch = allMatches.find((m) => m.globalIndex === currentGlobalIndex);
    if (!currentMatch) {
      return;
    }
    
    // 次の/前のグローバルインデックスを計算
    const currentMatchArrayIndex = allMatches.findIndex((m) => m.globalIndex === currentGlobalIndex);
    const delta = direction === 'next' ? 1 : -1;
    const nextMatchArrayIndex = (currentMatchArrayIndex + delta + allMatches.length) % allMatches.length;
    const nextMatch = allMatches[nextMatchArrayIndex];
    
    if (!nextMatch) {
      return;
    }
    
    // 同じドキュメント・同じクエリの場合は、再レンダリングを避けて直接スクロール
    const normalized = normalize(query.trim());
    const isSameDoc = nextMatch.docId === activeDocId;
    const isSameQuery = normalized === normalizedInitialQuery;
    
    if (isSameDoc && isSameQuery) {
      // ローカルstateを更新
      setLocalMatchIndex(nextMatch.globalIndex);
      
      // URLパラメータのみ更新（再レンダリングを避ける）
      const newUrl = `/help?doc=${activeDocId}&q=${encodeURIComponent(query.trim())}&match=${nextMatch.globalIndex}`;
      window.history.replaceState({}, '', newUrl);
      
      // カスタムイベントを発火してManualSearchMatchNavigatorに通知
      window.dispatchEvent(
        new CustomEvent('manual-search-navigate', {
          detail: { matchIndex: nextMatch.localIndex, docId: nextMatch.docId },
        })
      );
      
      // 直接スクロール処理（要素が見つかるまで待つ）
      const scrollToMatch = () => {
        const selector = `[data-manual-hit="true"][data-hit-index="${nextMatch.localIndex}"][data-doc-id="${nextMatch.docId}"]`;
        const target = document.querySelector<HTMLElement>(selector);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
          return true;
        }
        return false;
      };

      // 即座に試行
      if (!scrollToMatch()) {
        // 見つからない場合は、少し待ってから再試行（最大10回）
        let retryCount = 0;
        const retry = () => {
          retryCount++;
          if (!scrollToMatch() && retryCount < 10) {
            requestAnimationFrame(retry);
          }
        };
        requestAnimationFrame(retry);
      }
    } else {
      // 異なるドキュメントの場合は、そのドキュメントに移動
      startTransition(() => {
        router.push(`/help?doc=${nextMatch.docId}&q=${encodeURIComponent(query.trim())}&match=${nextMatch.globalIndex}`);
      });
    }
  };

  const handleSearch = (value: string, desiredGlobalIndex?: number) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setNotFound(false);
      startTransition(() => router.push(`/help?doc=${activeDocId}`));
      return;
    }

    const normalized = normalize(trimmed);
    const matchedDoc = prioritizedDocs.find((doc) => doc.normalizedContent.includes(normalized));

    if (!matchedDoc) {
      setNotFound(true);
      return;
    }

    // allMatchesが空の場合は、サーバー側で再計算させるため、router.pushで検索を実行
    if (allMatches.length === 0) {
      setNotFound(false);
      startTransition(() => {
        router.push(`/help?doc=${matchedDoc.id}&q=${encodeURIComponent(trimmed)}&match=1`);
      });
      return;
    }

    // 全ドキュメントのマッチから最初のマッチを取得
    const firstMatch = allMatches.find((m) => m.docId === matchedDoc.id);
    if (!firstMatch) {
      // マッチが見つからない場合は、サーバー側で再計算させる
      setNotFound(false);
      startTransition(() => {
        router.push(`/help?doc=${matchedDoc.id}&q=${encodeURIComponent(trimmed)}&match=1`);
      });
      return;
    }

    const isSameDoc = matchedDoc.id === activeDocId;
    const isSameQuery = normalized === normalizedInitialQuery;
    const defaultGlobalIndex = isSameDoc && isSameQuery && matchCount > 0 ? (currentMatchIndex % matchCount) + 1 : firstMatch.globalIndex;
    const nextGlobalIndex = desiredGlobalIndex ?? defaultGlobalIndex;

    // グローバルインデックスから該当するマッチを取得
    const targetMatch = allMatches.find((m) => m.globalIndex === nextGlobalIndex);
    if (!targetMatch) {
      // マッチが見つからない場合は、サーバー側で再計算させる
      setNotFound(false);
      startTransition(() => {
        router.push(`/help?doc=${matchedDoc.id}&q=${encodeURIComponent(trimmed)}&match=1`);
      });
      return;
    }

    setNotFound(false);
    startTransition(() => {
      router.push(`/help?doc=${targetMatch.docId}&q=${encodeURIComponent(trimmed)}&match=${nextGlobalIndex}`);
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    
    // 同じクエリの場合は次へ移動、異なるクエリの場合は新規検索
    const normalized = normalize(trimmed);
    const isSameQuery = normalized === normalizedInitialQuery && normalizedInitialQuery !== '';
    
    if (isSameQuery && matchCount > 0 && allMatches.length > 0) {
      // 同じクエリの場合は次へ移動
      handleNavigate('next');
    } else {
      // 異なるクエリの場合は新規検索（サーバー側でallMatchesを再計算）
      handleSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    setNotFound(false);
    startTransition(() => {
      router.push(`/help?doc=${activeDocId}`);
    });
  };

  return (
    <div className="flex w-full max-w-[220px] flex-col gap-1 lg:max-w-[260px]" style={{ minHeight: '56px' }}>
      <form
        onSubmit={onSubmit}
        className="flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-gray-900 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="検索"
          className="min-w-[140px] flex-1 bg-transparent text-sm placeholder:text-gray-400 focus:outline-none dark:placeholder:text-slate-400"
          aria-label="マニュアル内検索"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="検索をクリア"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          aria-label="検索する"
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </form>
      {notFound ? (
        <p className="text-xs text-rose-500">該当するテキストが見つかりませんでした</p>
      ) : matchCount > 0 ? (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
          <span>
            {localMatchIndex} / {matchCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleNavigate('prev')}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              aria-label="前の一致へ移動"
              disabled={isPending}
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('next')}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              aria-label="次の一致へ移動"
              disabled={isPending}
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

