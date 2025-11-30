# 🔧 トラブルシューティング

環境構築から運用中に発生しやすい問題と対処方法をまとめています。問題が解決しない場合はページ末尾の「追加のサポート」を参照してください。

---

## 1. 環境構築時の問題

### 1.1 `better-sqlite3` のビルドエラー

**症状**: `npm install` 時に `Error: Cannot find module 'better-sqlite3'` や `gyp ERR! build error` が表示される。  
**対処**

1. Visual Studio 2022 以降 + C++ Build Tools が入っているか確認  
   - ワークロード: Desktop development with C++  
   - 必須コンポーネント: MSVC v143, Windows 10/11 SDK, C++ CMake tools for Windows
2. 管理者権限でコマンドプロンプトを開き `npm install` を再実行。
3. `npm cache clean --force` → `npm install`。
4. 成功すると `node_modules/better-sqlite3/build/Release/better_sqlite3.node` が生成される。

### 1.2 ポートが使用中で `EADDRINUSE`

```bash
# 3001 番で起動する
PORT=3001 npm run dev
# あるいは Next.js オプション
npm run dev -- -p 3001
```

Windows でポートを強制解放する場合:

```bash
netstat -ano | findstr :3000
taskkill /PID <プロセスID> /F
```

### 1.3 依存関係のバージョン不一致

```bash
rm package-lock.json
npm install
```

---

## 2. データベース関連

### 2.1 `SQLITE_BUSY`

- システムには線形バックオフ（50ms, 100ms, 150ms, 200ms）で最大 5 回リトライする仕組みがある。
- それでも解決しない場合は時間をおいて再試行し、ファイル権限/ロック状態を確認。
- ログは `users/{user_id_hash}/logs/sqlite_busy.log`（JSON Lines）。`/admin/logs` で統合閲覧可能。

### 2.2 DB ファイルが見つからない

1. 初回起動で `data/config/drive.json` を基に `{ドライブ}:\k_shot\shared\k_shot.db` が自動作成される。`/setup` で設定をやり直す。
2. 動作確認コマンド:

```bash
npm run check:db
npm run check:indexes
npm run migrate:csv-to-sqlite
tsx scripts/init-categories.ts
tsx scripts/set-role-change-password.ts <role> <password>
```

3. ネットワークドライブのアクセス権・パス・フォルダ存在を確認。
4. 初期化時にデフォルトカテゴリ/資料タイプ/難易度/権限パスワードが投入される。

### 2.3 復元が失敗する

- 復元前に `k_shot_backup_before_restore_{timestamp}.db` が自動作成される。  
- 復元後はページを再読み込みして接続を張り直す。  
- バックアップファイルの拡張子（`.db`）と書き込み権限を確認。

---

## 3. ネットワークドライブ関連

### 3.1 アクセスエラー

1. ドライブがマウントされているか、`data/config/drive.json` の UNC パスが正しいか確認。
2. 共有フォルダ権限・ファイアウォール設定を確認。
3. `/admin` → 「初期設定を再開」で再設定。

### 3.2 マウントに失敗する

- UNC パスは `\\server-name\share\` のように末尾 `\` を含める。
- Windows 認証が有効か、空きドライブレターがあるか、サーバーログにエラーがないかを確認。

### 3.3 ドライブ/ディレクトリが消えた

- システムが自動検知して `/setup` にリダイレクトする。  
- マウント状況と `k_shot` フォルダの有無を確認し、必要なら再設定する。

---

## 4. パフォーマンス問題

### 4.1 ページ読み込みが遅い

- ネットワークドライブ I/O が 300–800ms 程度かかる場合がある。初回アクセスは遅延しがち。
- マスターデータは 30〜60 分キャッシュされる。
- ブラウザキャッシュをクリアして再試行。データ量が増えた場合はページネーション/差分取得を検討。

### 4.2 API 呼び出しが重複する

- React StrictMode により開発環境では `useEffect` が 2 回走ることがある（本番では 1 回）。  
- `useRef` などで初回だけ実行したい処理を制御する。  
- Folders/Categories/Users コンテキストには重複リクエスト抑止ロジックあり。

---

## 5. TypeScript・ビルド関連

### 5.1 型エラー

```bash
npm run type-check
```

よくある例:

```ts
// 暗黙 any
const values: string[] = [];

// null → undefined へ揃える
const currentUserId = await getCurrentUserId();
if (!currentUserId) return;
const targetUserId: string = currentUserId;
```

### 5.2 本番ビルドでの失敗

1. `npm run build` が `✓ Finalizing page optimization` まで完了するか確認。
2. `.next` ディレクトリが生成されているか確認。
3. 失敗した場合はエラーを修正して再ビルド。

---

## 6. よくある質問 (FAQ)

### Q1. Node.js の推奨バージョンは？

> **A**: v18.17 以上（推奨 v20 LTS / v25）。better-sqlite3 はネイティブモジュールのため、開発と本番で同じバージョンを使ってください。

### Q2. バックアップ方法は？

> **A**: `/admin` から自動バックアップ（12:00–18:00 の任意時刻）を有効化可能。手動ダウンロードも可能で、`{ドライブ}:\k_shot\backups/` に保存。30 日超のファイルは自動削除。復元前に現行 DB をバックアップします。

### Q3. 複数ユーザーで同時利用できますか？

> **A**: はい。SQLite DELETE モードで運用しており、SMB 上でも動作確認済み。`SQLITE_BUSY` 発生時は自動リトライします。

### Q4. 初期設定画面が開かない

> **A**: キャッシュクリア → `data/config/drive.json` を削除 → `/setup` または `/setup?force=true` へ直接アクセス。

### Q5. データ増加時のパフォーマンスは？

> **A**: 現状はキャッシュや差分更新でカバーできています。将来的にはさらに最適化（ページネーションなど）を検討。ネットワークドライブの I/O が律速になる場合があります。

### Q6. エラーログの場所は？

> **A**: `users/{user_id_hash}/logs/errors.json`（JSON Lines）、`users/{user_id_hash}/logs/sqlite_busy.log`。管理者は `/admin/logs` で統合確認できます。ユーザーIDはハッシュ化されてディレクトリ名として使用されます。

### Q7. 「TOKEN_SECRET_KEYが設定されていません」という警告メッセージが表示される

> **A**: このメッセージは、デバイストークンの署名検証に使用するシークレットキーが環境変数として設定されていないことを示しています。  
> **ポータブル版での動作**: ポータブル版を配布する場合、この警告は無視して問題ありません。開発用の固定シークレットが自動的に使用され、実際の認証はデータベース管理に依存しているため、セキュリティ上の問題はありません。  
> **本番環境での設定（オプション）**: より強固なセキュリティが必要な場合は、環境変数 `TOKEN_SECRET_KEY` にランダムな文字列を設定してください。ただし、現状の設計では必須ではありません。

---

## 7. 追加のサポート

1. ログを確認: `users/{user_id_hash}/logs/errors.json` / `users/{user_id_hash}/logs/sqlite_busy.log`。
2. ドキュメント参照: `README.md`、ヘルプページ内の他のドキュメント（プロジェクト概要、設計・アーキテクチャなど）。
3. 解決しない場合はシステム管理者に連絡し、サーバーログやネットワーク設定を確認してもらってください。

---

困ったときは新しい事象・対処法をこのページに追記してください。

