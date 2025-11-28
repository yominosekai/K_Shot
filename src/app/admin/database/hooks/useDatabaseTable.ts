'use client';

import { useState, useCallback } from 'react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface TableInfo {
  name: string;
  rowCount: number;
}

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

type DatabaseType = 'network' | 'local';

export function useDatabaseTable(dbType: DatabaseType) {
  const confirmDialog = useConfirmDialog();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<{ [key: string]: any } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newRow, setNewRow] = useState<{ [key: string]: any } | null>(null);

  // テーブル一覧を取得
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/database/tables?type=${dbType}`);
      const data = await response.json();
      if (data.success) {
        setTables(data.tables || []);
        setSelectedTable(null);
        setTableData(null);
      } else {
        setError(data.error || 'テーブル一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('テーブル一覧取得エラー:', err);
      setError('テーブル一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [dbType]);

  // テーブルデータを取得
  const fetchTableData = useCallback(
    async (tableName: string, pageNum: number = 1) => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/admin/database/tables/${tableName}?type=${dbType}&page=${pageNum}&limit=50`
        );
        const data = await response.json();
        if (data.success) {
          setTableData(data);
          setPage(pageNum);
        } else {
          setError(data.error || 'テーブルデータの取得に失敗しました');
        }
      } catch (err) {
        console.error('テーブルデータ取得エラー:', err);
        setError('テーブルデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [dbType]
  );

  // テーブル選択時
  const handleTableSelect = useCallback(
    (tableName: string) => {
      setSelectedTable(tableName);
      setEditingRow(null);
      setEditingIndex(null);
      setNewRow(null);
      fetchTableData(tableName, 1);
    },
    [fetchTableData]
  );

  // 行の編集開始
  const handleEditRow = useCallback((row: any, index: number) => {
    setEditingRow({ ...row });
    setEditingIndex(index);
    setNewRow(null);
  }, []);

  // 行の編集キャンセル
  const handleCancelEdit = useCallback(() => {
    setEditingRow(null);
    setEditingIndex(null);
  }, []);

  // 行の保存
  const handleSaveRow = useCallback(async () => {
    if (!editingRow || !selectedTable || !tableData) return;

    try {
      setLoading(true);
      const primaryKeyColumn = tableData.columns.find((col) => col.primaryKey);
      if (!primaryKeyColumn) {
        setError('主キーが見つかりません');
        return;
      }

      const primaryKey = primaryKeyColumn.name;
      const primaryKeyValue = editingRow[primaryKey];

      const response = await fetch(`/api/admin/database/tables/${selectedTable}?type=${dbType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryKey,
          primaryKeyValue,
          data: editingRow,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchTableData(selectedTable, page);
        setEditingRow(null);
        setEditingIndex(null);
      } else {
        setError(data.error || '行の更新に失敗しました');
      }
    } catch (err) {
      console.error('行更新エラー:', err);
      setError('行の更新に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [editingRow, selectedTable, tableData, dbType, page, fetchTableData]);

  // 行の削除
  const handleDeleteRow = useCallback(
    async (row: any) => {
      if (!selectedTable || !tableData) return;
      const confirmed = await confirmDialog({
        title: '行の削除',
        message: 'この行を削除してもよろしいですか？',
        confirmText: '削除する',
        cancelText: 'キャンセル',
        variant: 'danger',
      });
      if (!confirmed) return;

      try {
        setLoading(true);
        const primaryKeyColumn = tableData.columns.find((col) => col.primaryKey);
        if (!primaryKeyColumn) {
          setError('主キーが見つかりません');
          return;
        }

        const primaryKey = primaryKeyColumn.name;
        const primaryKeyValue = row[primaryKey];

        const response = await fetch(
          `/api/admin/database/tables/${selectedTable}?type=${dbType}&primaryKey=${primaryKey}&primaryKeyValue=${primaryKeyValue}`,
          {
            method: 'DELETE',
          }
        );

        const data = await response.json();
        if (data.success) {
          await fetchTableData(selectedTable, page);
        } else {
          setError(data.error || '行の削除に失敗しました');
        }
      } catch (err) {
        console.error('行削除エラー:', err);
        setError('行の削除に失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [selectedTable, tableData, dbType, page, fetchTableData, confirmDialog]
  );

  // 新規行追加開始
  const handleAddRow = useCallback(() => {
    if (!tableData) return;
    const emptyRow: { [key: string]: any } = {};
    const now = new Date().toISOString();

    tableData.columns.forEach((col) => {
      if (col.primaryKey) {
        if (
          (selectedTable === 'departments' || selectedTable === 'categories') &&
          col.name === 'id'
        ) {
          emptyRow[col.name] = '';
        } else if (
          col.name.toLowerCase().includes('id') ||
          col.name.toLowerCase().includes('_id')
        ) {
          emptyRow[col.name] = Date.now().toString();
        } else {
          emptyRow[col.name] = Date.now().toString();
        }
      } else if (
        col.name.toLowerCase() === 'created_date' ||
        col.name.toLowerCase() === 'created_at'
      ) {
        emptyRow[col.name] = now;
      } else if (
        col.name.toLowerCase() === 'updated_date' ||
        col.name.toLowerCase() === 'updated_at'
      ) {
        emptyRow[col.name] = now;
      } else {
        emptyRow[col.name] = col.defaultValue || '';
      }
    });
    setNewRow(emptyRow);
    setEditingRow(null);
    setEditingIndex(null);
  }, [tableData, selectedTable]);

  // 新規行追加キャンセル
  const handleCancelAdd = useCallback(() => {
    setNewRow(null);
  }, []);

  // 新規行保存
  const handleSaveNewRow = useCallback(async () => {
    if (!newRow || !selectedTable) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/database/tables/${selectedTable}/rows?type=${dbType}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: newRow,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        await fetchTableData(selectedTable, page);
        setNewRow(null);
      } else {
        setError(data.error || '行の追加に失敗しました');
      }
    } catch (err) {
      console.error('行追加エラー:', err);
      setError('行の追加に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [newRow, selectedTable, dbType, page, fetchTableData]);

  return {
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
  };
}


