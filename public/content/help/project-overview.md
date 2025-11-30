# 🔍 プロジェクト理解資料

学習管理システムの全体像、採用技術、主要機能、開発フローをまとめています。新規参画時のオリエン資料として参照してください。

---

## 1. プロジェクト概要

このリポジトリ（`learning-management-system`）は、UI だけだった `sample-learning-management-system` を土台に、`old-learning-management-system` で実装済みの機能群を移植し、実運用を想定した新システムへ作り直す計画です。

### 1.1 目的

- **メンテナンス性**: 役割単位にディレクトリを分け、将来のリファクタリングを最小限にする。
- **わかりやすさ**: 機能ごとに責務を分割し、学習コストを抑える。
- **属人化の回避**: マニュアルとドキュメントを体系化し、背景知識を共有資産にする。
- **実用性**: Windows 認証やネットワークドライブなど、現場要件を満たす仕組みを提供する。

### 1.2 既存システムとの関係

| リポジトリ | 役割 |
| --- | --- |
| `old-learning-management-system` | 機能実装済み・挙動確認用。移植元として参照 |
| `sample-learning-management-system` | UI サンプル（ガワ）。コンポーネント構造のベース |
| `learning-management-system` | 本プロジェクト。UI/ロジック/データストアを統合し実運用に耐える構成へ |

---

## 2. 技術スタック

| レイヤー | 採用技術 |
|:---------|:---------|
| **フロントエンド** | Next.js 15.1.0<br>React 19.0.0<br>TypeScript 5.7.0<br>Tailwind CSS 3.4.17 |
| **データストレージ** | SQLite (better-sqlite3 11.10.0)<br>ファイルベース (JSON/CSV) |
| **プラットフォーム** | Windows 10/11<br>Node.js v18.17以上（推奨: v20.x LTS または v25.x） |
| **スタイリング** | Tailwind CSS 3.4.17<br>PostCSS 8.4.47<br>Autoprefixer 10.4.20 |
| **UIコンポーネント・ライブラリ** | Lucide React 0.468.0（アイコン）<br>React Markdown 10.1.0（Markdownレンダリング）<br>Remark Breaks 4.0.0（Markdown改行処理）<br>Recharts 3.3.0（グラフ表示）<br>React Easy Crop 5.5.3（画像クロップ） |
| **テスト** | Vitest 2.1.8（テストフレームワーク）<br>@vitest/ui 2.1.9（テストUI）<br>@vitest/coverage-v8 2.1.8（カバレッジ）<br>@testing-library/react 16.1.0<br>@testing-library/jest-dom 6.6.3<br>jsdom 25.0.1（DOMエミュレーション） |
| **その他** | ログ: ファイルベース (JSON Lines形式)<br>認証: Windows SID認証<br>UUID 13.0.0（一意識別子生成）<br>ADM-Zip 0.5.16（ZIPファイル処理）<br>TSX 4.19.2（TypeScriptファイルの直接実行） |

---

## 3. ディレクトリ構造

プロジェクトの基本的な構造は以下の通りです：

