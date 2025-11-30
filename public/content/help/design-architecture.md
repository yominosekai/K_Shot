# 🏗️ 設計・ロジック資料

機能別モジュール構成、データアクセス層、キャッシュ、認証、ログ、バックアップなど、学習管理システムの内部設計をまとめた技術者向けドキュメントです。

---

## 1. 設計方針

### 1.1 機能別モジュール化（Feature-based）

```
features/
├── auth/
│   ├── api/      # 認証APIロジック
│   ├── utils/    # セッション等のユーティリティ
│   └── types.ts
├── materials/
│   └── types.ts
├── comments/
│   └── types.ts
└── notifications/
    └── types.ts
```

- 各機能が独立開発・テスト可能。
- 依存関係が明確になり、コンポーネント間の結合が緩やか。

### 1.2 データアクセス層の分離

`old` システムの `data.ts`（2600行）を、機能単位のファイルへ分割。

```
shared/lib/data-access/
├── users.ts
├── materials.ts
├── folders.ts
├── bookmarks.ts
├── comments.ts
├── notifications.ts
├── trash.ts
├── feedback.ts
├── system-config.ts
├── material-revisions.ts
└── likes.ts
```

- 各ファイルは 200–300 行を上限目安。
- SRP（Single Responsibility Principle）と循環参照の回避を徹底。

---

## 2. 設計原則

1. **単一責任** … 1 ファイル 1 役割。複雑化しそうな場合はモジュールを分割する。
2. **型安全性** … TypeScript + Zod/独自型でエッジケースを吸収。
3. **読みやすさ** … 命名・コメント・ドキュメントで背景を明示（PR 時に背景リンク必須）。
4. **冪等性** … DB/ファイル更新は同一操作の再実行でも整合が取れるよう設計。

---

## 3. データ構造

### 3.1 SQLite

- `better-sqlite3` を採用。トランザクションが早く、SMB 上でも安定する DELETE ジャーナルを利用。
- `foreign_keys = ON`。
- `SQLITE_BUSY` は最大 5 回リトライ（指数バックオフ）。

### 3.2 ファイルストア

- ゴミ箱: `data/trash/trash.csv` + `data/trash/{type}_{id}/`
- お気に入り: `users/{SID}/bookmarks.json`
- フィードバック詳細: `users/{SID}/feedback/feedback.json`

---

## 4. 認証システム

### 4.1 Windows SID 認証

- Node 側で `os.userInfo().username` と SID を取得し、`users` テーブルと突合。
- ユーザー情報は `contexts/UsersContext` でキャッシュし、`useUsers()` から取得。

### 4.2 セッション

- セッショントークンはブラウザ `localStorage` 管理。
- API アクセス時に `authorization` ヘッダーへ付与し、`validateSession()` で検証。

---

## 5. キャッシュ機構

| 対象 | 仕組み |
| --- | --- |
| 資料一覧 / フォルダ | `shared/lib/cache/materials-cache.ts`。メモ化 + 失効時間（5 分） |
| Notifications | ポーリング結果を `useNotificationPolling` 内で保持 |
| Materials Detail | `useMaterialsPage` の `cache` フィールド |

> 📝 `cache.clear()` は、データ更新時（資料アップロード/削除など）に必ず呼び出す。

---

## 6. ネットワークドライブ設定

- 初期設定 `/setup` で UNC パス & ドライブレターを指定。
- 設定は `data/config/drive.json` へ保存。
- `net use {drive} {path}` を `scripts/mount-drive.ps1` から実行。
- 設定変更時はキャッシュと DB 接続を再初期化。

---

## 7. ログシステム

- `shared/lib/logger.ts` で JSON Lines 形式のファイルログを出力。
- ログ種別（info/warn/error）でファイルを分割。
- 管理者画面 `/admin/logs` から検索・フィルタリングが可能。

---

## 8. バックアップ機能

- **自動バックアップ** … 指定時間に Windows タスクスケジューラを実行し、`scripts/backup-database.ts` で `shared/learning_management.db` を圧縮。
- **手動バックアップ/復元** … `/admin/database` から ZIP ダウンロード、アップロード → リストア。
- 設定値は `system_config` の `backup` セクションに保存。

---

## 9. テーマシステム

- Tailwind の `dark` クラスを使用。
- `contexts/ThemeContext` で `theme` を管理。`localStorage` に持続。
- 目次パネルやカードも `dark:` プレフィクスで色を切り替え。

---

## 10. Windows 通知

- `Notification.requestPermission()` で許可を取得。
- `useNotificationPolling` が新着通知を検知したら、`new Notification()` を発火。
- クリック時は `/notifications` モーダルを開くようハンドラを付与。

---

## 11. パフォーマンス最適化

- `React.lazy` と `next/dynamic` で大型モジュール（グラフ、モーダル）を遅延ロード。
- `useMemo/useCallback` で高頻度コンポーネントをメモ化。
- `better-sqlite3` でプリペアドステートメントを使い、同一クエリを再利用。
- 画像アップロードは `Promise.all` で並列化、プログレスバーをリアルタイム更新。

---

## 12. 実装済み機能のロジック概要

### 12.1 資料アップロード

1. UI でファイル選択 → `POST /api/materials/upload`
2. サーバ側で `multer` 互換のストリーム処理 → ファイル保存
3. DB へメタデータ挿入、キャッシュを無効化
4. 成功応答とともにプログレスバー完了

### 12.2 ゴミ箱処理

1. `moveToTrash()` で対象を `data/trash/` へコピー、CSV メタを更新
2. 復元時は `restoreRecursively()` がフォルダ階層ごとに再配置
3. 競合があればリネーム or ユーザーにダイアログ表示

### 12.3 コメント

- 階層構造は `parent_comment_id` を持つテーブルで管理。
- 返信は DFS で取得し、`CommentTree` コンポーネントに渡す。
- プライベートコメントは `is_private` フラグでフィルタ。

---

## 13. テスト指針

- `shared/lib/data-access` の各モジュールは `__tests__` で最低 1 件以上のユニットテストを保持。
- E2E は今後 Playwright を予定（`documents/TESTING_GUIDE.md` を参照）。
- DB 操作テストは `test-data/` の一時ファイルを使い、実運用 DB に影響を与えないようにする。

---

この資料は随時更新されます。実装で得た知見や設計変更は、該当セクションに追記してください。

