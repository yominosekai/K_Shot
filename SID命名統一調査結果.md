# SID（Session ID）関連命名統一調査結果

調査日時: 2025年1月（推定）

## 調査概要

コードベース全体（`src/`ディレクトリ）でSID（Session ID）関連の命名がIDベースに統一されているかを徹底的に調査しました。

## 調査結果サマリー

- **修正が必要な箇所**: 約70箇所
- **誤検知（修正不要）**: 3箇所
- **配布用ディレクトリ（調査対象外）**: `dist-portable`内のファイル

---

## 1. 修正が必要な箇所

### 1.1 変数名・関数名・プロパティ名

#### 1.1.1 `userSid` 変数名

| ファイルパス | 行番号 | 該当コード | 修正内容 |
|---|---|---|---|
| `src/components/NotificationSendModal/components/NotificationFavoritesManager.tsx` | 12 | `userSids: string[];` | `userIds: string[]` に変更 |
| `src/components/NotificationSendModal/components/NotificationFavoritesManager.tsx` | 79 | `userSids: Array.from(selectedUserIds),` | `userIds: Array.from(selectedUserIds),` に変更 |
| `src/components/NotificationSendModal/components/NotificationFavoritesManager.tsx` | 125 | `onApplyFavorite(favorite.userSids);` | `onApplyFavorite(favorite.userIds);` に変更 |
| `src/components/NotificationSendModal.tsx` | 160 | `const handleApplyFavorite = (userSids: string[]) => {` | `const handleApplyFavorite = (userIds: string[]) => {` に変更 |
| `src/components/NotificationSendModal.tsx` | 161 | `setSelectedUserIds(new Set(userSids));` | `setSelectedUserIds(new Set(userIds));` に変更 |
| `src/shared/lib/data-access/comments.ts` | 14 | `currentUserSid: string,` | `currentUserId: string,` に変更 |
| `src/shared/lib/data-access/comments.ts` | 18 | `debug(MODULE_NAME, \`getMaterialComments開始: materialId=${materialId}, currentUserSid=${currentUserSid}\`);` | `currentUserId` に変更 |
| `src/shared/lib/data-access/comments.ts` | 37 | `const isCreator = row.created_by === currentUserSid;` | `currentUserId` に変更 |
| `src/shared/lib/data-access/comments.ts` | 38 | `const isMaterialCreator = currentUserSid === materialCreatedBy;` | `currentUserId` に変更 |
| `src/shared/lib/data-access/comments.ts` | 53 | `if (parentComment && parentComment.created_by === currentUserSid && parentComment.is_private === 1) {` | `currentUserId` に変更 |
| `src/components/CommentModal/components/CommentList.tsx` | 12 | `currentUserSid?: string;` | `currentUserId?: string;` に変更 |
| `src/components/CommentModal/components/CommentList.tsx` | 28 | `currentUserSid,` | `currentUserId,` に変更 |
| `src/components/CommentModal/components/CommentList.tsx` | 55 | `currentUserSid={currentUserSid}` | `currentUserId={currentUserId}` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 65 | `async function processLogFile(userSid: string, logPath: string): Promise<void> {` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 70 | `const state = getProcessedLogState(userSid, logPath);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 119 | `insertLogin.run(entry.date, userSid);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 124 | `error('activity-aggregator', \`Failed to parse activity log entry for userSid=${userSid}\`, err);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 132 | `error('activity-aggregator', \`Failed to read activity log for userSid=${userSid}\`, err);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 149 | `insertLogin.run(entry.date, userSid);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 154 | `error('activity-aggregator', \`Failed to parse trailing activity log entry for userSid=${userSid}\`, err);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 163 | `updateProcessedLogState(userSid, logPath, newOffset);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 204 | `const userSid = dirent.name;` | `const userId = dirent.name;` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 205 | `const logPath = path.join(usersDir, userSid, ACTIVITY_LOG_FILENAME);` | `userId` に変更 |
| `src/shared/lib/activity-aggregator/index.ts` | 206 | `await processLogFile(userSid, logPath);` | `userId` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 12 | `userSid: string | undefined;` | `userId: string | undefined;` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 18 | `userSid,` | `userId,` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 39 | `if (!userSid) return;` | `userId` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 42 | `const encodedSid = encodeURIComponent(userSid);` | `const encodedId = encodeURIComponent(userId);` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 44 | `const response = await fetch(\`/api/users/${encodedSid}/notifications/count\`);` | `encodedId` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 58 | `const detailResponse = await fetch(\`/api/users/${encodedSid}/notifications?unread_only=true&limit=1\`);` | `encodedId` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 101 | `if (!userSid) return;` | `userId` に変更 |
| `src/components/Header/hooks/useNotificationPolling.ts` | 223 | `}, [userSid]);` | `userId` に変更 |
| `src/shared/hooks/useMaterialContextMenu.tsx` | 12 | `userSid?: string;` | `userId?: string;` に変更 |
| `src/shared/hooks/useMaterialContextMenu.tsx` | 31 | `userSid,` | `userId,` に変更 |
| `src/components/Header/components/HeaderSearchBar.tsx` | 16 | `onUserClick: (userSid: string) => void;` | `onUserClick: (userId: string) => void;` に変更 |
| `src/app/api/materials/[id]/utils/database-updater.ts` | 14 | `userSid: string,` | `userId: string,` に変更 |
| `src/app/api/materials/[id]/utils/database-updater.ts` | 58 | `await logBusyError(userSid, 'updateMaterial', retryCount, true, { materialId, title: updateParams.title });` | `userId` に変更 |
| `src/app/api/materials/[id]/utils/database-updater.ts` | 78 | `await logBusyError(userSid, 'updateMaterial', retryCount, false, { materialId, title: updateParams.title });` | `userId` に変更 |
| `src/app/api/materials/[id]/move/route.ts` | 167 | `const userSid = existingMaterial.created_by;` | `const userId = existingMaterial.created_by;` に変更 |
| `src/app/api/materials/[id]/move/route.ts` | 168 | `if (userSid) {` | `userId` に変更 |
| `src/app/api/materials/[id]/move/route.ts` | 169 | `await logBusyError(userSid, 'moveMaterial', retryCount, true, { materialId, targetFolderPath });` | `userId` に変更 |
| `src/app/api/materials/[id]/move/route.ts` | 191 | `const userSid = existingMaterial.created_by;` | `const userId = existingMaterial.created_by;` に変更 |
| `src/app/api/materials/[id]/move/route.ts` | 192 | `if (userSid) {` | `userId` に変更 |
| `src/app/api/materials/[id]/move/route.ts` | 193 | `await logBusyError(userSid, 'moveMaterial', retryCount, false, { materialId, targetFolderPath });` | `userId` に変更 |
| `src/app/api/activity/sync/route.ts` | 48 | `const userSid = dirent.name;` | `const userId = dirent.name;` に変更 |
| `src/app/api/activity/sync/route.ts` | 54 | `currentUser: userSid,` | `userId` に変更 |
| `src/app/api/activity/sync/route.ts` | 107 | `const userSid = userDirs[i].name;` | `const userId = userDirs[i].name;` に変更 |
| `src/app/api/activity/sync/route.ts` | 111 | `currentUser: \`${userSid} のデータを同期中...\`,` | `userId` に変更 |

#### 1.1.2 `userSid` プロパティ名（APIレスポンス）

| ファイルパス | 行番号 | 該当コード | 修正内容 |
|---|---|---|---|
| `src/app/api/setup/save/route.ts` | 164 | `userSid: provisionResult.userSid,` | `userId: provisionResult.userId,` に変更<br>※`provisionUserAndToken`関数は`userId`を返すため、`provisionResult.userSid`は存在しない（バグ） |

#### 1.1.3 `encodedSid` 変数名

| ファイルパス | 行番号 | 該当コード | 修正内容 |
|---|---|---|---|
| `src/components/Header/hooks/useNotificationPolling.ts` | 42 | `const encodedSid = encodeURIComponent(userSid);` | `const encodedId = encodeURIComponent(userId);` に変更（上記の`userSid`修正と合わせて） |

#### 1.1.4 `targetSid` プロパティ名（ログ用メタデータ）

| ファイルパス | 行番号 | 該当コード | 修正内容 |
|---|---|---|---|
| `src/shared/lib/data-access/users.ts` | 167 | `targetSid: serialized.id,` | `targetUserId: serialized.id,` に変更 |
| `src/shared/lib/data-access/users.ts` | 194 | `targetSid: serialized.id,` | `targetUserId: serialized.id,` に変更 |

#### 1.1.5 `effectiveSid` 変数名

| ファイルパス | 行番号 | 該当コード | 修正内容 |
|---|---|---|---|
| `src/components/MaterialModal/components/MaterialRevisionHistory.tsx` | 55 | `const effectiveSid = revision.updated_by || material.created_by;` | `const effectiveUserId = revision.updated_by || material.created_by;` に変更 |
| `src/components/MaterialModal/components/MaterialRevisionHistory.tsx` | 56 | `const revisionUser = effectiveSid ? userCache.get(effectiveSid) : null;` | `effectiveUserId` に変更 |
| `src/components/MaterialModal/components/MaterialRevisionHistory.tsx` | 72 | `if (!effectiveSid) {` | `effectiveUserId` に変更 |
| `src/components/MaterialModal/components/MaterialRevisionHistory.tsx` | 79 | `const avatarUrl = getAvatarUrl(effectiveSid);` | `effectiveUserId` に変更 |
| `src/components/MaterialModal/components/MaterialRevisionHistory.tsx` | 81 | `const avatarKey = avatarUrl ? \`${effectiveSid}-\${avatarUrl.split('v=')[1] || Date.now()}\` : \`${effectiveSid}-no-avatar\`;` | `effectiveUserId` に変更 |
| `src/components/MaterialModal/components/MaterialRevisionHistory.tsx` | 99 | `effectiveSid?.charAt(0).toUpperCase() ||` | `effectiveUserId` に変更 |
| `src/components/MaterialModal/components/MaterialRevisionHistory.tsx` | 108 | `effectiveSid` | `effectiveUserId` に変更 |

#### 1.1.6 `authenticateUserWithSID` 関数名

| ファイルパス | 行番号 | 該当コード | 修正内容 |
|---|---|---|---|
| `src/features/auth/api/auth.ts` | 180 | `export async function authenticateUserWithSID(): Promise<AuthResponse> {` | 後方互換性のための関数だが、命名統一の観点から削除するか、`authenticateUserWithId`に変更（ただし、外部から使用されている可能性があるため、削除は慎重に） |

### 1.2 APIルートのパスパラメータ

**調査結果**: 実際のソースコード（`src/app/api/users/`）では`[id]`に統一されています。✅

- `src/app/api/users/[id]/route.ts` - ✅ 正しく`[id]`を使用
- `src/app/api/users/[id]/profile/route.ts` - ✅ 正しく`[id]`を使用
- `src/app/api/users/[id]/avatar/route.ts` - ✅ 正しく`[id]`を使用
- `src/app/api/users/[id]/notifications/route.ts` - ✅ 正しく`[id]`を使用
- `src/app/api/users/[id]/notifications/count/route.ts` - ✅ 正しく`[id]`を使用

### 1.3 クエリパラメータ名

**調査結果**: クエリパラメータ名は`user_id`に統一されています。✅

- `src/app/api/materials/[id]/handlers/get.ts:30` - ✅ `user_id`を使用
- `src/app/api/activity/stats/route.ts:284` - ⚠️ `userSid`も後方互換性のために受け付けている（コメント参照）

### 1.4 コメント・ログメッセージ

| ファイルパス | 行番号 | 該当コード | 修正内容 |
|---|---|---|---|
| `src/app/api/activity/stats/route.ts` | 284 | `const userId = searchParams.get('userId') || searchParams.get('userSid'); // 後方互換性のため userSid も受け付ける` | コメント内の`userSid`は後方互換性のための記述なので、そのままでも可。ただし、統一する場合は`// 後方互換性のため userId のみ受け付ける`に変更可能 |

---

## 2. 誤検知（修正不要）

### 2.1 ファイル名・ディレクトリ名

| ファイルパス | 理由 |
|---|---|
| `src/components/Sidebar.tsx` | `glob_file_search`で`**/*sid*`パターンにマッチしたが、実際のファイル内容にSID関連の命名は存在しない。誤検知。 |

### 2.2 ドキュメントファイル

| ファイルパス | 行番号 | 理由 |
|---|---|---|
| `アバターキャッシュ実装比較.md` | 8, 64, 69 | ドキュメントファイル内の記述。実装比較のための参考情報として残すべき。修正不要。 |

### 2.3 配布用ディレクトリ

| ディレクトリ | 理由 |
|---|---|
| `dist-portable/` | 配布用のビルド済みディレクトリ。ソースコードではないため調査対象外。実際のソースコード（`src/`）では`[id]`に統一されている。 |

---

## 3. 修正が必要な箇所の詳細分類

### 3.1 インターフェース・型定義

- `NotificationFavorite`インターフェースの`userSids`プロパティ
- 関数パラメータの`userSid`、`currentUserSid`など
- `CommentListProps`インターフェースの`currentUserSid`プロパティ
- `UseNotificationPollingProps`インターフェースの`userSid`プロパティ
- `UseMaterialContextMenuProps`インターフェースの`userSid`プロパティ
- `HeaderSearchBarProps`インターフェースの`onUserClick`のパラメータ型

### 3.2 関数実装

- `processLogFile`関数のパラメータ名
- `handleApplyFavorite`関数のパラメータ名
- `getMaterialComments`関数のパラメータ名
- `updateMaterialInDatabase`関数のパラメータ名
- `authenticateUserWithSID`関数名（後方互換性のため）

### 3.3 APIレスポンス

- `provisionResult.userSid` → `provisionResult.userId`（バグ修正）

### 3.4 ログメッセージ・メタデータ

- エラーログ内の`userSid`変数参照
- `logBusyError`のメタデータ内の`targetSid`プロパティ

### 3.5 ローカル変数

- `effectiveSid` → `effectiveUserId`（リビジョン履歴表示用）

---

## 4. 修正の優先度

### 高優先度（バグ修正）

1. **`src/app/api/setup/save/route.ts:164`**
   - `provisionResult.userSid`は存在しないプロパティを参照している（バグ）
   - `provisionResult.userId`に修正が必要

### 中優先度（命名統一）

2. **インターフェース・型定義の修正**
   - `NotificationFavorite.userSids` → `userIds`
   - `CommentListProps.currentUserSid` → `currentUserId`
   - `UseNotificationPollingProps.userSid` → `userId`
   - `UseMaterialContextMenuProps.userSid` → `userId`
   - `HeaderSearchBarProps.onUserClick`のパラメータ型
   - 関数パラメータ名の統一

3. **関数実装の修正**
   - `processLogFile`、`getMaterialComments`などの関数パラメータ名
   - `effectiveSid` → `effectiveUserId`

4. **ログメッセージ・メタデータの修正**
   - エラーログ内の`userSid`参照
   - `targetSid` → `targetUserId`

### 低優先度（後方互換性・コメント）

5. **後方互換性のための関数名**
   - `authenticateUserWithSID` → 削除するか`authenticateUserWithId`に変更（外部使用の可能性を確認）

6. **コメント・ログメッセージ内の記述**
   - 後方互換性のためのコメント内の`userSid`記述

---

## 5. 修正時の注意事項

1. **後方互換性**
   - `src/app/api/activity/stats/route.ts:284`の`userSid`パラメータは後方互換性のために残すか、段階的に削除する必要がある
   - `authenticateUserWithSID`関数は外部から使用されている可能性があるため、削除前に使用箇所を確認

2. **関連ファイルの一括修正**
   - インターフェース定義を変更する場合は、そのインターフェースを使用している全てのファイルを同時に修正する必要がある
   - 特に`CommentListProps`、`UseNotificationPollingProps`、`UseMaterialContextMenuProps`などのインターフェース変更時は注意

3. **APIレスポンスの変更**
   - `provisionResult.userSid`を`userId`に変更する場合、フロントエンド側でこのプロパティを参照している箇所も修正が必要

4. **データベースカラム名**
   - データベースのカラム名（`created_by`など）は変更不要（IDベースの命名になっている）

5. **変数名の一貫性**
   - `effectiveSid`は`effectiveUserId`に統一
   - `targetSid`は`targetUserId`に統一（ログ用メタデータ）

---

## 6. 調査対象外

- `dist-portable/`ディレクトリ内のファイル（配布用ビルド済みファイル）
- ドキュメントファイル（`.md`）内の記述（実装比較などの参考情報）

---

## 7. まとめ

実際のソースコード（`src/`ディレクトリ）では、APIルートのパスパラメータとクエリパラメータは`[id]`と`user_id`に統一されていますが、変数名・関数名・プロパティ名に`userSid`、`currentUserSid`、`userSids`、`effectiveSid`、`targetSid`、`encodedSid`などのSID関連の命名が約70箇所残っています。

特に重要なのは、`src/app/api/setup/save/route.ts:164`の`provisionResult.userSid`は存在しないプロパティを参照しているバグです。`provisionResult.userId`に修正する必要があります。

修正作業は、インターフェース定義から始めて、それを使用している全てのファイルを一括で修正することを推奨します。後方互換性が必要な箇所（`authenticateUserWithSID`関数、`userSid`クエリパラメータ）については、段階的な移行計画を立てることを推奨します。
