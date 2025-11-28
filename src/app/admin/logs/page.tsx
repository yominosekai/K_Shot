'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLogsData } from './hooks/useLogsData';
import LogsFilterSection from './components/LogsFilterSection';
import LogsStatsSection from './components/LogsStatsSection';
import LogsTable from './components/LogsTable';
import LogsItemsPerPageSelector from './components/LogsItemsPerPageSelector';
import type { SortField, SortOrder, LogTypeFilter, ItemsPerPage } from './types';
import { DEFAULT_ITEMS_PER_PAGE } from './types';

export default function LogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // フィルタリング
  const [logTypeFilter, setLogTypeFilter] = useState<LogTypeFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // ソート
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(DEFAULT_ITEMS_PER_PAGE);

  // ログデータ取得とフィルタリング
  const {
    filteredLogs,
    loading,
    error,
    fetchLogs,
    uniqueUsers,
  } = useLogsData({
    logTypeFilter,
    userFilter,
    searchTerm,
    dateFrom,
    dateTo,
    sortField,
    sortOrder,
  });

  // 管理者権限チェック
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  // 初回読み込み
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchLogs();
    }
  }, [user, fetchLogs]);

  // フィルター変更時に1ページ目に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [logTypeFilter, userFilter, searchTerm, dateFrom, dateTo, itemsPerPage]);

  // ページネーション
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            エラーチェック
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            システム全体のエラーログとSQLITE_BUSY監視ログを確認できます
          </p>
        </div>

        {/* フィルター・検索 */}
        <LogsFilterSection
          logTypeFilter={logTypeFilter}
          onLogTypeFilterChange={setLogTypeFilter}
          userFilter={userFilter}
          onUserFilterChange={setUserFilter}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          uniqueUsers={uniqueUsers}
          loading={loading}
          onRefresh={fetchLogs}
        />

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* 統計情報 */}
        <LogsStatsSection filteredLogs={filteredLogs} />

        {/* 表示件数選択（テーブルの上） */}
        <LogsItemsPerPageSelector
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalLogs={filteredLogs.length}
          currentPage={currentPage}
        />

        {/* ログテーブル */}
        <LogsTable
          logs={paginatedLogs}
          loading={loading}
          logTypeFilter={logTypeFilter}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}

