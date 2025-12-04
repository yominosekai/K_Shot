# スキルマッピング機能 設計方針

## 概要

本ドキュメントは、K-Shotプロジェクトにスキルマッピング機能を統合する際の設計方針をまとめたものです。部分検証で作成されたスキルマッピング機能を本プロジェクトに統合するための最適解を示します。

---

## 1. 機能要件

### 1.1 基本機能

- **スキルマップ表示**: Excel形式表示MoCのようなテーブル形式でスキルフェーズ項目を表示
- **進捗管理**: 各ユーザーがスキルフェーズ項目の学習進捗を管理（未着手/進行中/完了）
- **資料関連付け**: スキルフェーズ項目とK-Shotのナレッジ資料を関連付け
- **統計機能**: 全体の進捗状況を統計表示（使用頻度は低い）

### 1.2 データ規模

- **スキルマスタ**: 100〜500件（部分検証のseed.sqlは72件）
- **ユーザー数**: 10〜100人（アクティブ）
- **1ユーザーあたりの進捗データ**: 平均10件程度
- **1スキルフェーズ項目あたりの関連資料**: 5〜20件程度

---

## 2. データ保存方針

### 2.1 基本方針：ハイブリッド方式

データの性質に応じて保存方法を分ける：

| データ種別 | 保存方法 | 理由 |
|-----------|---------|------|
| **スキルマスタ** | DB（共有） | 全ユーザーで共有、変更頻度が低い |
| **スキルマスタと資料の関連付け** | DB（共有） | 全ユーザーで共有、検索・集計が必要 |
| **ユーザーの進捗データ** | JSONファイル（個人） | 個人データ、ファイルサイズが小さい（1〜3KB） |

### 2.2 DB分離の是非

**結論: DB分離しない（同一DB内で管理）**

**理由:**
- スキルマッピングはユーザー・資料と密接に関連
- 同一DB内で外部キー制約とトランザクションを活用できる
- 既存のアーキテクチャ（ネットワークドライブ上の共有SQLite）と整合性がある
- バックアップ・マイグレーションが1ファイルで済む

**例外:**
- ユーザーの進捗データのみJSONファイルに分離（個人データのため）

---

## 3. DB設計

### 3.1 スキルマスタテーブル

```sql
CREATE TABLE skill_phase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,           -- 大分類
  item TEXT NOT NULL,                -- 項目
  sub_category TEXT NOT NULL,        -- 中分類
  small_category TEXT NOT NULL,      -- 小分類
  phase INTEGER NOT NULL CHECK(phase >= 1 AND phase <= 5),
  name TEXT NOT NULL,                -- 取り組み名
  description TEXT,                  -- 説明
  display_order INTEGER DEFAULT NULL -- 表示順序
);
```

**特徴:**
- 部分検証のスキーマをそのまま移行
- 共有データとして全ユーザーで利用

### 3.2 スキルフェーズ項目と資料の関連付けテーブル

```sql
CREATE TABLE skill_phase_item_materials (
  skill_phase_item_id INTEGER NOT NULL,
  material_id TEXT NOT NULL,
  display_order INTEGER DEFAULT NULL,
  created_date TEXT NOT NULL,
  PRIMARY KEY (skill_phase_item_id, material_id),
  FOREIGN KEY (skill_phase_item_id) REFERENCES skill_phase_items(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

CREATE INDEX idx_skill_phase_item_materials_item_id ON skill_phase_item_materials(skill_phase_item_id);
CREATE INDEX idx_skill_phase_item_materials_material_id ON skill_phase_item_materials(material_id);
```

**特徴:**
- 多対多の関係を表現（1つの項目 ↔ 複数の資料）
- 既存の`material_likes`や`material_views`と同じパターン
- 外部キー制約でデータ整合性を保持

### 3.3 ユーザーの進捗データ（JSONファイル）

**保存場所:**
```
{ドライブ}:\k_shot\users\{ユーザーIDのハッシュ}\skill_progress.json
```

**データ構造:**
```json
{
  "progress": [
    {
      "skillPhaseItemId": 1,
      "status": "completed",  // "not_started" | "in_progress" | "completed"
      "completedDate": "2024-01-15T00:00:00.000Z",
      "notes": "メモ"
    }
  ],
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

**特徴:**
- 1ユーザーあたり平均10件、ファイルサイズ1〜3KB
- 既存の`bookmarks.json`や`feedback.json`と同じパターン
- 個人データのためDBから分離

---

## 4. 負荷分析

### 4.1 個人操作の負荷

| 操作 | 負荷レベル | 説明 |
|------|-----------|------|
| **スキルマップ表示** | ほぼ増加なし | スキルマスタ取得（DB）+ 進捗データ取得（JSON、1〜3KB） |
| **進捗更新** | ほぼ増加なし | JSONファイル書き込み（1〜3KB、50〜200ms） |
| **関連資料表示** | +5% | スキルフェーズ項目の関連資料取得（JOIN、5〜20件） |

### 4.2 同時アクセスの負荷

| シナリオ | 負荷レベル | 説明 |
|---------|-----------|------|
| **10人同時アクセス** | ほぼ増加なし | 各ユーザーが自分のJSONファイルを操作（競合なし） |
| **30人同時アクセス** | ほぼ増加なし | ファイル単位のロックで競合しない |
| **統計ページ表示** | +20〜30% | 全ユーザーのJSONファイル読み込み（使用頻度が低いため問題なし） |

### 4.3 総合的な負荷増加

**JSON方式を採用した場合: +5〜10%程度**

- 個人操作: ほぼ増加なし
- 同時アクセス: ほぼ増加なし
- 統計機能: +20〜30%（使用頻度が低いため問題なし）

---

## 5. 実装上の重要ポイント

### 5.1 差分更新の採用

**問題:**
- 部分検証のロジックでは全削除→全挿入パターンを使用
- これにより長時間のDBロックが発生し、他ユーザーに影響

**解決策:**
- 差分更新方式を採用
- 変更分のみUPDATE/INSERT/DELETE
- ロック時間を50〜200msに短縮

**実装方針:**
```typescript
// 既存データを取得
const existing = getExistingProgress(userId);

