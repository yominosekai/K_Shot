// ホームページのクイックアクションセクション

import Link from 'next/link';
import { FileText, Users, BarChart, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeQuickActions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <Link
        href="/materials"
        className="group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-600"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          ナレッジ
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          チームの知見を閲覧・検索・管理
        </p>
      </Link>

      <Link
        href="/members"
        className="group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all hover:border-green-300 dark:hover:border-green-600"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          利用者一覧
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          チームメンバーを確認・管理
        </p>
      </Link>

      {isAdmin && (
        <Link
          href="/overview"
          className="group bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all hover:border-purple-300 dark:hover:border-purple-600"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <BarChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            利用状況
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            システム全体の統計を確認
          </p>
        </Link>
      )}
    </div>
  );
}

