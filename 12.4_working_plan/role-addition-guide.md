# 4つ目の権限追加時の作業範囲と所要時間

## 概要

現在の権限システムは3つ（`admin`, `instructor`, `user`）ですが、4つ目の権限を追加する際の作業範囲と所要時間をまとめます。

## 現在の権限システムの構造

### 権限の階層
- **admin（管理者）**: 全権限
- **instructor（教育者）**: 管理者権限を含む（`admin` または `instructor` でチェック）
- **user（一般ユーザー）**: 基本権限のみ

### データベース
- `users.role` カラムは `TEXT` 型のため、追加の権限値も保存可能（スキーマ変更不要）

## 作業範囲と所要時間

### 1. 型定義の更新（所要時間: 15-20分）

**ファイル**: 
- `src/features/auth/types.ts`
- `src/shared/lib/data-access/users.ts`

**作業内容**:
- `User` 型の `role` フィールドに新しい権限を追加
- 例: `role: 'admin' | 'instructor' | 'user' | 'new_role'`

**影響箇所**: 2-3ファイル

---

### 2. 権限チェック関数の更新（所要時間: 30-40分）

**ファイル**:
- `src/features/auth/utils.ts` - `checkPermission()` 関数
- `src/shared/lib/auth/middleware.ts` - `hasPermission()`, `requireRole()` 関数

**作業内容**:
- `checkPermission()` の switch 文に新しい権限のケースを追加
- 権限の階層関係を定義（例: 新しい権限が `instructor` より上か下か）
- `hasPermission()` の型定義を更新
- `requireRole()` の型定義を更新

**影響箇所**: 2ファイル

**注意点**:
- 権限の階層関係を明確に定義する必要がある
- 例: 新しい権限が `instructor` と同等なら `case 'instructor': return user.role === 'admin' || user.role === 'instructor' || user.role === 'new_role';`

---

### 3. UI表示の更新（所要時間: 40-50分）

**ファイル**:
- `src/components/UserCard.tsx` - `getRoleLabel()`, `getRoleColor()`
- `src/components/UserListItem.tsx` - `getRoleLabel()`, `getRoleColor()`
- `src/components/UserDetailModal.tsx` - `getRoleLabel()`, `getRoleColor()`
- `src/components/RoleChangeModal.tsx` - `getRoleLabel()`, 権限選択UI

**作業内容**:
- 各ファイルの `getRoleLabel()` に新しい権限のラベルを追加
- 各ファイルの `getRoleColor()` に新しい権限の色を追加
- `RoleChangeModal` に新しい権限の選択肢を追加（ラジオボタン）

**影響箇所**: 4ファイル

**注意点**:
- 色の選択は既存の権限と区別しやすい色を選ぶ
- アイコンの選択も検討（`RoleChangeModal` で使用）

---

### 4. 権限変更機能の更新（所要時間: 30-40分）

**ファイル**:
- `src/components/RoleChangeModal.tsx` - 権限選択UI、パスワード要件
- `src/app/api/users/[id]/role/route.ts` - 権限バリデーション、パスワード検証

**作業内容**:
- `RoleChangeModal` の `newRole` の型に新しい権限を追加
- 権限変更時のパスワード要件を定義（新しい権限がパスワード必要かどうか）
- API のバリデーション配列に新しい権限を追加: `['user', 'instructor', 'admin', 'new_role']`
- パスワード検証ロジックの更新（新しい権限がパスワード必要かどうか）

**影響箇所**: 2ファイル

---

### 5. 権限変更パスワード管理の更新（所要時間: 20-30分）

**ファイル**:
- `src/shared/lib/database/schema.ts` - `ensureRoleChangePasswords()` 関数
- `src/components/RolePasswordChangeModal.tsx` - 権限選択ドロップダウン
- `src/app/api/admin/system-config/role-password/route.ts` - パスワード更新API

**作業内容**:
- `ensureRoleChangePasswords()` に新しい権限のデフォルトパスワード設定を追加
- `RolePasswordChangeModal` の select に新しい権限のオプションを追加
- API の型定義を更新（`role: 'admin' | 'instructor' | 'new_role'`）