// 差分を計算
const updates = calculateDiff(existing, newData);

// 差分のみ更新
updateProgress(userId, updates);
```

### 5.2 ファイルI/Oの最適化

**JSONファイルの読み書き:**
- ファイルサイズが小さい（1〜3KB）ため、全体を上書きでも問題なし
- 非同期処理でUIのブロックを防止
- エラーハンドリングを適切に実装

### 5.3 キャッシュ戦略

**スキルマスタ:**
- 変更頻度が低いため、メモリキャッシュを活用
- 初回読み込み後はキャッシュから取得

**関連資料:**
- スキルフェーズ項目ごとにキャッシュ
- 資料が更新された場合のみキャッシュを無効化

---

## 6. UI設計

### 6.1 プロフィールページからのアクセス

- プロフィールページに「スキルマップを表示・編集」ボタンを追加
- モーダルまたは別ページで表示

### 6.2 スキルマップ表示

- Excel形式表示MoCと同じテーブル形式
- セルクリックで状態変更（未着手/進行中/完了）
- 色分け表示:
  - 未着手: 白/グレー
  - 進行中: 黄色
  - 完了: 緑

### 6.3 関連資料表示

- スキルフェーズ項目をクリックすると関連資料を表示
- 資料一覧から「関連するスキルフェーズ項目」を表示

### 6.4 統計ページ（管理者・教育者向け）

- 全体統計: カテゴリ/項目ごとの習得率
- ユーザー比較: 複数ユーザーのマップ比較
- 進捗グラフ: 時系列での進捗

---

## 7. API設計

### 7.1 スキルマスタ関連

```
GET /api/skill-mapping/items
- スキルマスタ一覧取得

GET /api/skill-mapping/items/:id/materials
- 特定スキルフェーズ項目の関連資料取得
```

### 7.2 ユーザー進捗関連

```
GET /api/skill-mapping/progress/:userId
- ユーザーの進捗状況取得（JSONファイルから）

PUT /api/skill-mapping/progress
- 進捗状況の更新（JSONファイルに保存）
```

### 7.3 関連付け管理（管理者向け）

```
POST /api/skill-mapping/items/:id/materials
- スキルフェーズ項目に資料を関連付け

DELETE /api/skill-mapping/items/:id/materials/:materialId
- 関連付けを削除
```

### 7.4 統計関連

```
GET /api/skill-mapping/statistics
- 統計データ取得（全ユーザーのJSONファイルを読み込み）
```

---

## 8. 実装フェーズ

### フェーズ1: 基本機能
1. DBスキーマ追加（`skill_phase_items`, `skill_phase_item_materials`）
2. スキルマスタデータの移行（部分検証から）
3. スキルマップ表示モーダル（閲覧のみ）
4. プロフィールページからアクセス

### フェーズ2: 進捗管理機能
1. JSONファイルでの進捗データ保存
2. セルクリックで状態変更
3. リアルタイム保存（差分更新）

### フェーズ3: 資料関連付け機能
1. スキルフェーズ項目と資料の関連付けUI
2. 関連資料の表示
3. 資料から逆引き機能

### フェーズ4: 統計機能
1. 統計ページ作成
2. 集計API実装
3. グラフ表示

---

## 9. まとめ

### 9.1 最適解の要点

1. **データ保存**: ハイブリッド方式
   - スキルマスタ・関連付け: DB（共有）
   - ユーザー進捗: JSONファイル（個人）

2. **更新方式**: 差分更新
   - 全削除→全挿入を避ける
   - 変更分のみ更新

3. **負荷**: 最小限（+5〜10%程度）
   - 個人操作: ほぼ増加なし
   - 同時アクセス: ほぼ増加なし

4. **実装**: 既存パターンを踏襲
   - `bookmarks.json`や`material_likes`と同じパターン
   - 一貫性のある設計

### 9.2 期待される効果

- **低負荷**: DB負荷を最小限に抑制
- **スケーラビリティ**: ユーザー数が増えても対応可能
- **保守性**: 既存パターンに沿った実装で理解しやすい
- **拡張性**: 将来的な機能追加にも対応可能

---

## 10. 参考資料

- 部分検証プロジェクト: `C:\Users\cth-vmadmin01\Desktop\lms\部分検証`
- 既存実装パターン:
  - `src/shared/lib/data-access/bookmarks.ts` - JSONファイル保存の例
  - `src/shared/lib/data-access/feedback.ts` - JSONファイル保存の例
  - `src/shared/lib/database/schema.ts` - DBスキーマ定義

---

**最終更新日**: 2024年1月
**作成者**: AI Assistant
**レビュー状況**: 要レビュー

