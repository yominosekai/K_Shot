'use client';

import { useEffect, useState } from 'react';
import { Info, Package, Code, Calendar, Plus, Edit, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  type: string;
  added: string[];
  changed: string[];
  fixed: string[];
}

interface VersionInfo {
  version: string;
  name: string;
  description: string;
  coreStack: {
    name: string;
    version: string;
  }[];
  changelog: ChangelogEntry[];
}

export default function VersionPage() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // package.jsonからバージョン情報を取得
    fetch('/api/version')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVersionInfo(data.info);
          // 最新バージョン（最初のエントリ）を展開状態にする
          if (data.info.changelog && data.info.changelog.length > 0) {
            setExpandedVersions(new Set([data.info.changelog[0].version]));
          }
        }
      })
      .catch((err) => {
        console.error('バージョン情報の取得に失敗しました:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(version)) {
        newSet.delete(version);
      } else {
        newSet.add(version);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Info className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              バージョン情報
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              システムのバージョン情報と技術仕様
            </p>
          </div>

          {/* メイン情報カード */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {versionInfo?.name || 'ナレッジ管理ツール（K_Shot）'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {versionInfo?.description || 'ナレッジ管理ツール（K_Shot）の新規開発版'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">バージョン</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {versionInfo?.version || '1.0.0'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">リリース日</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {new Date().toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 技術スタック */}
          {versionInfo && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                主要技術スタック
              </h3>
              <div className="space-y-3">
                {versionInfo.coreStack.map((tech) => (
                  <div
                    key={tech.name}
                    className="flex items-center justify-between py-2 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{tech.name}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{tech.version}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  詳細な技術スタックや依存関係については、GitHubリポジトリの
                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">package.json</code>
                  を参照してください。
                </p>
              </div>
            </div>
          )}

          {/* 変更履歴 */}
          {versionInfo && versionInfo.changelog && versionInfo.changelog.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                変更履歴
              </h3>
              <div className="space-y-4">
                {versionInfo.changelog.map((entry, index) => {
                  const isLatest = index === 0;
                  const isExpanded = expandedVersions.has(entry.version);
                  
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => !isLatest && toggleVersion(entry.version)}
                        className={`w-full flex items-center justify-between p-4 ${
                          isLatest
                            ? 'bg-blue-50 dark:bg-blue-900/20 cursor-default'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors'
                        }`}
                        disabled={isLatest}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            v{entry.version}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {entry.date}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded">
                              最新
                            </span>
                          )}
                        </div>
                        {!isLatest && (
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                        )}
                      </button>
                      
                      {(isLatest || isExpanded) && (
                        <div className="p-4 pt-0 space-y-3">
                          {entry.added && entry.added.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                                  追加
                                </span>
                              </div>
                              <ul className="list-disc list-inside space-y-1 ml-6">
                                {entry.added.map((item, i) => (
                                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.changed && entry.changed.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                  変更
                                </span>
                              </div>
                              <ul className="list-disc list-inside space-y-1 ml-6">
                                {entry.changed.map((item, i) => (
                                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.fixed && entry.fixed.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                                  修正
                                </span>
                              </div>
                              <ul className="list-disc list-inside space-y-1 ml-6">
                                {entry.fixed.map((item, i) => (
                                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