**影響箇所**: 3ファイル

**注意点**:
- 新しい権限がパスワード不要の場合は、この作業は不要

---

### 6. 権限チェック箇所の確認・更新（所要時間: 60-90分）

**確認が必要な箇所**:
- API エンドポイントでの権限チェック（`requireAdmin()`, `requireInstructor()`, `requireRole()` の使用箇所）
- ページコンポーネントでの権限チェック（`user?.role === 'admin'` などの直接チェック）
- 条件分岐での権限チェック（`isAdmin()`, `isInstructor()` の使用箇所）

**作業内容**:
- 新しい権限が必要な機能を特定
- 各箇所で新しい権限が適切に扱われるか確認
- 必要に応じて権限チェックロジックを更新

**影響箇所**: 10-20箇所（プロジェクト全体）

**確認方法**:
```bash
# 権限チェック箇所を検索
grep -r "role.*===" src/
grep -r "requireAdmin\|requireInstructor\|requireRole" src/
grep -r "isAdmin\|isInstructor" src/
```

---

### 7. テスト・動作確認（所要時間: 60-90分）

**確認項目**:
- 新しい権限でログインできるか
- 権限変更が正常に動作するか
- 権限変更パスワードが正しく設定・検証されるか
- UI で新しい権限が正しく表示されるか
- 各機能で新しい権限が適切に扱われるか

---

## 総所要時間の見積もり

| 作業項目 | 所要時間 |
|---------|---------|
| 型定義の更新 | 15-20分 |
| 権限チェック関数の更新 | 30-40分 |
| UI表示の更新 | 40-50分 |
| 権限変更機能の更新 | 30-40分 |
| 権限変更パスワード管理の更新 | 20-30分 |
| 権限チェック箇所の確認・更新 | 60-90分 |
| テスト・動作確認 | 60-90分 |
| **合計** | **255-360分（約4-6時間）** |

## 注意点

### 1. 権限の階層関係の定義
新しい権限が既存の権限とどういう関係にあるかを明確にする必要があります。
- 例: 新しい権限が `instructor` より上なら、`instructor` の権限チェックに含める
- 例: 新しい権限が `user` と同等なら、`user` の権限チェックに含める

### 2. パスワード要件の決定
新しい権限に権限変更パスワードが必要かどうかを決定する必要があります。
- パスワード必要: `admin`, `instructor` と同様にパスワード管理が必要
- パスワード不要: `user` と同様にパスワード不要

### 3. 既存データへの影響
既存のユーザーデータには影響しません（`role` は TEXT 型のため）。
ただし、新しい権限に既存ユーザーを変更する場合は、権限変更機能を使用します。

### 4. 後方互換性
既存の権限（`admin`, `instructor`, `user`）はそのまま動作するため、後方互換性は保たれます。

## 推奨作業順序

1. **型定義の更新** → 型エラーを確認しながら進める
2. **権限チェック関数の更新** → コアロジックを先に修正
3. **UI表示の更新** → 視覚的な確認がしやすい
4. **権限変更機能の更新** → 機能の動作確認
5. **権限変更パスワード管理の更新** → パスワードが必要な場合のみ
6. **権限チェック箇所の確認・更新** → 全体の整合性確認
7. **テスト・動作確認** → 最終確認

## 簡易版（最小限の作業）

新しい権限が `user` と同等の権限で、パスワード不要の場合：

| 作業項目 | 所要時間 |
|---------|---------|
| 型定義の更新 | 15-20分 |
| 権限チェック関数の更新 | 20-30分 |
| UI表示の更新 | 40-50分 |
| 権限変更機能の更新 | 20-30分 |
| 権限チェック箇所の確認 | 30-45分 |
| テスト・動作確認 | 30-45分 |
| **合計** | **155-220分（約2.5-3.5時間）** |

---

## まとめ

- **標準的な作業**: 約4-6時間
- **簡易版（パスワード不要）**: 約2.5-3.5時間
- **最も時間がかかる作業**: 権限チェック箇所の確認・更新（プロジェクト全体の影響確認）

作業の複雑さは、新しい権限の階層位置とパスワード要件によって大きく変わります。

