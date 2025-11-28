'use client';

import { Edit, Trash2, Plus, Save, X, Database } from 'lucide-react';

interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
  defaultValue: any;
}

interface TableData {
  tableName: string;
  columns: ColumnInfo[];
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DatabaseTableEditorProps {
  tableData: TableData | null;
  selectedTable: string | null;
  dbType: 'network' | 'local';
  editingRow: { [key: string]: any } | null;
  editingIndex: number | null;
  newRow: { [key: string]: any } | null;
  loading: boolean;
  onEditRow: (row: any, index: number) => void;
  onCancelEdit: () => void;
  onSaveRow: () => Promise<void>;
  onDeleteRow: (row: any) => Promise<void>;
  onAddRow: () => void;
  onCancelAdd: () => void;
  onSaveNewRow: () => Promise<void>;
  onRowChange: (row: { [key: string]: any }) => void;
  onNewRowChange: (row: { [key: string]: any }) => void;
  onPageChange: (page: number) => void;
}

export default function DatabaseTableEditor({
  tableData,
  selectedTable,
  dbType,
  editingRow,
  editingIndex,
  newRow,
  loading,
  onEditRow,
  onCancelEdit,
  onSaveRow,
  onDeleteRow,
  onAddRow,
  onCancelAdd,
  onSaveNewRow,
  onRowChange,
  onNewRowChange,
  onPageChange,
}: DatabaseTableEditorProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!tableData || !selectedTable) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Database className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          左側からテーブルを選択してください
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {selectedTable}
        </h3>
        <button
          onClick={onAddRow}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>新規追加</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {tableData.columns.map((col) => (
                <th
                  key={col.name}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {col.name}
                  {col.primaryKey && (
                    <span className="ml-1 text-blue-600 dark:text-blue-400">(PK)</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {/* 新規行追加フォーム */}
            {newRow && (
              <tr className="bg-blue-50 dark:bg-blue-900/20">
                {tableData.columns.map((col) => (
                  <td key={col.name} className="px-4 py-2">
                    {col.primaryKey ||
                    col.name.toLowerCase() === 'created_date' ||
                    col.name.toLowerCase() === 'created_at' ||
                    col.name.toLowerCase() === 'updated_date' ||
                    col.name.toLowerCase() === 'updated_at' ? (
                      <span className="text-gray-400 dark:text-gray-500 text-sm">
                        {newRow[col.name] || '(自動)'}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={newRow[col.name] || ''}
                        onChange={(e) =>
                          onNewRowChange({ ...newRow, [col.name]: e.target.value })
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder={col.type}
                      />
                    )}
                  </td>
                ))}
                <td className="px-4 py-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={onSaveNewRow}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      aria-label="保存"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onCancelAdd}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                      aria-label="キャンセル"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* データ行 */}
            {tableData.data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {tableData.columns.map((col) => (
                  <td key={col.name} className="px-4 py-2 text-sm">
                    {editingIndex === index ? (
                      <input
                        type="text"
                        value={editingRow?.[col.name] ?? ''}
                        onChange={(e) =>
                          onRowChange({ ...editingRow!, [col.name]: e.target.value })
                        }
                        disabled={col.primaryKey}
                        className={`w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                          col.primaryKey ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''
                        }`}
                      />
                    ) : (
                      <span className="text-gray-900 dark:text-gray-100">
                        {row[col.name] !== null && row[col.name] !== undefined
                          ? String(row[col.name])
                          : '(NULL)'}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2">
                  {editingIndex === index ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={onSaveRow}
                        className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                        aria-label="保存"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={onCancelEdit}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                        aria-label="キャンセル"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEditRow(row, index)}
                        className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        aria-label="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteRow(row)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        aria-label="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ページネーション */}
        {tableData.pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {tableData.pagination.total}件中{' '}
              {(tableData.pagination.page - 1) * tableData.pagination.limit + 1}〜
              {Math.min(
                tableData.pagination.page * tableData.pagination.limit,
                tableData.pagination.total
              )}{' '}
              件を表示
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onPageChange(tableData.pagination.page - 1)}
                disabled={tableData.pagination.page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                {tableData.pagination.page} / {tableData.pagination.totalPages}
              </span>
              <button
                onClick={() => onPageChange(tableData.pagination.page + 1)}
                disabled={tableData.pagination.page >= tableData.pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

