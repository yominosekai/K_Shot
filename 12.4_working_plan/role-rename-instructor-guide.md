# 権限名変更: 「教育者（instructor）」→「教育訓練」の影響範囲と所要時間

## 概要

現在の権限「教育者（instructor）」を「教育訓練」に変更する際の影響範囲と所要時間をまとめます。

## 英語表現の候補

「教育訓練」を英語にした場合の候補：

| 候補 | 説明 | 推奨度 |
|------|------|--------|
| `training` | Training のシンプルな表現。既存の `instructor` の意味に近く、短くて分かりやすい | ⭐⭐⭐ 推奨 |
| `education_training` | Education and Training の明確な表現だが長い | ⭐⭐ |
| `edu_training` | Education Training の短縮形 | ⭐⭐ |
| `instructor` | 既存の表現を維持（意味は変わらない） | ⭐ |

**推奨**: `training` （シンプルで分かりやすく、既存の `instructor`（教育者）の意味に最も近い）

## 影響範囲

### 1. データベース内の既存データ（重要）

**影響**: 既存ユーザーの `role = 'instructor'` を新しい権限名に変更する必要がある

**重要**: **データを削除する必要はありません！** 既存のデータは全てそのまま残ります。

**作業内容**:
- マイグレーションスクリプトの作成・実行
- `users` テーブルの `role` カラムの**値だけ**を更新: `'instructor'` → `'training'`（UPDATE文を使用）
- `system_config` テーブルのキー名を更新（既存のパスワードハッシュの値はそのまま移行）

**変更されるもの**:
- ✅ `users.role` カラムの値のみ（`'instructor'` → `'training'`）
- ✅ `system_config` テーブルのキー名のみ（値はそのまま移行）

**変更されないもの（全てそのまま残る）**:
- ✅ ユーザー情報（名前、メール、アバターなど）
- ✅ ナレッジ・資料データ
- ✅ コメント・通知
- ✅ その他すべてのデータ

**注意点**:
- **既存データへの影響があるため、バックアップ必須**（万が一のため）
- 本番環境では慎重に実行する必要がある
- マイグレーション中はシステムを停止するか、ダウンタイムを考慮

**影響箇所**: 
- `users` テーブル（既存ユーザーの role カラムの値のみ）
- `system_config` テーブル（パスワードハッシュのキー名のみ）

---

### 2. 型定義の更新（所要時間: 15-20分）

**ファイル**:
- `src/features/auth/types.ts` - `User` 型の `role` フィールド
- `src/shared/lib/data-access/users.ts` - 型アサーション

**作業内容**:
- `role: 'admin' | 'instructor' | 'user'` → `role: 'admin' | 'training' | 'user'`
- 型アサーションの更新: `as 'admin' | 'instructor' | 'user'` → `as 'admin' | 'training' | 'user'`

**影響箇所**: 2ファイル

---

### 3. 権限チェック関数の更新（所要時間: 30-40分）

**ファイル**:
- `src/features/auth/utils.ts` - `checkPermission()` 関数
- `src/shared/lib/auth/middleware.ts` - `hasPermission()`, `requireRole()`, `isInstructor()`, `requireInstructor()` 関数

**作業内容**:
- `checkPermission()` の switch 文: `case 'instructor':` → `case 'training':`
- 権限チェックロジック: `user.role === 'instructor'` → `user.role === 'training'`
- `hasPermission()` の型定義を更新
- `requireRole()` の型定義を更新
- `isInstructor()` 関数名は変更しない（後方互換性のため、内部実装のみ変更）
- `requireInstructor()` 関数名は変更しない（後方互換性のため、内部実装のみ変更）

**影響箇所**: 2ファイル

**注意点**:
- `isInstructor()` と `requireInstructor()` の関数名は変更しない（既存コードへの影響を最小化）
- 内部実装のみ変更: `hasPermission(user, 'training')` を呼び出す

---

### 4. UI表示の更新（所要時間: 40-50分）

**ファイル**:
- `src/components/UserCard.tsx` - `getRoleLabel()`, `getRoleColor()`
- `src/components/UserListItem.tsx` - `getRoleLabel()`, `getRoleColor()`
- `src/components/UserDetailModal.tsx` - `getRoleLabel()`, `getRoleColor()`
- `src/components/RoleChangeModal.tsx` - `getRoleLabel()`, 権限選択UI
- `src/components/AccountManagementModal.tsx` - `ROLE_LABELS`
- `src/components/members/components/RoleFilterButtons.tsx` - フィルターボタン

