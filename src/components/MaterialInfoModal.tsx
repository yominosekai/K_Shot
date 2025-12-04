// 資料ファイル情報モーダルコンポーネント

'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Folder, Calendar, User, Eye, ThumbsUp, Heart, HardDrive, Hash, Link as LinkIcon } from 'lucide-react';
import type { MaterialNormalized } from '@/features/materials/types';

interface MaterialInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: MaterialNormalized | null;
}

interface MaterialInfo {
  totalSize: number;
  documentSize: number;
  attachmentsSize: number;
  attachmentsCount: number;
  physicalPath: string;
  lastAccessed?: string;
}

export default function MaterialInfoModal({
  isOpen,
  onClose,
  material,
}: MaterialInfoModalProps) {
  const [info, setInfo] = useState<MaterialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // ファイル情報を取得
  useEffect(() => {
    if (isOpen && material) {
      const fetchInfo = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/materials/${material.id}/info`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setInfo(data.info);
            }
          }
        } catch (err) {
          console.error('ファイル情報取得エラー:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchInfo();
    } else {
      setInfo(null);
      setLoading(true);
    }
  }, [isOpen, material]);

  // 情報が取得できるまでモーダルを表示しない
  if (!isOpen || !material || loading) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getDifficultyLabel = (difficulty?: string) => {
    if (!difficulty) return '-';
    // 難易度はDBから取得するため、そのまま表示（既に日本語）
    return difficulty;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">ファイル情報</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{material.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  基本情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      タイトル
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 break-words">{material.title}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      タイプ
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{material.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      カテゴリ
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{material.category_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      難易度
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{getDifficultyLabel(material.difficulty)}</p>
                  </div>
                  {material.estimated_hours && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        推定学習時間
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{material.estimated_hours}時間</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ファイルサイズ情報 */}
              {info && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <HardDrive className="w-5 h-5 mr-2" />
                    ファイルサイズ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        合計サイズ
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 font-semibold">
                        {formatFileSize(info.totalSize)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        本文（document.md）
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{formatFileSize(info.documentSize)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        添付資料
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">
                        {info.attachmentsCount}件 ({formatFileSize(info.attachmentsSize)})
                      </p>
                    </div>
                    {info.lastAccessed && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          最終アクセス
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{formatDate(info.lastAccessed)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* システム情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Hash className="w-5 h-5 mr-2" />
                  システム情報
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      資料ID
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{material.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      UUID
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 font-mono text-sm break-all">{material.uuid}</p>
                  </div>
                  {info && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        物理パス
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 font-mono text-xs break-all bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        {info.physicalPath}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      保存先フォルダ
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">
                      {material.folder_path ? (
                        <span className="flex items-center">
                          <Folder className="w-4 h-4 mr-1" />
                          {material.folder_path}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">未分類（ルート）</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 統計情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  統計情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      閲覧数
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 text-2xl font-semibold">{material.views}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                      <ThumbsUp className="w-4 h-4 mr-1" />
                      いいね数
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 text-2xl font-semibold">{material.likes}</p>
                  </div>
                </div>
              </div>

              {/* 日時情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  日時情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      作成日時
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(material.created_date)}</p>
                    {material.created_by_name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        作成者: {material.created_by_name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      更新日時
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(material.updated_date)}</p>
                  </div>
                </div>
              </div>

              {/* タグ */}
              {material.tags && material.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <LinkIcon className="w-5 h-5 mr-2" />
                    タグ
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {material.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

