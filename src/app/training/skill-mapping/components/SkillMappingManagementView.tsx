// スキルマッピング管理ビューコンポーネント

'use client';

import { useState, useEffect } from 'react';
import FullscreenToggleButton from '@/components/FullscreenToggleButton';
import type { SkillPhaseItem as BaseSkillPhaseItem } from '@/shared/lib/data-access/skill-mapping';
import type { SkillPhaseItem, NewRow } from './types';
import ExcelViewModeTable from './ExcelViewModeTable';
import EditModeTable from './EditModeTable';
import SaveConfirmModal from './SaveConfirmModal';
import NewItemsModal from './NewItemsModal';
import ImportPreviewModal from './ImportPreviewModal';
import { validateData } from './validation';
import { compareData, type ComparisonResult } from './utils/compareData';

interface SkillMappingManagementViewProps {}

type TabType = 'view' | 'edit';

export default function SkillMappingManagementView({}: SkillMappingManagementViewProps) {
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

  // スキルマスタデータを取得
  useEffect(() => {
    fetchItems();
  }, []);

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
  const handleCheck = () => {
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
        alert('✓ チェック完了：エラーはありません。保存してDB同期できます。');
      }
    } else {
      alert(`✗ チェック結果：${result.errors.length}件のエラーが見つかりました。エラーを修正してください。`);
    }
  };

  // 保存ボタンのハンドラ
  const handleSave = () => {
    const currentData = editItems.length > 0 ? editItems : [];
    const result = validateData(currentData, newRows);
    
    if (result.errors.length > 0) {
      setValidationErrors(result.errors);
      setErrorRowIds(result.errorRowIds);
      alert(`✗ 保存できません：${result.errors.length}件のエラーがあります。先に「チェック」ボタンでエラーを確認してください。`);
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
        alert('データベースに同期しました');
      } else {
        alert(`同期に失敗しました: ${result.error || '不明なエラー'}`);
        setIsSaving(false);
      }
    } catch (error) {
      console.error('同期エラー:', error);
      alert('同期に失敗しました');
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

          alert('Excelファイルをエクスポートしました');
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

      alert('Excelファイルをエクスポートしました');
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
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
        alert('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
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
          alert(`エラー: サーバーエラーが発生しました。APIエンドポイントが正しく実装されているか確認してください。`);
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          if (result.details && Array.isArray(result.details)) {
            const errorMessage = `プレビューエラー：${result.error}\n\nエラー詳細：\n${result.details.slice(0, 10).join('\n')}${result.details.length > 10 ? `\n...他${result.details.length - 10}件のエラー` : ''}`;
            alert(errorMessage);
          } else {
            alert(`プレビューエラー：${result.error || '不明なエラーが発生しました'}`);
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
        alert('プレビュー中にエラーが発生しました。');
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
          alert(errorMessage);
        } else {
          alert(`インポートエラー：${result.error || '不明なエラーが発生しました'}`);
        }
        return;
      }

      if (result.success) {
        alert(result.message || `${result.importedCount || 0}件のデータをインポートしました`);
        setShowImportPreviewModal(false);
        setImportPreviewData(null);
        setImportFile(null);
        // データを再取得
        await fetchItems();
      } else {
        alert(`インポートエラー：${result.error || '不明なエラーが発生しました'}`);
      }
    } catch (error) {
      console.error('インポート実行エラー:', error);
      alert('インポート実行中にエラーが発生しました。');
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
            </div>
          </div>

          {/* タブコンテンツ */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* 空ページ（後で実装） */}
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  スキルマッピング確認ページは後で実装します。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'edit' && (
            <div className="space-y-6">
              {/* ボタン */}
              <div className="flex justify-end gap-2">
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

              {/* エクセル形式表示テーブル */}
              <div className="overflow-x-auto mb-5">
                {!isEditMode ? (
                  <ExcelViewModeTable data={items} />
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
    </div>
  );
}