**作業内容**:
- `getRoleLabel()` のラベル: `instructor: '教育者'` → `training: '教育訓練'`
- `getRoleColor()` の色定義（変更不要、キー名のみ変更）
- `RoleChangeModal` の権限選択UI: `value="instructor"` → `value="training"`
- `RoleFilterButtons` のフィルターボタン: `onClick={() => onRoleChange('instructor')}` → `onClick={() => onRoleChange('training')}`

**影響箇所**: 6ファイル

---

### 5. 権限変更機能の更新（所要時間: 30-40分）

**ファイル**:
- `src/components/RoleChangeModal.tsx` - 権限選択UI、型定義
- `src/app/api/users/[id]/role/route.ts` - 権限バリデーション、パスワード検証

**作業内容**:
- `RoleChangeModal` の `newRole` の型: `'user' | 'instructor' | 'admin'` → `'user' | 'training' | 'admin'`
- API のバリデーション配列: `['user', 'instructor', 'admin']` → `['user', 'training', 'admin']`
- パスワード検証ロジック: `configKey = 'role_change_password_hash_instructor'` → `configKey = 'role_change_password_hash_training'`
- エラーメッセージ: `'教育者'` → `'教育訓練'`

**影響箇所**: 2ファイル

---

### 6. 権限変更パスワード管理の更新（所要時間: 30-40分）

**ファイル**:
- `src/shared/lib/database/schema.ts` - `ensureRoleChangePasswords()` 関数
- `src/components/RolePasswordChangeModal.tsx` - 権限選択ドロップダウン
- `src/app/api/admin/system-config/role-password/route.ts` - パスワード更新API
- `src/app/api/admin/system-config/role-password/check-default/route.ts` - デフォルトパスワードチェック

**作業内容**:
- `ensureRoleChangePasswords()` のキー名: `'role_change_password_hash_instructor'` → `'role_change_password_hash_training'`
- `RolePasswordChangeModal` の select: `<option value="instructor">教育者</option>` → `<option value="training">教育訓練</option>`
- API の型定義: `role: 'admin' | 'instructor'` → `role: 'admin' | 'training'`
- エラーメッセージ: `'教育者'` → `'教育訓練'`

**影響箇所**: 4ファイル

---

### 7. データベースマイグレーション（所要時間: 60-90分）

**作業内容**:
1. **マイグレーションスクリプトの作成**
   - `users` テーブルの `role` カラムを更新
   - `system_config` テーブルのキーを更新（既存のパスワードハッシュを新しいキーに移行）

2. **マイグレーションスクリプトの実行**
   - 開発環境でテスト
   - 本番環境で実行（バックアップ必須）

3. **動作確認**
   - 既存ユーザーの権限が正しく更新されているか確認
   - 権限変更パスワードが正しく移行されているか確認

**マイグレーションスクリプト例**:
```sql
-- トランザクション開始（エラー時はロールバック可能）
BEGIN TRANSACTION;

-- users テーブルの role カラムの値だけを更新（データは削除されない）
-- 例: role = 'instructor' のユーザーを role = 'training' に変更
UPDATE users SET role = 'training' WHERE role = 'instructor';

-- system_config テーブルのキーを更新
-- 既存のパスワードハッシュの値はそのまま新しいキーに移行
INSERT INTO system_config (key, value, updated_date, updated_by)
SELECT 'role_change_password_hash_training', value, updated_date, updated_by
FROM system_config
WHERE key = 'role_change_password_hash_instructor';

-- 古いキーを削除（オプション、新しいキーが正しく動作することを確認後）
DELETE FROM system_config WHERE key = 'role_change_password_hash_instructor';

-- コミット（問題なければ実行、問題があれば ROLLBACK）
COMMIT;
```

**重要なポイント**:
- `UPDATE` 文は既存のデータを**更新するだけ**で、削除しません
- ユーザー情報、ナレッジ、コメントなど、**すべてのデータはそのまま残ります**
- 変更されるのは `role` カラムの値（文字列）だけです
- トランザクションを使用することで、エラー時はロールバック可能です

