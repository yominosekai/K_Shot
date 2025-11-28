// ログデータ取得とフィルタリングのカスタムフック

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LogEntry, LogTypeFilter, SortField, SortOrder } from '../types';

interface UseLogsDataProps {
  logTypeFilter: LogTypeFilter;
  userFilter: string;
  searchTerm: string;
  dateFrom: string;
  dateTo: string;
  sortField: SortField;
  sortOrder: SortOrder;
}

export function useLogsData({
  logTypeFilter,
  userFilter,
  searchTerm,
  dateFrom,
  dateTo,
  sortField,
  sortOrder,
}: UseLogsDataProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ログを取得
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (logTypeFilter !== 'all') {
        params.append('type', logTypeFilter);
      }
      if (userFilter !== 'all') {
        params.append('user_sid', userFilter);
      }

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('ログの取得に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        throw new Error(data.error || 'ログの取得に失敗しました');
      }
    } catch (err) {
      console.error('ログ取得エラー:', err);
      setError(err instanceof Error ? err.message : 'ログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [logTypeFilter, userFilter]);

  // フィルタリングとソート
  useEffect(() => {
    let filtered = [...logs];

    // ログタイプフィルター
    if (logTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.logType === logTypeFilter);
    }

    // ユーザーフィルター
    if (userFilter !== 'all') {
      filtered = filtered.filter(log => {
        const sid = log.user_sid || log.userSid;
        return sid === userFilter;
      });
    }

    // 検索フィルター
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const logModule = log.module || '';
        const message = log.message || '';
        const operation = log.operation || '';
        const userDisplayName = log.userDisplayName || '';
        const errorMessage = log.error?.message || '';
        return (
          logModule.toLowerCase().includes(term) ||
          message.toLowerCase().includes(term) ||
          operation.toLowerCase().includes(term) ||
          userDisplayName.toLowerCase().includes(term) ||
          errorMessage.toLowerCase().includes(term)
        );
      });
    }

    // 日付フィルター
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= fromDate;
      });
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // その日の終わりまで
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate <= toDate;
      });
    }

    // ソート
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'timestamp':
          aValue = new Date(a.timestamp || 0).getTime();
          bValue = new Date(b.timestamp || 0).getTime();
          break;
        case 'user':
          aValue = a.userDisplayName || a.user_sid || a.userSid || '';
          bValue = b.userDisplayName || b.user_sid || b.userSid || '';
          break;
        case 'module':
          aValue = a.module || a.operation || '';
          bValue = b.module || b.operation || '';
          break;
        case 'operation':
          aValue = a.operation || '';
          bValue = b.operation || '';
          break;
        case 'retryCount':
          aValue = a.retryCount || 0;
          bValue = b.retryCount || 0;
          break;
        default:
          aValue = a.timestamp || '';
          bValue = b.timestamp || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    setFilteredLogs(filtered);
  }, [logs, logTypeFilter, userFilter, searchTerm, dateFrom, dateTo, sortField, sortOrder]);

  // ユーザー一覧を取得（フィルター用）
  const uniqueUsers = useMemo(() => {
    const userSet = new Set<string>();
    logs.forEach(log => {
      const sid = log.user_sid || log.userSid;
      if (sid) {
        userSet.add(sid);
      }
    });
    return Array.from(userSet).map(sid => {
      const log = logs.find(l => (l.user_sid || l.userSid) === sid);
      return {
        sid,
        displayName: log?.userDisplayName || sid,
      };
    });
  }, [logs]);

  return {
    logs,
    filteredLogs,
    loading,
    error,
    fetchLogs,
    uniqueUsers,
  };
}

