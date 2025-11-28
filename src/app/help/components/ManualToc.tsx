'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlignLeft } from 'lucide-react';

const PANEL_WIDTH = 256; // w-64 (16rem)
const PANEL_OPEN_RIGHT = 16; // px (right-4)
const BUTTON_CLOSED_RIGHT = 4;
const PANEL_HIDDEN_RIGHT = BUTTON_CLOSED_RIGHT - PANEL_WIDTH;

export interface ManualHeading {
  id: string;
  title: string;
  level: number;
}

interface ManualTocProps {
  headings: ManualHeading[];
}

export default function ManualToc({ headings }: ManualTocProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setIsOpen(true);
    }
  }, [isDesktop]);

  // Intersection Observerで現在表示中のセクションを検出
  useEffect(() => {
    if (headings.length === 0) return;

    const observerOptions = {
      rootMargin: '-20% 0px -70% 0px', // 上部20%から下部70%の範囲をアクティブとみなす
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      // ビューポートに入っている見出しを優先的に選択
      const visibleHeadings = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target.id)
        .filter(Boolean);

      if (visibleHeadings.length > 0) {
        // 最初に見つかった見出しをアクティブにする
        // または、最も上にある見出しを選択
        const headingElements = visibleHeadings
          .map((id) => {
            const element = document.getElementById(id);
            return element ? { id, top: element.getBoundingClientRect().top } : null;
          })
          .filter((item): item is { id: string; top: number } => item !== null)
          .sort((a, b) => a.top - b.top);

        if (headingElements.length > 0) {
          setActiveHeadingId(headingElements[0].id);
        }
      }
    }, observerOptions);

    // すべての見出し要素を監視
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    // 初期状態：ページトップにいる場合は最初の見出しをアクティブにする
    const handleScroll = () => {
      if (window.scrollY < 100) {
        if (headings.length > 0) {
          setActiveHeadingId(headings[0].id);
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [headings]);

  const items = useMemo(
    () =>
      headings.map((heading) => {
        const isActive = activeHeadingId === heading.id;
        return (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600 dark:text-slate-200/80 dark:hover:bg-slate-800 dark:hover:text-white'
            } ${heading.level === 3 ? 'ml-3' : ''}`}
          >
            {heading.title}
          </a>
        );
      }),
    [headings, activeHeadingId]
  );

  if (!headings.length) {
    return null;
  }

  const panelRight = isOpen ? PANEL_OPEN_RIGHT : PANEL_HIDDEN_RIGHT;
  const buttonRight = panelRight + PANEL_WIDTH;

  return (
    <>
      {/* Desktop floating toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="hidden lg:flex fixed top-72 z-[60] h-24 w-11 items-center justify-center rounded-l-3xl border border-gray-200 bg-white text-xs font-semibold text-indigo-600 shadow-lg hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        style={{
          right: `${buttonRight}px`,
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          transition: 'right 300ms ease',
        }}
      >
        目次
      </button>

      {/* Desktop panel */}
      <div
        className="hidden lg:block fixed top-72 z-[60] w-64 rounded-r-3xl rounded-bl-3xl border border-gray-200 bg-white px-5 py-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        style={{
          right: `${panelRight}px`,
          transition: 'right 300ms ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">📑 セクション一覧</p>
        <div className="max-h-[70vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden">
          <nav className="space-y-1">{items}</nav>
        </div>
      </div>

      {/* Mobile toggle */}
      <div className="lg:hidden mt-10">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-600 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <AlignLeft className="h-4 w-4" />
          目次を{isOpen ? '閉じる' : '開く'}
        </button>

        {isOpen ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <nav className="space-y-2">{items}</nav>
          </div>
        ) : null}
      </div>
    </>
  );
}
