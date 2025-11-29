# 📖 利用者マニュアル

学習管理システムで利用者が日常的に行う操作をまとめています。画面のスクリーンショットは `/help/images/user-manual/` 配下に保存されています。

---

## 1. ログイン方法

このシステムは Windows 認証を使用しています。初回アクセス時に自動的にログインされます。

![ログイン画面](/help/images/user-manual/login-main.png)

### 初回アクセス時の手順

1. ブラウザでシステムにアクセス
2. Windows 認証が自動実行
3. 初期設定画面が表示される（後述）
4. 設定完了後にホーム画面へ遷移

> 💡 **メモ**  
> 初回起動時は、ネットワークドライブ設定が必要です。初期設定画面でネットワークパスとドライブレターを設定してください。

### 1.1 初期設定画面

初回起動時に `/setup` が表示されます。

#### 初期設定の流れ

1. **ネットワークパスを入力**
   - UNC パス（例: `\\server-name\share\` / `\\192.168.1.100\share\`）
   - `learning-management-system` フォルダ名は含めない
   - 末尾のバックスラッシュは必須
2. **ドライブレターを選択**
   - 利用可能なドライブレターが一覧表示
   - 既存フォルダありの場合は `(既存フォルダあり)` と表示
3. **マウントを実行**
   - 「マウント」ボタンで `net use` を実行
   - Windows 認証を利用するため追加の認証は不要
4. **フォルダの確認・作成**
   - `{ドライブレター}:\learning-management-system` の存在を確認
   - 無い場合は「フォルダを自動作成する」にチェック
5. **設定を保存**
   - `data/config/drive.json` に保存
   - 保存後にキャッシュクリア＆ホームへリダイレクト

> ⚠️ **重要**  
> ネットワークパスを変更したい場合は設定ページ（`/admin`）から「初期設定を再開」を選択して再設定します。

---

## 2. ホーム画面の使い方

ホーム画面では概要とクイックアクセスが提供されます。

![ホーム画面](/help/images/user-manual/home-main.png)

### 2.1 閲覧履歴

最近閲覧した資料を表示。各項目の ✕ ボタンで個別削除が可能。

![閲覧履歴](/help/images/user-manual/home-history.png)

### 2.2 新規・変更されたナレッジ

最近追加・更新されたナレッジを一覧表示。クリックで詳細モーダルを開きます。

![新着ナレッジ](/help/images/user-manual/home-recent-materials.png)

### 2.3 404 エラー時の検索補助

資料が見つからない場合は確認ダイアログが出現。「検索しますか？」で「はい」を選ぶとヘッダー検索欄にキーワードが入力され検索画面へフォーカスが移動します。

![404 検索誘導](/help/images/user-manual/home-404.png)

---

## 3. ナレッジ

学習資料の閲覧・検索・アップロードに対応しています。

![ナレッジ画面](/help/images/user-manual/materials-main.png)

### 3.1 階層表示

フォルダ構造で資料を閲覧可能。

![階層表示](/help/images/user-manual/materials-browse.png)

### 3.2 検索機能

タイトルや説明を対象にリアルタイム検索。

![検索画面](/help/images/user-manual/materials-search.png)

#### 3.2.1 フィルター

- **すべて / お気に入り**: 対象資料の切り替え  
- **フィルターボタン**: カテゴリやタイプで絞り込み

### 3.3 グリッド / リスト表示

表示スタイルを切り替え可能。最後の選択が記憶されます。

![表示切替](/help/images/user-manual/materials-view-toggle.png)

### 3.4 資料のアップロード

Web UI からアップロードし、プログレスバーで進捗を表示。

![アップロード](/help/images/user-manual/materials-upload.png)

### 3.5 資料の閲覧

資料をクリックすると詳細モーダルが開き、Markdown本文・添付ファイルの閲覧/ダウンロードが可能。

![資料詳細](/help/images/user-manual/materials-detail.png)

#### 3.5.1 右クリックメニュー

- ダウンロード（ZIP）
- 編集
- リンクをコピー
- 移動
- ファイル情報
- 通知を送信
- ゴミ箱に移動

> 💡 **メモ**  
> 編集・削除は作成者のみ可能。他ユーザーの資料は閲覧専用です。

![右クリックメニュー](/help/images/user-manual/materials-context-menu.png)

### 3.6 フォルダ管理

右クリックから以下を操作可能。

- 新規フォルダ作成（空スペースを右クリック）
- フォルダ名変更
- フォルダ移動
- プロパティ表示
- 削除（ゴミ箱へ移動）
- リンクをコピー

![フォルダ管理](/help/images/user-manual/materials-folder-management.png)

### 3.7 お気に入り・いいね

資料へお気に入り・いいねを付与。数値を表示。

![お気に入り/いいね](/help/images/user-manual/materials-favorites.png)

---

## 4. メンバー管理

メンバー一覧と詳細モーダルを提供。

![メンバー一覧](/help/images/user-manual/members-main.png)

### 4.1 メンバー詳細

プロフィール、スキル、資格などを確認可能。

![メンバー詳細](/help/images/user-manual/members-detail.png)

---

## 5. 通知機能

新着通知はヘッダーのアイコンにバッジ表示されます。

![通知アイコン](/help/images/user-manual/notifications-icon.png)

### 5.1 通知一覧

通知アイコンをクリックするとモーダルで未読/既読を確認できます。

![通知一覧](/help/images/user-manual/notifications-list.png)

### 5.2 Windows 通知

新着時に OS 通知を表示。クリックでモーダルを開きます。

![Windows 通知](/help/images/user-manual/notifications-windows.png)

> 💬 **通知許可**  
> 初回アクセス時にブラウザから通知許可を求められます。拒否してもアプリ内通知は利用可能ですが、Windows 通知は表示されません。

### 5.3 通知の管理

既読/未読の切り替えや削除を個別・一括で実行。

![通知管理](/help/images/user-manual/notifications-management.png)

### 5.4 通知の送信

資料一覧で右クリック → 「通知」からユーザーを指定してメッセージ送信。複数宛先も可能。

![通知送信](/help/images/user-manual/notifications-send.png)

### 5.5 通知ポーリング間隔

設定ページ `/admin` で以下を選択できます。

- 即座（ページ表示時/フォーカス時のみ）
- 1分 / 5分（推奨） / 10分 / 30分

> ℹ️ **接続状態表示**  
> ポーリング結果を利用してヘッダー右上に Live / Dead / Inactive を表示します。ポーリング 0（即座）の場合は Inactive。

---

## 6. 設定変更

`/admin` で各種設定を管理します。

![設定トップ](/help/images/user-manual/settings-main.png)

### 6.1 通知設定

通知頻度（即座/1/5/10/30 分）を切り替え。

![通知設定](/help/images/user-manual/settings-notifications.png)

### 6.2 データ管理

閲覧履歴・検索履歴をクリア。

![データ管理](/help/images/user-manual/settings-data.png)

### 6.3 アカウント管理（管理者）

ユーザー一覧、権限変更、アカウント削除が可能。

![アカウント管理](/help/images/user-manual/settings-accounts.png)

### 6.4 自動バックアップ設定（管理者）

スケジュールや保存先を設定。

![バックアップ設定](/help/images/user-manual/settings-backup-config.png)

### 6.5 バックアップ・復元（管理者）

手動バックアップと復元に対応。

![バックアップ復元](/help/images/user-manual/settings-backup-restore.png)

### 6.6 ネットワークドライブ設定

現在の設定確認や初期設定の再開が可能。

![ドライブ設定](/help/images/user-manual/settings-drive.png)

### 6.7 データベース編集（管理者）

`/admin/database` でテーブルの閲覧・編集・追加・削除を実行。

![DB 編集](/help/images/user-manual/settings-database.png)

### 6.8 エラーログ確認（管理者）

`/admin/logs` でエラーログや SQLITE_BUSY ログを統合管理。ログ種別・ユーザー・期間・キーワードでフィルター可能。

![ログ確認](/help/images/user-manual/settings-logs.png)

---

## 7. ゴミ箱機能

削除した資料やフォルダはゴミ箱へ移動。

![ゴミ箱](/help/images/user-manual/trash-main.png)

### 7.1 移動

右クリック → 「ゴミ箱に移動」。プログレスバーで進捗を表示。

![移動操作](/help/images/user-manual/trash-move.png)

### 7.2 復元

ゴミ箱から復元すると、子フォルダや資料も再帰的に復元。

![復元操作](/help/images/user-manual/trash-restore.png)

### 7.3 完全削除

復元せず完全削除も可能。

![完全削除](/help/images/user-manual/trash-delete.png)

---

## 8. グローバル検索

ヘッダーの検索欄から資料・メンバーを一括検索。

![検索バー](/help/images/user-manual/search-main.png)

### 8.1 リアルタイム候補

入力に応じて候補をリアルタイム表示。

![検索候補](/help/images/user-manual/search-suggestions.png)

### 8.2 検索履歴

最大 10 件を保存し、履歴から再検索できます。

![検索履歴](/help/images/user-manual/search-history.png)

### 8.3 直接モーダル表示

候補をクリックすると画面遷移せずモーダルを開きます。

![検索モーダル](/help/images/user-manual/search-result-modal.png)

---

## 9. コメント機能

資料詳細モーダルからコメント投稿が可能。添付ファイルやスレッド表示に対応。

![コメント一覧](/help/images/user-manual/comments-main.png)

### 9.1 コメント投稿

入力後に送信。添付ファイルも追加可能。

![コメント投稿](/help/images/user-manual/comments-post.png)

### 9.2 階層表示

返信でスレッド表示。

![階層コメント](/help/images/user-manual/comments-thread.png)

### 9.3 プライベートコメント

自分のみ閲覧できるコメントを保存可能。

![プライベートコメント](/help/images/user-manual/comments-private.png)

---

## 10. お気に入り機能

お気に入り登録や一覧管理を提供します。

![お気に入り](/help/images/user-manual/favorites-main.png)

### 10.1 登録

資料詳細または一覧からお気に入りボタンを押して登録。件数を表示。

![お気に入り登録](/help/images/user-manual/favorites-add.png)

### 10.2 解除

再度クリックすると解除。

![お気に入り解除](/help/images/user-manual/favorites-remove.png)

### 10.3 お気に入り一覧

`/favorites` で登録資料を一覧表示。カード/リスト切り替えや検索が可能。

![お気に入り一覧](/help/images/user-manual/favorites-list.png)

---

## 11. 全体状況ページ

`/overview` で統計情報やアクティビティ推移を確認。

![全体状況](/help/images/user-manual/overview-main.png)

### 11.1 主要指標カード

資料数・ユーザー数・カテゴリ数などの主要指標をカード表示。

![主要指標](/help/images/user-manual/overview-stats.png)

### 11.2 アクティビティグラフ

ユーザー/資料アクティビティをグラフ表示。期間（7/30/90/365日）と粒度（日次/週次/月次）を切替可能。

![アクティビティ](/help/images/user-manual/overview-activity.png)

### 11.3 カテゴリ/タイプ別グラフ

カテゴリやタイプごとの統計を表示。

![カテゴリ/タイプ](/help/images/user-manual/overview-category-type.png)

### 11.4 資料ランキング

いいね・お気に入り・閲覧数でランキング表示。

![ランキング](/help/images/user-manual/overview-rankings.png)

---

## 12. プロフィール編集

`/profile` からプロフィールを編集。

![プロフィール](/help/images/user-manual/profile-main.png)

### 12.1 基本情報

表示名・メール・部署・自己紹介などを編集。

![基本情報](/help/images/user-manual/profile-basic.png)

### 12.2 アバター編集

画像をアップロードしクロップして保存。PNG 透過に対応。

![アバター](/help/images/user-manual/profile-avatar.png)

### 12.3 スキル/資格/MOS 管理

リスト形式で追加・削除が可能。

![スキル管理](/help/images/user-manual/profile-skills.png)

---

## 13. フィードバック機能

`/feedback` でシステムへのフィードバックを投稿。

![フィードバック](/help/images/user-manual/feedback-main.png)

### 13.1 投稿

内容を入力し公開/非公開を指定して送信。公開フィードバックは他ユーザーにも表示。

![フィードバック投稿](/help/images/user-manual/feedback-post.png)

### 13.2 管理（管理者）

`/admin/feedback` で全フィードバックを管理。ステータス変更や公開設定が可能。

![フィードバック管理](/help/images/user-manual/feedback-admin.png)

---

## 14. 接続状態表示

ヘッダー右上に Live / Dead / Inactive を表示し、通知ポーリングでリアルタイム監視します。

![接続状態](/help/images/user-manual/connection-status.png)

### 14.1 状態の種類

- **Live**: 通知ポーリング成功
- **Dead**: 通知ポーリング失敗
- **Inactive**: ポーリング間隔 0（即座）

> 💡 **メモ**  
> 接続状態は通知ポーリングの結果を基に判定されます。即座に設定した場合は Inactive となります。