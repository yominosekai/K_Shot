# 🏗️ 設計・ロジック資料

機能別モジュール構成、データアクセス層、キャッシュ、認証、ログ、バックアップなど、ナレッジ管理システム（K-Shot）の内部設計をまとめた技術者向けドキュメントです。

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
├── folder-helpers.ts
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
- `SQLITE_BUSY` エラーは各操作で最大 5 回リトライ（線形バックオフ: 50ms × リトライ回数）。リトライログは `shared/lib/database/busy-monitor.ts` で管理。

### 3.2 ファイルストア

- ゴミ箱: `data/trash/trash.csv` + `data/trash/{type}_{id}/`
- お気に入り: `users/{user_id_hash}/bookmarks.json`
- フィードバック詳細: `users/{user_id_hash}/feedback/feedback.json`
- ログ: `users/{user_id_hash}/logs/errors.json`、`users/{user_id_hash}/logs/sqlite_busy.log`

---

## 4. 認証システム

### 4.1 デバイストークン認証

- デバイストークン（証明ファイル）ベースの認証を採用。
- トークンファイルは `%APPDATA%/k-shot/credentials/device-token.json`（Windows）または `~/.k-shot/credentials/device-token.json`（その他）に保存。
- トークンは HMAC-SHA256 で署名され、`shared/lib/auth/device-token.ts` で検証。
- サーバー側で `getCurrentUserId()` によりユーザーIDを取得し、`users` テーブルと突合。
- ユーザー情報は `shared/lib/auth/session-cache.ts` でキャッシュし、`contexts/AuthContext` で管理。

#### 署名検証の仕組み

- 署名検証には環境変数 `TOKEN_SECRET_KEY` を使用します。
- `TOKEN_SECRET_KEY` が設定されていない場合、開発用の固定シークレット（`'development-token-secret'`）が使用されます。
- **ポータブル版での動作**: ポータブル版を配布する場合、環境変数を設定する必要はありません。固定シークレットが使用されますが、実際の認証はデータベースの `device_tokens` テーブルで管理されているため、セキュリティ上の問題はありません。
- **セキュリティモデル**: 主なセキュリティはデータベースでのトークン存在確認とステータス（active/revoked）管理に依存しており、署名検証はファイル改ざん検知の補助的な役割を果たします。

### 4.2 セッション

- セッションは Cookie ベースで管理（`features/auth/utils/session.ts` の `SessionManager`）。
- セッションデータは軽量化され、大きなデータ（アバターなど）は除外。
- クライアント側では `localStorage` に `k_shot_session` キーで保存（互換性のため）。
- 認証ミドルウェアは `shared/lib/auth/middleware.ts` の `requireAuth()` を使用。

---

## 5. キャッシュ機構

| 対象 | 仕組み |
| --- | --- |
| 資料一覧 / フォルダ | `shared/hooks/useMaterialsCache.ts`。メモ化 + 失効時間（3 分）、最大キャッシュ数 50 件 |
| カテゴリ一覧 | `shared/lib/data-access/materials.ts` 内の変動チェック方式キャッシュ（MAX(created_date) で変動検知） |
| Notifications | ポーリング結果を `useNotificationPolling` 内で保持 |
| Materials Detail | `useMaterialsPage` の `cache` フィールド |
| 認証情報 | `shared/lib/auth/session-cache.ts` でユーザー情報をキャッシュ |

> 📝 `cache.clearCache()` は、データ更新時（資料アップロード/削除など）に必ず呼び出す。

---

## 6. ネットワークドライブ設定

- 初期設定 `/setup` で UNC パス & ドライブレターを指定。
- 設定は `data/config/drive.json` へ保存（`shared/lib/utils/drive-config.ts` で管理）。
- マウントは `/api/setup/mount` API から直接 `net use {drive}: "{path}" /persistent:yes` コマンドを実行（`src/app/api/setup/mount/route.ts`）。
- 設定変更時はキャッシュと DB 接続を再初期化。

---

## 7. ログシステム

- `shared/lib/logger/index.ts` で JSON Lines 形式のファイルログを出力。
- ERROR レベルのログのみファイルに出力（`users/{user_id_hash}/logs/errors.json`）。
- ログレベルは環境変数 `LOG_LEVEL` で制御可能（DEBUG/INFO/WARN/ERROR、デフォルトは INFO）。
- 開発環境では自動的に DEBUG レベルが有効化。
- SQLITE_BUSY エラーのログは `users/{user_id_hash}/logs/sqlite_busy.log` に記録（`shared/lib/database/busy-monitor.ts`）。
- 管理者画面 `/admin/logs` から検索・フィルタリングが可能。

---

## 8. バックアップ機能

- **自動バックアップ** … ブラウザベースの自動バックアップ（`shared/hooks/useAutoBackup.ts`）。指定時間帯（12:00-18:00）の指定時刻（±30分以内）に `/api/admin/backup/auto` を呼び出し、`{ドライブ}:\k_shot\shared\k_shot.db` を `{ドライブ}:\k_shot\backups/` ディレクトリにコピー。30日以上古いバックアップは自動削除。
- **手動バックアップ/復元** … `/admin/database` から `.db` ファイルをダウンロード、アップロード → `/api/admin/backup/restore` でリストア。
- 設定値は `localStorage` に保存（`shared/lib/utils/backup-settings.ts`）。

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

- `useMemo/useCallback` で高頻度コンポーネントをメモ化。
- `better-sqlite3` でプリペアドステートメントを使い、同一クエリを再利用。
- 画像アップロードは `Promise.all` で並列化、プログレスバーをリアルタイム更新。

---

## 12. 実装済み機能のロジック概要

### 12.1 資料アップロード

1. UI でファイル選択 → `POST /api/materials/upload`
2. サーバ側で `formData` から `arrayBuffer()` でファイルデータを取得し、`writeFile` で保存
3. DB へメタデータ挿入、キャッシュを無効化
4. 成功応答とともにプログレスバー完了

### 12.2 ゴミ箱処理

1. `moveToTrash()` で対象を `data/trash/` へコピー、CSV メタを更新
2. 復元時は `restoreFolderRecursive()` がフォルダ階層ごとに再帰的に復元
3. 競合があれば新しいIDを生成して復元、またはエラーメッセージを表示

### 12.3 コメント

- 階層構造は `parent_comment_id` を持つテーブルで管理。
- 返信は再帰関数 `buildReplies()` で階層構造を構築し、`CommentItem` コンポーネントが再帰的に表示。
- プライベートコメントは `is_private` フラグでフィルタ（コメント作成者と資料作成者のみ閲覧可能）。

---

## 13. テスト指針

- `shared/lib/data-access` の各モジュールは `__tests__` で最低 1 件以上のユニットテストを保持。
- E2E は今後 Playwright を予定。
- DB 操作テストは `test-data/` の一時ファイルを使い、実運用 DB に影響を与えないようにする。

---

この資料は随時更新されます。実装で得た知見や設計変更は、該当セクションに追記してください。

