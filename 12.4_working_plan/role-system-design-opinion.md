# 権限システムの設計についての意見

## 現状の実装

現在の権限システムは以下のような構造になっています：

1. **権限名がハードコードされている**
   - 型定義: `role: 'admin' | 'instructor' | 'user'`
   - 権限チェック: switch文で各権限を個別に処理
   - UI表示: 各コンポーネントで個別にラベル・色を定義

2. **権限追加時の作業**
   - 約15-20ファイルを修正
   - 所要時間: 約4-6時間
   - 型定義、権限チェック、UI表示、APIなど複数箇所を更新

## 設計変更の必要性の判断基準

### 権限追加の頻度による判断

| 頻度 | 推奨アプローチ | 理由 |
|------|--------------|------|
| **頻繁（年3回以上）** | ✅ **設定ファイルで一元管理** | 設計変更のコストを回収できる |
| **中程度（年1-2回）** | ⚠️ **中間的なアプローチ** | 設定ファイル化は検討する価値あり |
| **稀（数年1回）** | ❌ **現状維持** | 設計変更のコストが高すぎる |

### 権限の複雑さによる判断

| 複雑さ | 推奨アプローチ | 理由 |
|--------|--------------|------|
| **階層が複雑（5階層以上）** | ✅ **設定ファイルで一元管理** | 管理が困難になる |
| **階層が単純（3階層程度）** | ⚠️ **現状維持 or 中間的アプローチ** | 現状でも管理可能 |

## 推奨アプローチ

### 1. 現状維持（推奨度: ⭐⭐）

**適用ケース**:
- 権限追加が稀（数年1回程度）
- 権限の階層が単純（3階層程度）
- チームが小規模で、変更箇所を把握しやすい

**メリット**:
- 実装がシンプル
- 型安全性が高い（TypeScriptのリテラル型）
- 追加の抽象化レイヤーが不要

**デメリット**:
- 権限追加時に複数ファイルを修正する必要がある
- 修正漏れのリスクがある

---

### 2. 設定ファイルで一元管理（推奨度: ⭐⭐⭐）

**適用ケース**:
- 権限追加が頻繁（年2-3回以上）
- 権限の階層が複雑
- 将来的に権限を動的に管理したい可能性がある

**実装例**:

```typescript
// src/shared/config/roles.ts
export const ROLES = {
  admin: {
    id: 'admin',
    label: '管理者',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: Shield,
    requiresPassword: true,
    hierarchy: ['admin'], // この権限を持つ権限のリスト
  },
  instructor: {
    id: 'instructor',
    label: '教育者',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: GraduationCap,
    requiresPassword: true,
    hierarchy: ['admin', 'instructor'], // admin または instructor でチェック
  },
  user: {
    id: 'user',
    label: '一般ユーザー',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: User,
    requiresPassword: false,
    hierarchy: ['admin', 'instructor', 'user'], // 全員アクセス可能
  },
} as const;

export type RoleId = keyof typeof ROLES;

// 型定義で使用
export type UserRole = RoleId;

// 権限チェック関数
export function checkPermission(
  user: { role: string; is_active: boolean } | null,
  permission: RoleId
): boolean {
  if (!user || !user.is_active) return false;
  const userRole = ROLES[user.role as RoleId];
  const requiredRole = ROLES[permission];
  if (!userRole || !requiredRole) return false;
  
  // 階層関係をチェック
  return requiredRole.hierarchy.includes(userRole.id);
}

// UI表示で使用
export function getRoleLabel(role: string): string {
  return ROLES[role as RoleId]?.label || role;
}

export function getRoleColor(role: string): string {
  return ROLES[role as RoleId]?.color || ROLES.user.color;
}
```

**メリット**:
- 権限追加時に1ファイル（設定ファイル）を修正するだけ
- 権限の定義が一箇所に集約される
- 修正漏れのリスクが低い
- 権限のメタデータ（ラベル、色、アイコンなど）を一元管理

**デメリット**:
- 初期実装コストがかかる（2-3時間）
- 既存コードのリファクタリングが必要
- 型安全性が若干下がる可能性（動的生成の場合）

**実装コスト**:
- 初期実装: 約2-3時間
- 権限追加時: 約30分（設定ファイル1箇所の修正のみ）

---

### 3. 中間的なアプローチ（推奨度: ⭐⭐⭐⭐）

