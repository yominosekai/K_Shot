export type ManualDocDefinition = {
  id: string;
  title: string;
  description: string;
  file: string;
  adminOnly?: boolean; // 管理者のみ表示
};

// 管理者専用ドキュメントIDのリスト
export const ADMIN_ONLY_DOC_IDS = [
  'project-overview',
  'design-architecture',
  'troubleshooting',
  'concerns-improvements',
] as const;

export const manualDocs: ManualDocDefinition[] = [
  {
    id: 'user-manual',
    title: '利用者マニュアル',
    description: '日常のオペレーションや画面操作を詳しく解説します。',
    file: 'src/content/help/user-manual.md',
    adminOnly: false,
  },
  {
    id: 'project-overview',
    title: 'プロジェクト理解資料',
    description: 'アーキテクチャやディレクトリ構造など、全体像を俯瞰できます。',
    file: 'src/content/help/project-overview.md',
    adminOnly: true,
  },
  {
    id: 'design-architecture',
    title: '設計・ロジック資料',
    description: 'モジュール構成やデータアクセス、ロギング設計などを整理しています。',
    file: 'src/content/help/design-architecture.md',
    adminOnly: true,
  },
  {
    id: 'troubleshooting',
    title: 'トラブルシューティング',
    description: '環境構築やビルド、DB関連のエラー対処をまとめています。',
    file: 'src/content/help/troubleshooting.md',
    adminOnly: true,
  },
  {
    id: 'concerns-improvements',
    title: '懸念事項・改善点',
    description: 'リファクタリング進捗やパフォーマンス・セキュリティに関するメモです。',
    file: 'src/content/help/concerns-improvements.md',
    adminOnly: true,
  },
];

export const getManualDocById = (id?: string): ManualDocDefinition => {
  if (!id) {
    return manualDocs[0];
  }

  return manualDocs.find((doc) => doc.id === id) ?? manualDocs[0];
};

/**
 * 管理者専用ドキュメントかどうかをチェック
 * @param docId ドキュメントID
 * @returns 管理者専用の場合はtrue
 */
export function isAdminOnlyDoc(docId: string): boolean {
  return ADMIN_ONLY_DOC_IDS.includes(docId as typeof ADMIN_ONLY_DOC_IDS[number]);
}

/**
 * 権限に応じてドキュメントをフィルタリング
 * @param docs ドキュメント配列
 * @param isAdmin 管理者かどうか
 * @returns フィルタリングされたドキュメント配列
 */
export function filterDocsByPermission(
  docs: ManualDocDefinition[],
  isAdmin: boolean
): ManualDocDefinition[] {
  if (isAdmin) {
    return docs; // 管理者は全ドキュメントにアクセス可能
  }
  return docs.filter((doc) => !doc.adminOnly); // 一般ユーザーは管理者専用以外
}