```
learning-management-system/
├── src/                           # ソースコード
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API Routes（機能別に整理）
│   │   │   ├── activity/          # アクティビティAPI（ログイン記録、統計、同期）
│   │   │   ├── admin/             # 管理者API（バックアップ、データベース、ログ、フィードバック、システム設定）
│   │   │   ├── analytics/         # 統計API
│   │   │   ├── auth/              # 認証API
│   │   │   ├── debug/             # デバッグAPI
│   │   │   ├── departments/       # 部署API
│   │   │   ├── feedback/          # フィードバックAPI
│   │   │   ├── materials/         # 資料API（コメント、お気に入り、ダウンロード含む）
│   │   │   ├── notifications/     # 通知API
│   │   │   ├── profile/           # プロフィールAPI
│   │   │   ├── search/            # 検索API
│   │   │   ├── setup/             # 初期設定API
│   │   │   ├── trash/             # ゴミ箱API
│   │   │   ├── users/             # ユーザーAPI
│   │   │   └── version/           # バージョン情報API
│   │   ├── admin/                 # 管理者ページ
│   │   │   ├── database/          # データベース編集ページ
│   │   │   ├── feedback/          # フィードバック管理ページ
│   │   │   ├── logs/              # ログ閲覧ページ
│   │   │   └── page.tsx            # 設定ページ
│   │   ├── favorites/             # お気に入りページ
│   │   ├── feedback/               # フィードバックページ
│   │   ├── help/                   # ヘルプページ
│   │   ├── materials/              # ナレッジページ
│   │   ├── members/                # メンバー管理ページ
│   │   ├── overview/               # 全体状況ページ
│   │   ├── philosophy/             # 理念ページ
│   │   ├── profile/                # プロフィールページ
│   │   ├── setup/                  # 初期設定ページ
│   │   ├── trash/                  # ゴミ箱ページ
│   │   ├── version/                # バージョン情報ページ
│   │   └── page.tsx                # ホームページ
│   ├── components/                 # コンポーネント
│   ├── contexts/                   # React Context
│   ├── features/                   # 機能別モジュール
│   ├── shared/                     # 共通機能
│   ├── config/                     # 設定ファイル
│   ├── test/                       # テスト関連
│   ├── test-data/                  # テストデータ
│   └── types/                      # 型定義
├── data/                           # ローカルデータ（開発用）
│   ├── config/                     # 設定ファイル
│   ├── local/                      # ローカルデータ（アクティビティ集約DB等）
│   └── trash/                      # ゴミ箱データ
├── documents/                      # ドキュメント（Markdown形式）
├── memo/                           # メモ・議事録
├── scripts/                        # スクリプト（データベース初期化など）
├── dist-portable/                  # ポータブル版配布用
├── test-file-server/               # ファイルサーバーテスト用
├── trashbox/                       # 廃棄されたドキュメント
├── review/                         # レビューレポート
├── sample/                         # サンプルファイル
├── test-data/                      # テストデータ（SQLiteデータベースファイル）
├── coverage/                       # テストカバレッジレポート
└── public/                         # 静的ファイル
    └── manual/                     # マニュアル（HTML形式）
```

---

## 4. 主要機能

### 4.1 基本機能

- **認証**: Windows SID 認証で自動ログイン。
- **ホーム `/`**: 最近の資料、閲覧履歴、404 検索誘導。
- **ナレッジ `/materials`**: フォルダ階層、グリッド/リスト切替、ドラフト管理、Markdown 表示、添付ファイル操作、いいね/お気に入り/閲覧数、コメント。
- **お気に入り `/favorites`**: カード/リストビュー、キーワード検索、お気に入り解除。
- **全体状況 `/overview`**: 指標カード、アクティビティグラフ、カテゴリ・タイプ別分析、人気ランキング。
- **利用者一覧 `/members`**: プロフィール・スキル・資格の参照。
- **プロフィール `/profile`**: 基本情報編集、アバタートリミング、スキル/資格/MOS 管理。
- **ゴミ箱 `/trash`**: プログレスバー付きの移動/復元/完全削除（再帰復元・競合チェックあり）。

### 4.2 検索・通知

- **グローバル検索**: 履歴（最大10件）・リアルタイム候補・候補から直接モーダル表示・履歴削除。
- **通知システム**: Windows 通知、一覧モーダル、未読/既読管理、通知送信、バッジ表示。

### 4.3 管理者機能

- **設定 `/admin`**: ネットワークドライブ、通知ポーリング、バックアップ（自動/手動）、データクリア、アカウント管理。
- **DB 管理 `/admin/database`**: テーブル閲覧・編集・作成・削除。
- **ログ閲覧 `/admin/logs`**: エラー/SQLITE_BUSY ログの検索・フィルタリング。
- **フィードバック管理 `/admin/feedback`**: ステータス・公開設定・レスポンス管理。

### 4.4 その他