**適用ケース**:
- 権限追加が中程度（年1-2回）
- 現状維持と設定ファイル化の間を取る

**実装例**:

```typescript
// src/shared/config/roles.ts
export const ROLE_CONFIG = {
  admin: {
    label: '管理者',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    requiresPassword: true,
  },
  instructor: {
    label: '教育者',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    requiresPassword: true,
  },
  user: {
    label: '一般ユーザー',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    requiresPassword: false,
  },
} as const;

// 型定義は従来通り（型安全性を保つ）
export type UserRole = 'admin' | 'instructor' | 'user';

// 権限チェック関数は従来通り（ロジックは設定から生成）
export function checkPermission(
  user: { role: string; is_active: boolean } | null,
  permission: UserRole
): boolean {
  if (!user || !user.is_active) return false;
  
  // 権限の階層関係を設定から取得
  const hierarchy: Record<UserRole, UserRole[]> = {
    admin: ['admin'],
    instructor: ['admin', 'instructor'],
    user: ['admin', 'instructor', 'user'],
  };
  
  return hierarchy[permission].includes(user.role as UserRole);
}

// UI表示は設定から取得
export function getRoleLabel(role: UserRole): string {
  return ROLE_CONFIG[role].label;
}

export function getRoleColor(role: UserRole): string {
  return ROLE_CONFIG[role].color;
}
```

**メリット**:
- 型安全性を保ちつつ、設定を一元管理
- 権限追加時に型定義と設定ファイルの2箇所を修正するだけ
- 実装コストが低い（1-2時間）

**デメリット**:
- 完全な一元管理ではない（型定義も更新が必要）
- 権限チェックロジックは手動で更新が必要

**実装コスト**:
- 初期実装: 約1-2時間
- 権限追加時: 約1時間（型定義 + 設定ファイル）

---

## 私の推奨意見

### 現時点での判断

**現状維持を推奨** ⭐⭐⭐

**理由**:
1. **権限追加の頻度が不明確**
   - 頻度が低い場合は設計変更のコストが回収できない
   - 頻度が高くなってから設計変更を検討する方が現実的

2. **現状の実装で十分機能している**
   - 約4-6時間で権限追加が可能
   - 型安全性が高く、バグが入りにくい

3. **過剰設計のリスク**
   - 将来の要件が不明確な状態で設計変更すると、不要な複雑さを生む可能性

### 設計変更を検討すべきタイミング

以下の条件が**2つ以上**当てはまる場合、設計変更を検討する価値があります：

1. ✅ 権限追加が**年2回以上**発生している
2. ✅ 権限追加のたびに**修正漏れが発生**している
3. ✅ 権限の階層が**複雑化**している（4階層以上）
4. ✅ 権限の**メタデータ（ラベル、色など）を頻繁に変更**する必要がある
5. ✅ 将来的に**権限を動的に管理**したい可能性がある

### 設計変更する場合の推奨アプローチ

**中間的なアプローチ**を推奨 ⭐⭐⭐⭐

**理由**:
- 型安全性を保ちつつ、設定を一元管理できる
- 実装コストが低い（1-2時間）
- 権限追加時の作業量を約75%削減できる（4-6時間 → 1時間）

---

## まとめ

### 現時点での推奨
- **現状維持** - 権限追加の頻度が明確になるまで待つ

### 設計変更を検討すべきタイミング
- 権限追加が年2回以上発生している
- 修正漏れが頻繁に発生している
- 権限の階層が複雑化している

### 設計変更する場合の推奨
- **中間的なアプローチ** - 型安全性を保ちつつ、設定を一元管理

### 判断のポイント
- **YAGNI原則**（You Aren't Gonna Need It）: 必要になるまで実装しない
- **実用性重視**: 実際の使用頻度に基づいて判断
- **コストパフォーマンス**: 設計変更のコストと、権限追加時の作業削減効果を比較

---

## 補足: 完全な動的管理が必要な場合

将来的に権限をデータベースで管理したい場合（例: 管理者がUIから権限を追加・削除できる）は、より大規模な設計変更が必要になります。その場合は：

1. 権限テーブルの作成
2. 権限チェックロジックの動的化
3. キャッシュ機構の実装
4. UIでの権限管理機能

ただし、これは**かなり大規模な変更**になるため、明確な要件がある場合のみ検討すべきです。

