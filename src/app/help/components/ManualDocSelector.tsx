'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { ManualDocDefinition } from '@/content/help/docs';

interface ManualDocSelectorProps {
  activeDocId: string;
  availableDocs: ManualDocDefinition[];
}

export default function ManualDocSelector({ activeDocId, availableDocs }: ManualDocSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeDoc = availableDocs.find((doc) => doc.id === activeDocId);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        dropdownRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }

      setIsDropdownOpen(false);
    };

    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isDropdownOpen]);

  // Escapeキーで閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  const handleDropdownToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDocSelect = () => {
    setIsDropdownOpen(false);
  };

  // 利用可能なドキュメントが1つだけの場合はプルダウンを表示しない
  if (availableDocs.length <= 1) {
    return (
      <div className="-mt-1">
        <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium bg-indigo-600 text-white shadow-lg">
          <span>{activeDoc?.title || 'ドキュメントを選択'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-1 relative">
      <button
        ref={buttonRef}
        onClick={handleDropdownToggle}
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <span>{activeDoc?.title || 'ドキュメントを選択'}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {availableDocs.map((doc) => {
            const isActive = doc.id === activeDocId;
            return (
              <Link
                key={doc.id}
                href={`/help?doc=${doc.id}`}
                onClick={handleDocSelect}
                className={`flex items-center px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium'
                    : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {doc.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