**影響箇所**: 
- `users` テーブル（既存ユーザーの role カラム）
- `system_config` テーブル（パスワードハッシュのキー）

**注意点**:
- **バックアップ必須**
- トランザクションで実行（ロールバック可能にする）
- 本番環境では慎重に実行

---

### 8. その他の確認箇所（所要時間: 30-45分）

**確認が必要な箇所**:
- コメント内の `instructor` 参照
- ログメッセージ内の `instructor` 参照
- ドキュメント内の `instructor` 参照

**作業内容**:
- プロジェクト全体で `instructor` を検索して確認
- 必要に応じて更新

**確認方法**:
```bash
# プロジェクト全体で instructor を検索
grep -r "instructor" src/ --exclude-dir=node_modules
```

---

### 9. テスト・動作確認（所要時間: 60-90分）

**確認項目**:
- 既存ユーザーの権限が正しく表示されるか
- 権限変更が正常に動作するか
- 権限変更パスワードが正しく設定・検証されるか
- UI で新しい権限名が正しく表示されるか
- 各機能で新しい権限が適切に扱われるか
- マイグレーション後のデータ整合性

---

## 総所要時間の見積もり

| 作業項目 | 所要時間 |
|---------|---------|
| 型定義の更新 | 15-20分 |
| 権限チェック関数の更新 | 30-40分 |
| UI表示の更新 | 40-50分 |
| 権限変更機能の更新 | 30-40分 |
| 権限変更パスワード管理の更新 | 30-40分 |
| データベースマイグレーション | 60-90分 |
| その他の確認箇所 | 30-45分 |
| テスト・動作確認 | 60-90分 |
| **合計** | **285-415分（約4.5-7時間）** |

## 注意点

### 1. データベースマイグレーションの重要性
- **データを削除する必要はありません** - 既存のデータは全てそのまま残ります
- `UPDATE` 文で `role` カラムの値だけを更新するだけです
- バックアップは万が一のため（通常は不要ですが、安全のため推奨）
- 本番環境では慎重に実行する必要がある
- マイグレーション中はシステムを停止するか、ダウンタイムを考慮

### 2. 後方互換性
- `isInstructor()` と `requireInstructor()` の関数名は変更しない（既存コードへの影響を最小化）
- 内部実装のみ変更して、新しい権限名に対応

### 3. システム設定の移行
- `system_config` テーブルのパスワードハッシュキーを移行する必要がある
- 既存のパスワード設定を失わないように注意

### 4. 英語表現の決定
- 「教育訓練」の英語表現を決定する必要がある
- 推奨: `training` （シンプルで分かりやすく、既存の `instructor` の意味に最も近い）

## 推奨作業順序

1. **英語表現の決定** → `training` を推奨
2. **データベースのバックアップ** → 必須
3. **型定義の更新** → 型エラーを確認しながら進める
4. **権限チェック関数の更新** → コアロジックを先に修正
5. **UI表示の更新** → 視覚的な確認がしやすい
6. **権限変更機能の更新** → 機能の動作確認
7. **権限変更パスワード管理の更新** → パスワード管理の確認
8. **データベースマイグレーション** → 慎重に実行
9. **その他の確認箇所** → 全体の整合性確認
10. **テスト・動作確認** → 最終確認

## リスク評価

| リスク | 影響度 | 対策 |
|--------|--------|------|
| データベースマイグレーション失敗 | 低 | トランザクション使用でロールバック可能 |
| 既存ユーザーの権限が失われる | 低 | UPDATE文で値だけを更新するため、データは残る |
| 権限変更パスワードが失われる | 低 | 既存パスワードを新しいキーに移行するため |
| 既存コードの動作不良 | 中 | 関数名は変更せず、内部実装のみ変更 |
| 誤ってデータを削除 | 低 | UPDATE文のみ使用、DELETE文は使わない |

**注意**: データを削除するSQL文（`DELETE`、`DROP`など）は使用しません。`UPDATE`文のみで既存データを更新するだけです。

## まとめ

- **総所要時間**: 約4.5-7時間
- **最も重要な作業**: データベースマイグレーション（バックアップ必須）
- **推奨英語表現**: `training`
- **注意点**: 既存データへの影響があるため、慎重に実行する必要がある

作業の複雑さは、データベースマイグレーションの必要性によって大きく変わります。既存データへの影響を最小限に抑えるため、十分な準備とテストが必要です。

