// スキルマッピング管理ビューコンポーネント

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import FullscreenToggleButton from '@/components/FullscreenToggleButton';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import type { SkillPhaseItem as BaseSkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';
import type { SkillPhaseItem, NewRow } from './types';
import ExcelViewModeTable from './ExcelViewModeTable';
import EditModeTable from './EditModeTable';
import SaveConfirmModal from './SaveConfirmModal';
import NewItemsModal from './NewItemsModal';
import ImportPreviewModal from './ImportPreviewModal';
import { validateData } from './validation';
import { compareData, type ComparisonResult } from './utils/compareData';
import type { User } from '@/features/auth/types';
import SkillMappingView from '@/components/SkillMappingView';
import SkillHeatMap from './SkillHeatMap';
import DepartmentFilter from './DepartmentFilter';
import StatsCards from './StatsCards';
import MaterialModal from '@/components/MaterialModal';
import type { MaterialNormalized } from '@/features/materials/types';

interface SkillMappingManagementViewProps {}

type TabType = 'view' | 'edit' | 'heatmap';

export default function SkillMappingManagementView({}: SkillMappingManagementViewProps) {
  const confirmDialog = useConfirmDialog();
  const [items, setItems] = useState<BaseSkillPhaseItem[]>([]);
  const [editItems, setEditItems] = useState<SkillPhaseItem[]>([]);
  const [newRows, setNewRows] = useState<NewRow[]>([]);
  const [originalData, setOriginalData] = useState<SkillPhaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('edit');
  const [isEditMode, setIsEditMode] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'data' | 'display'>('data');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [errorRowIds, setErrorRowIds] = useState<Set<string>>(new Set());
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showNewItemsModal, setShowNewItemsModal] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [rowOrder, setRowOrder] = useState<string[]>([]); // 行の順序を管理
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<{
    items: SkillPhaseItem[];
    errors?: string[];
    rowCount: number;
    errorCount: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // 利用者スキルマップ確認用のstate
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [usersLoading, setUsersLoading] = useState(false);
  
  // ヒートマップ用のstate
  const [heatMapData, setHeatMapData] = useState<{
    data: Array<{ userId: string; category: string; maxPhase: number; phaseBreakdown: Record<number, number> }>;
    users: Array<{ id: string; display_name: string; department?: string }>;
    categories: string[];
  } | null>(null);
  const [heatMapLoading, setHeatMapLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialNormalized | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [highlightedSkillIds, setHighlightedSkillIds] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  // スキルマスタデータを取得
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('ユーザー一覧の取得に失敗しました');
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
        // 最初のユーザーを選択（ユーザーが存在する場合）
        if (data.users && data.users.length > 0 && !selectedUserId) {
          setSelectedUserId(data.users[0].id);
        }
      } else {
        throw new Error(data.error || 'ユーザー一覧の取得に失敗しました');
      }
    } catch (err) {
      console.error('ユーザー一覧取得エラー:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [selectedUserId]);

  // 利用者スキルマップ確認タブがアクティブになったときにユーザー一覧を取得
  useEffect(() => {
    if (activeTab === 'view') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  // ヒートマップデータを取得
  const fetchHeatMapData = useCallback(async () => {
    try {
      setHeatMapLoading(true);
      const response = await fetch('/api/skill-mapping/heatmap');
      if (!response.ok) {
        throw new Error('ヒートマップデータの取得に失敗しました');
      }
      const data = await response.json();
      if (data.success) {
        setHeatMapData(data);
      } else {
        throw new Error(data.error || 'ヒートマップデータの取得に失敗しました');
      }
    } catch (err) {
      console.error('ヒートマップデータ取得エラー:', err);
    } finally {
      setHeatMapLoading(false);
    }
  }, []);

  // ヒートマップタブがアクティブになったときにヒートマップデータを取得
  useEffect(() => {
    if (activeTab === 'heatmap') {
      fetchHeatMapData();
    }
  }, [activeTab, fetchHeatMapData]);

  // 検索機能：ナレッジ名で検索して関連スキルをハイライト
  const handleSearch = useCallback(async (searchValue: string) => {
    if (!searchValue.trim()) {
      setHighlightedSkillIds(new Set());
      return;
    }

    try {
      setIsSearching(true);
      // 資料を検索
      const materialsResponse = await fetch(`/api/materials?search=${encodeURIComponent(searchValue)}`);
      if (!materialsResponse.ok) {
        throw new Error('資料の検索に失敗しました');
      }
      const materialsData = await materialsResponse.json();
      if (!materialsData.success) {
        throw new Error(materialsData.error || '資料の検索に失敗しました');
      }

      const materials = materialsData.materials || [];
      if (materials.length === 0) {
        setHighlightedSkillIds(new Set());
        setIsSearching(false);
        return;
      }

      // バッチAPIで一括取得
      const materialIds = materials.map((material: MaterialNormalized) => material.id);
      const batchResponse = await fetch('/api/materials/skills/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ materialIds }),
      });

      if (!batchResponse.ok) {
        throw new Error('関連スキル項目の一括取得に失敗しました');
      }

      const batchData = await batchResponse.json();
      if (!batchData.success) {
        throw new Error(batchData.error || '関連スキル項目の一括取得に失敗しました');
      }

      const skillIds = new Set<number>(batchData.skillPhaseItemIds || []);
      console.log('ハイライト対象スキル項目ID:', Array.from(skillIds));
      setHighlightedSkillIds(skillIds);
    } catch (err) {
      console.error('検索エラー:', err);
      setHighlightedSkillIds(new Set());
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 検索語が変更されたときに検索を実行
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300); // デバウンス: 300ms待機

    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleSearch]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/skill-mapping/items');
      if (!response.ok) {
        throw new Error('スキルマスタの取得に失敗しました');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'スキルマスタの取得に失敗しました');
      }

      setItems(data.items || []);
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 編集モードに切り替える際にデータを変換
  const handleEditModeToggle = () => {
    if (!isEditMode) {
      // 編集モードに切り替え
      const convertedItems: SkillPhaseItem[] = items.map(item => ({
        ...item,
        description: item.description || '',
      }));
      setEditItems(convertedItems);
      setOriginalData(convertedItems);
      setNewRows([]);
      setRowOrder([]); // 行の順序をリセット
      setIsEditMode(true);
    } else {
      // 編集モードをキャンセル
      setIsEditMode(false);
      setEditItems([]);
      setNewRows([]);
      setOriginalData([]);
      setRowOrder([]); // 行の順序をリセット
    }
  };

  // 編集データの変更ハンドラ
  const handleEditDataChange = (newData: SkillPhaseItem[]) => {
    setEditItems(newData);
  };

  // チェックボタンのハンドラ
  const handleCheck = async () => {
    const currentData = editItems.length > 0 ? editItems : [];
    
    // バリデーション実行
    const result = validateData(currentData, newRows);
    setValidationErrors(result.errors);
    setErrorRowIds(result.errorRowIds);
    
    // データ比較実行（表記ゆれ検出）
    const comparison = compareData(items.map(item => ({
      ...item,
      description: item.description || '',
    })), currentData);
    setComparisonResult(comparison);
    
    // 新規項目または類似項目がある場合はモーダルを表示
    const hasNewItems = 
      comparison.newItems.categories.length > 0 ||
      comparison.newItems.items.length > 0 ||
      comparison.newItems.subCategories.length > 0 ||
      comparison.newItems.smallCategories.length > 0;
    
    const hasSimilarItems = 
      comparison.similarItems.categories.length > 0 ||
      comparison.similarItems.items.length > 0 ||
      comparison.similarItems.subCategories.length > 0 ||
      comparison.similarItems.smallCategories.length > 0;
    
    if (hasNewItems || hasSimilarItems) {
      setShowNewItemsModal(true);
    }
    
    if (result.errors.length === 0) {
      if (!hasNewItems && !hasSimilarItems) {
        await confirmDialog({
          title: 'チェック完了',
          message: '✓ エラーはありません。保存してDB同期できます。',
          variant: 'info',
          confirmText: 'OK',
          hideCancel: true,
        });
      }
    } else {
      await confirmDialog({
        title: 'チェック結果',
        message: `✗ ${result.errors.length}件のエラーが見つかりました。エラーを修正してください。`,
        variant: 'danger',
        confirmText: 'OK',
        hideCancel: true,
      });
    }
  };

  // 保存ボタンのハンドラ
  const handleSave = async () => {
    const currentData = editItems.length > 0 ? editItems : [];
    const result = validateData(currentData, newRows);
    
    if (result.errors.length > 0) {
      setValidationErrors(result.errors);
      setErrorRowIds(result.errorRowIds);
      await confirmDialog({
        title: '保存できません',
        message: `✗ ${result.errors.length}件のエラーがあります。先に「チェック」ボタンでエラーを確認してください。`,
        variant: 'danger',
        confirmText: 'OK',
        hideCancel: true,
      });
      return;
    }
    
    // データ比較実行（表記ゆれチェック）
    const comparison = compareData(items.map(item => ({
      ...item,
      description: item.description || '',
    })), currentData);
    setComparisonResult(comparison);
    
    setValidationErrors(result.errors);
    setErrorRowIds(result.errorRowIds);
    setShowSaveConfirmModal(true);
  };

  // 保存確認モーダルの確認ハンドラ
  const handleConfirmSave = async () => {
    setIsSaving(true);
    
    try {
      // 行の順序に基づいてdisplayOrderを設定
      // 同じ中分類（category|item|subCategory）のすべての項目に同じdisplayOrderを割り当てる
      const rowOrderMap = new Map<string, number>();
      
      // rowOrderに基づいて順序を決定
      rowOrder.forEach((rowId, index) => {
        rowOrderMap.set(rowId, index + 1); // 1から始まる順序番号
      });
      
      // 新規行のデータ（newRowIdが設定されているデータ）を正規のIDに変換
      // 同時にdisplayOrderを設定
      const dataToSave = editItems.map(item => {
        const rowKey = `${item.category}|${item.item}|${item.subCategory}`;
        const displayOrder = rowOrderMap.get(rowKey) ?? null;
        
        if (item.newRowId) {
          // 新規行のデータは、newRowIdを削除して正規のIDを生成
          const { newRowId, ...rest } = item;
          return {
            ...rest,
            id: Math.abs(item.id), // 負のIDを正のIDに変換
            displayOrder: displayOrder
          };
        }
        return {
          ...item,
          displayOrder: displayOrder
        };
      });
      
      const response = await fetch('/api/skill-mapping/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // データを再取得
        await fetchItems();
        // 成功時は必ずisSavingをリセットしてからモーダルを閉じる
        setIsSaving(false);
        setShowSaveConfirmModal(false);
        setIsEditMode(false);
        setNewRows([]);
        setEditItems([]);
        setOriginalData([]);
        setRowOrder([]); // 行の順序をリセット
        setValidationErrors([]);
        setErrorRowIds(new Set());
        await confirmDialog({
          title: '同期完了',
          message: 'データベースに同期しました',
          variant: 'info',
          confirmText: 'OK',
          hideCancel: true,
        });
      } else {
        await confirmDialog({
          title: '同期失敗',
          message: `同期に失敗しました: ${result.error || '不明なエラー'}`,
          variant: 'danger',
          confirmText: 'OK',
          hideCancel: true,
        });
        setIsSaving(false);
      }
    } catch (error) {
      console.error('同期エラー:', error);
      await confirmDialog({
        title: '同期失敗',
        message: '同期に失敗しました',
        variant: 'danger',
        confirmText: 'OK',
        hideCancel: true,
      });
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/skill-mapping/export-excel?type=full`);
      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }

      // レスポンスからファイルを取得
      const blob = await response.blob();

      // ファイル名を取得（Content-Dispositionヘッダーから）
      const contentDisposition = response.headers.get('Content-Disposition');
      const defaultFilename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'skill-mapping-data.xlsx'
        : 'skill-mapping-data.xlsx';

      // File System Access APIが利用可能な場合（モダンブラウザ）
      if ('showSaveFilePicker' in window) {
        try {
          // @ts-ignore - showSaveFilePickerは型定義にない場合がある
          const fileHandle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFilename,
            types: [
              {
                description: 'Excelファイル',
                accept: {
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                },
              },
            ],
          });

          // ファイルに書き込み
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();

          await confirmDialog({
            title: 'エクスポート完了',
            message: 'Excelファイルをエクスポートしました',
            variant: 'info',
            confirmText: 'OK',
            hideCancel: true,
          });
          return;
        } catch (saveError: any) {
          // ユーザーがキャンセルした場合はエラーを無視
          if (saveError.name === 'AbortError') {
            return;
          }
          // その他のエラーはフォールバックに進む
          console.warn('File System Access APIでエラー:', saveError);
        }
      }

      // フォールバック: 従来のダウンロード方法
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      await confirmDialog({
        title: 'エクスポート完了',
        message: 'Excelファイルをエクスポートしました',
        variant: 'info',
        confirmText: 'OK',
        hideCancel: true,
      });
    } catch (error) {
      console.error('エクスポートエラー:', error);
      await confirmDialog({
        title: 'エクスポート失敗',
        message: 'エクスポートに失敗しました',
        variant: 'danger',
        confirmText: 'OK',
        hideCancel: true,
      });
    }
  };

  const handleImport = (type: 'data' | 'display' = 'data') => {
    // ファイル選択用のinput要素を作成
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        await confirmDialog({
          title: 'ファイルサイズエラー',
          message: 'ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。',
          variant: 'danger',
          confirmText: 'OK',
          hideCancel: true,
        });
        return;
      }

      setImportFile(file);
      setImportType(type);

      // プレビューAPIを呼び出し
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const response = await fetch('/api/skill-mapping/import-excel/preview', {
          method: 'POST',
          body: formData,
        });

        // レスポンスがJSONかどうかを確認
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          // HTMLエラーページが返された場合
          const text = await response.text();
          console.error('非JSONレスポンス:', text.substring(0, 200));
          await confirmDialog({
            title: 'サーバーエラー',
            message: 'サーバーエラーが発生しました。APIエンドポイントが正しく実装されているか確認してください。',
            variant: 'danger',
            confirmText: 'OK',
            hideCancel: true,
          });
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          if (result.details && Array.isArray(result.details)) {
            const errorMessage = `プレビューエラー：${result.error}\n\nエラー詳細：\n${result.details.slice(0, 10).join('\n')}${result.details.length > 10 ? `\n...他${result.details.length - 10}件のエラー` : ''}`;
            await confirmDialog({
              title: 'プレビューエラー',
              message: errorMessage,
              variant: 'danger',
              confirmText: 'OK',
              hideCancel: true,
            });
          } else {
            await confirmDialog({
              title: 'プレビューエラー',
              message: result.error || '不明なエラーが発生しました',
              variant: 'danger',
              confirmText: 'OK',
              hideCancel: true,
            });
          }
          return;
        }

        // プレビューデータを設定してモーダルを表示
        setImportPreviewData({
          items: result.items || [],
          errors: result.errors,
          rowCount: result.rowCount || 0,
          errorCount: result.errorCount || 0,
        });
        setShowImportPreviewModal(true);
      } catch (error) {
        console.error('プレビューエラー:', error);
        await confirmDialog({
          title: 'プレビューエラー',
          message: 'プレビュー中にエラーが発生しました。',
          variant: 'danger',
          confirmText: 'OK',
          hideCancel: true,
        });
      }
    };
    input.click();
  };

  const handleImportExecute = async () => {
    if (!importFile || !importPreviewData) return;

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', importType);
      formData.append('execute', 'true');

      const response = await fetch('/api/skill-mapping/import-excel', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.details && Array.isArray(result.details)) {
          const errorMessage = `インポートエラー：${result.error}\n\nエラー詳細：\n${result.details.slice(0, 10).join('\n')}${result.details.length > 10 ? `\n...他${result.details.length - 10}件のエラー` : ''}`;
          await confirmDialog({
            title: 'インポートエラー',
            message: errorMessage,
            variant: 'danger',
            confirmText: 'OK',
            hideCancel: true,
          });
        } else {
          await confirmDialog({
            title: 'インポートエラー',
            message: result.error || '不明なエラーが発生しました',
            variant: 'danger',
            confirmText: 'OK',
            hideCancel: true,
          });
        }
        return;
      }

      if (result.success) {
        await confirmDialog({
          title: 'インポート完了',
          message: result.message || `${result.importedCount || 0}件のデータをインポートしました`,
          variant: 'info',
          confirmText: 'OK',
          hideCancel: true,
        });
        setShowImportPreviewModal(false);
        setImportPreviewData(null);
        setImportFile(null);
        // データを再取得
        await fetchItems();
      } else {
        await confirmDialog({
          title: 'インポートエラー',
          message: result.error || '不明なエラーが発生しました',
          variant: 'danger',
          confirmText: 'OK',
          hideCancel: true,
        });
      }
    } catch (error) {
      console.error('インポート実行エラー:', error);
      await confirmDialog({
        title: 'インポートエラー',
        message: 'インポート実行中にエラーが発生しました。',
        variant: 'danger',
        confirmText: 'OK',
        hideCancel: true,
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              スキルマッピング管理
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              スキルマスタデータの管理と全体進捗の確認
            </p>
          </div>
          {/* 最大化ボタン */}
          <FullscreenToggleButton className="ml-4" />
        </div>
      </div>

      {/* 白い背景コンテナ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          {/* タブ */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'edit'
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 dark:border-green-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                スキルマップDB編集
              </button>
              <button
                onClick={() => setActiveTab('view')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'view'
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 dark:border-green-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                利用者スキルマップ確認
              </button>
              <button
                onClick={() => setActiveTab('heatmap')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'heatmap'
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 dark:border-green-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                ヒートマップ
              </button>
            </div>
          </div>

          {/* タブコンテンツ */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* 利用者選択ドロップダウン */}
              <div className="flex items-center gap-4">
                <label htmlFor="user-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  利用者選択:
                </label>
                <select
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={usersLoading}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {usersLoading ? (
                    <option value="">読み込み中...</option>
                  ) : users.length === 0 ? (
                    <option value="">ユーザーが見つかりません</option>
                  ) : (
                    users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.display_name} ({user.username})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* スキルマップ表示 */}
              {selectedUserId && (
                <div>
                  <SkillMappingView
                    userId={selectedUserId}
                    readOnly={true}
                    allowUnlink={true}
                    highlightedSkillIds={highlightedSkillIds}
                    onHighlightSkills={(materialTitle) => {
                      setSearchTerm(materialTitle);
                    }}
                    onMaterialClick={(material) => {
                      setSelectedMaterial(material);
                      setIsMaterialModalOpen(true);
                    }}
                  />
                </div>
              )}

              {!selectedUserId && !usersLoading && users.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    ユーザーが見つかりません
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'heatmap' && (
            <div className="space-y-6">
              {/* 部署フィルタ */}
              {heatMapData && heatMapData.users.length > 0 && (() => {
                const departments = Array.from(new Set(heatMapData.users.map(u => u.department).filter(Boolean))) as string[];
                if (departments.length > 0) {
                  return (
                    <DepartmentFilter
                      departments={departments}
                      selectedDepartment={selectedDepartment}
                      onDepartmentChange={setSelectedDepartment}
                    />
                  );
                }
                return null;
              })()}

              {/* 統計カード */}
              {heatMapData && (() => {
                const filteredUsers = selectedDepartment === 'all'
                  ? heatMapData.users
                  : heatMapData.users.filter(u => u.department === selectedDepartment);
                const filteredUserIds = new Set(filteredUsers.map(u => u.id));
                const filteredData = heatMapData.data.filter(d => filteredUserIds.has(d.userId));

                // 統計データを計算
                const userMaxPhases = new Map<string, number[]>();
                for (const item of filteredData) {
                  if (!userMaxPhases.has(item.userId)) {
                    userMaxPhases.set(item.userId, []);
                  }
                  userMaxPhases.get(item.userId)!.push(item.maxPhase);
                }

                const userAveragePhases: number[] = [];
                for (const phases of userMaxPhases.values()) {
                  const avg = phases.reduce((sum, p) => sum + p, 0) / phases.length;
                  userAveragePhases.push(avg);
                }

                const totalAvg = userAveragePhases.length > 0
                  ? userAveragePhases.reduce((sum, p) => sum + p, 0) / userAveragePhases.length
                  : 0;

                const phaseDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                for (const item of filteredData) {
                  for (const [phase, count] of Object.entries(item.phaseBreakdown)) {
                    const phaseNum = parseInt(phase);
                    if (phaseNum >= 1 && phaseNum <= 5) {
                      phaseDistribution[phaseNum] += count;
                    }
                  }
                }

                const phase4Plus = userAveragePhases.filter(p => p >= 4).length;

                const stats = {
                  totalUsers: filteredUsers.length,
                  averagePhase: totalAvg,
                  phase4Plus,
                  department: selectedDepartment,
                  phaseDistribution,
                };

                return <StatsCards stats={stats} />;
              })()}

              {/* ヒートマップ */}
              {heatMapData && (() => {
                const filteredUsers = selectedDepartment === 'all'
                  ? heatMapData.users
                  : heatMapData.users.filter(u => u.department === selectedDepartment);
                const filteredUserIds = new Set(filteredUsers.map(u => u.id));
                const filteredData = heatMapData.data.filter(d => filteredUserIds.has(d.userId));

                return (
                  <SkillHeatMap
                    users={filteredUsers}
                    categories={heatMapData.categories}
                    data={filteredData}
                    loading={heatMapLoading}
                    onRefresh={fetchHeatMapData}
                  />
                );
              })()}

              {!heatMapData && !heatMapLoading && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">データがありません</p>
                </div>
              )}

              {heatMapLoading && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-6">
              {/* 検索欄とボタン */}
              <div className="flex items-start justify-between gap-4">
                {/* 検索欄（左側） */}
                <div className="flex-1 max-w-md relative">
                  <label htmlFor="skill-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ナレッジ検索（関連スキルをハイライト）
                  </label>
                  <div className="relative">
                    <input
                      id="skill-search"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ナレッジ名で検索..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                      </div>
                    )}
                    {searchTerm && !isSearching && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setHighlightedSkillIds(new Set());
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        aria-label="検索をクリア"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* メッセージ（絶対配置でレイアウトシフトを防ぐ） */}
                  {highlightedSkillIds.size > 0 && (
                    <p className="absolute top-full left-0 mt-1 text-xs text-green-600 dark:text-green-400">
                      {highlightedSkillIds.size}件のスキル項目がハイライトされています
                    </p>
                  )}
                </div>
                {/* ボタン（右側） */}
                <div className="flex gap-2 pt-7">
                {!isEditMode ? (
                  <>
                    <button
                      onClick={handleExport}
                      className="bg-green-500 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600 transition-colors"
                      title="データシートと表示シートの2シート構成でエクスポート"
                    >
                      Excelにエクスポート
                    </button>
                    <button
                      onClick={() => handleImport('display')}
                      className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-600 transition-colors"
                      title="表示シートからインポート（確認・軽微な編集用）"
                    >
                      Excel（表示シート）からインポート
                    </button>
                    <button
                      onClick={() => handleImport('data')}
                      className="bg-purple-500 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-600 transition-colors"
                      title="データシートからインポート（大量編集・データ検証用）"
                    >
                      Excel（データシート）からインポート
                    </button>
                    <button
                      onClick={handleEditModeToggle}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      編集モードに切り替え
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEditModeToggle}
                      className="bg-gray-500 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleCheck}
                      className="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-600 transition-colors"
                    >
                      チェック
                    </button>
                    <button
                      onClick={handleSave}
                      className="bg-green-500 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600 transition-colors"
                      disabled={isSaving}
                    >
                      {isSaving ? '同期中...' : '保存してDB同期'}
                    </button>
                  </>
                )}
                </div>
              </div>

              {/* エクセル形式表示テーブル */}
              <div className="overflow-x-auto mb-5">
                {!isEditMode ? (
                  <ExcelViewModeTable
                    data={items}
                    allowUnlink={true}
                    highlightedSkillIds={highlightedSkillIds}
                    onHighlightSkills={(materialTitle) => {
                      setSearchTerm(materialTitle);
                    }}
                    onMaterialClick={(material) => {
                      setSelectedMaterial(material);
                      setIsMaterialModalOpen(true);
                    }}
                  />
                ) : (
                  <EditModeTable
                    data={editItems}
                    onDataChange={handleEditDataChange}
                    newRows={newRows}
                    onNewRowsChange={setNewRows}
                    originalData={originalData}
                    errorRowIds={errorRowIds}
                    onRowOrderChange={setRowOrder}
                  />
                )}
              </div>

              {/* バリデーションエラー表示 */}
              {isEditMode && validationErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-700">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">バリデーションエラー</h3>
                  <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-y-auto">
                    {validationErrors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li>...他{validationErrors.length - 10}件のエラー</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* インポートプレビューモーダル */}
      <ImportPreviewModal
        isOpen={showImportPreviewModal}
        onClose={() => {
          setShowImportPreviewModal(false);
          setImportPreviewData(null);
          setImportFile(null);
        }}
        onConfirm={handleImportExecute}
        previewData={importPreviewData}
        isExecuting={isImporting}
      />

      {/* 新規項目・類似項目モーダル */}
      <NewItemsModal
        isOpen={showNewItemsModal}
        onClose={() => setShowNewItemsModal(false)}
        comparisonResult={comparisonResult}
      />

      {/* 保存確認モーダル */}
      <SaveConfirmModal
        isOpen={showSaveConfirmModal}
        onClose={() => {
          // モーダルを閉じる際は必ずisSavingをリセット
          setIsSaving(false);
          setShowSaveConfirmModal(false);
        }}
        onConfirm={handleConfirmSave}
        originalData={originalData}
        editedData={editItems}
        validationErrors={validationErrors}
        comparisonResult={comparisonResult}
        isSaving={isSaving}
      />

      {/* 資料詳細モーダル */}
      {selectedMaterial && (
        <MaterialModal
          material={selectedMaterial}
          isOpen={isMaterialModalOpen}
          onClose={() => {
            setIsMaterialModalOpen(false);
            setSelectedMaterial(null);
          }}
        />
      )}
    </div>
  );
}

