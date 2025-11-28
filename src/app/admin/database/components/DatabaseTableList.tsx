'use client';

import { Table, RefreshCw } from 'lucide-react';

interface TableInfo {
  name: string;
  rowCount: number;
}

interface DatabaseTableListProps {
  tables: TableInfo[];
  selectedTable: string | null;
  loading: boolean;
  onTableSelect: (tableName: string) => void;
  onRefresh: () => void;
}

export default function DatabaseTableList({
  tables,
  selectedTable,
  loading,
  onTableSelect,
  onRefresh,
}: DatabaseTableListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Table className="w-5 h-5 mr-2" />
          テーブル
        </h3>
        <button
          onClick={onRefresh}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          aria-label="更新"
        >
          <RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      {loading && !tables.length ? (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          読み込み中...
        </div>
      ) : (
        <div className="space-y-1">
          {tables.map((table) => (
            <button
              key={table.name}
              onClick={() => onTableSelect(table.name)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                selectedTable === table.name
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{table.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {table.rowCount}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


