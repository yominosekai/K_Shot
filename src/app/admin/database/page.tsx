'use client';

import { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useDatabaseTable } from './hooks/useDatabaseTable';
import DatabaseTableList from './components/DatabaseTableList';
import DatabaseTableEditor from './components/DatabaseTableEditor';

type DatabaseType = 'network' | 'local';

export default function DatabasePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dbType, setDbType] = useState<DatabaseType>('network');

  const {
    tables,
    selectedTable,
    tableData,
    loading,
    error,
    page,
    editingRow,
    editingIndex,
    newRow,
    fetchTables,
    fetchTableData,
    handleTableSelect,
    handleEditRow,
    handleCancelEdit,
    handleSaveRow,
    handleDeleteRow,
    handleAddRow,
    handleCancelAdd,
    handleSaveNewRow,
    setEditingRow,
    setNewRow,
    setError,
  } = useDatabaseTable(dbType);

  // 管理者権限チェック
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, router]);

  // テーブル一覧を取得
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // DBタイプが変わったらテーブル一覧を再取得
  useEffect(() => {
    fetchTables();
  }, [dbType, fetchTables]);

  // ページ変更
  const handlePageChange = (newPage: number) => {
    if (selectedTable) {
      fetchTableData(selectedTable, newPage);
    }
  };

  if (user?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full">
        {/* ヘッダー */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Database className="w-6 h-6 mr-2" />
            データベース
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            データベースのテーブルとデータを表示・編集します
          </p>

          {/* タブ切り替え */}
          <div className="mt-4 flex space-x-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setDbType('network')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                dbType === 'network'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              ネットワーク
            </button>
            <button
              onClick={() => setDbType('local')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                dbType === 'local'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              ローカル
            </button>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 whitespace-pre-line">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              閉じる
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左側: テーブル一覧 */}
          <div className="lg:col-span-1">
            <DatabaseTableList
              tables={tables}
              selectedTable={selectedTable}
              loading={loading}
              onTableSelect={handleTableSelect}
              onRefresh={fetchTables}
            />
          </div>

          {/* 右側: テーブルデータ */}
          <div className="lg:col-span-3">
            <DatabaseTableEditor
              tableData={tableData}
              selectedTable={selectedTable}
              dbType={dbType}
              editingRow={editingRow}
              editingIndex={editingIndex}
              newRow={newRow}
              loading={loading}
              onEditRow={handleEditRow}
              onCancelEdit={handleCancelEdit}
              onSaveRow={handleSaveRow}
              onDeleteRow={handleDeleteRow}
              onAddRow={handleAddRow}
              onCancelAdd={handleCancelAdd}
              onSaveNewRow={handleSaveNewRow}
              onRowChange={setEditingRow}
              onNewRowChange={setNewRow}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