- **フィードバック `/feedback`**: 公開/非公開投稿。
- **ヘルプ `/help`**: ドキュメント閲覧。
- **バージョン `/version`**: 変更履歴・ビルド情報。
- **コメント機能**: 階層返信、添付ファイル、プライベートコメント、リアルタイム更新。

---

## 5. データベース

### 5.1 方針

- SQLite（`better-sqlite3`）。共有フォルダの `{ドライブ}:\learning-management-system\shared\learning_management.db` を参照。
- DELETE ジャーナルモード（SMB との相性優先）、`foreign_keys = ON`。
- `SQLITE_BUSY` は最大5回リトライ（指数バックオフ）。
- 初回起動で `initializeSchema()` が走り、カテゴリ/タイプ/難易度/権限パスワードなどを自動投入。

### 5.1.1 管理スクリプト

```bash
npm run check:db
npm run check:indexes
npm run migrate:csv-to-sqlite
tsx scripts/init-categories.ts
tsx scripts/set-role-change-password.ts <role> <password>
```

### 5.2 主なテーブル

`materials`, `material_revisions`, `folders`, `categories`, `departments`, `users`, `material_likes`, `material_views`, `user_activities`, `notifications`, `system_config`, `material_types`, `difficulty_levels`, `material_comments`, `feedback_metadata` など。

### 5.3 ファイル管理されるデータ

- **ゴミ箱**: メタデータは `data/trash/trash.csv`、実体は `data/trash/{type}_{trash_id}/`。
- **お気に入り**: `users/{SID}/bookmarks.json`。
- **フィードバック詳細**: `users/{SID}/feedback/feedback.json`（メタ情報は DB）。

### 5.4 移行履歴メモ

- 2025-11-09 … プロフィール JSON → `users`
- 2025-11-09 … 通知 JSON → `notifications`
- 2025-11-12 … 部署 / アクティビティ CSV → `departments` / `user_activities`

---

## 6. 開発環境

### 6.1 必須ツール

- Windows 10/11
- Node.js v18.17 以上（推奨 v20 LTS もしくは v25）
- npm / Git
- Visual Studio 2022 + C++ Build Tools（`Desktop development with C++` ワークロード）  
  → `SQLITE_SETUP.md` に詳細手順あり。

### 6.2 クイックスタート

```bash
git clone <repo> learning-management-system
cd learning-management-system
npm install
npm run dev   # http://localhost:3000
```

初回起動時は `/setup` が自動表示されるので、ネットワークパスとドライブレターを指定してください。保存と同時にキャッシュが初期化されホームへ遷移します。

### 6.3 テスト

```bash
npm test              # ウォッチモード
npm run test:run      # 1回だけ実行
npm run test:coverage # カバレッジ出力
npm run test:ui       # ブラウザUI
npm run test:watch    # ファイル監視
```

> カバレッジ: `@vitest/coverage-v8`、対象ファイル: `src/shared/lib/**/__tests__/`。セットアップは `src/test/setup.ts`。

### 6.4 DB 確認

```bash
npm run check:db
npm run check:indexes
npm run migrate:csv-to-sqlite
```

---

## 7. 設計原則

- 機能ごとのモジュール化と単一責任（1ファイル 300 行を目安）。
- データアクセス層を `shared/lib/data-access` に集約し、UI から切り離す。
- TypeScript による型安全性を最優先。
- 「リファクタリング不要」をゴールに、例外や暫定対応はコメントで明記。

---

## 8. 開発の進め方

1. **基盤整備**: ディレクトリ構成・設定ファイル・ロガー。
2. **認証実装**: Windows SID 認証・ユーザーコンテキスト。
3. **ダッシュボード**: ホーム／概要ページの実装。
4. **機能移植**: Materials / Favorites / Members / Trash などを順次。
5. **設定・管理系**: 管理画面・ログ・バックアップ・初期設定。

> 優先順位や詳細な設計ノートは `documents/DESIGN.md` にまとまっています。

