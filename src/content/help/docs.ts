export type ManualDocDefinition = {
  id: string;
  title: string;
  description: string;
  file: string;
};

export const manualDocs: ManualDocDefinition[] = [
  {
    id: 'user-manual',
    title: '利用者マニュアル',
    description: '日常のオペレーションや画面操作を詳しく解説します。',
    file: 'src/content/help/user-manual.md',
  },
];

export const getManualDocById = (id?: string): ManualDocDefinition => {
  if (!id) {
    return manualDocs[0];
  }

  return manualDocs.find((doc) => doc.id === id) ?? manualDocs[0];
};

