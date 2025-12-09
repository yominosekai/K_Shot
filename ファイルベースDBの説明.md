# ファイルベースDBの説明

## ファイルベースって何？

**ファイルベースDB**は、データベースの代わりに**ファイルシステム**を使ってデータを保存する方式です。

### 簡単に言うと

- **SQLite**: 1つのファイル（`k_shot.db`）に全データを保存
- **ファイルベース**: 1つのレコード = 1つのJSONファイルとして保存

## 具体的な違い

### SQLiteの場合

```
J:\k_shot\shared\
└── k_shot.db  ← 1つのファイルに全データが入っている
    ├── materialsテーブル（全資料）
    ├── usersテーブル（全ユーザー）
    ├── commentsテーブル（全コメント）
    └── ...
```

**データの保存方法:**
- 全データが1つのファイルにまとまっている
- SQLクエリでデータを操作（`SELECT`, `INSERT`, `UPDATE`, `DELETE`）
- テーブル単位でロック（1人が書き込むと、そのテーブル全体がロックされる）

### ファイルベースの場合

```
J:\k_shot\shared\file-db\
├── materials\              ← テーブル = フォルダ
│   ├── a\b\               ← シャーディング（ファイル数が多い場合の分割）
│   │   ├── material_001.json  ← 1レコード = 1ファイル
│   │   └── material_002.json
│   └── c\d\
│       └── material_003.json
├── users\
│   └── u\s\
│       ├── user_001.json
│       └── user_002.json
└── comments\
    └── c\o\
        └── comment_001.json
```

**データの保存方法:**
- 1レコード = 1つのJSONファイル
- ファイル操作でデータを操作（`readFile`, `writeFile`, `unlink`）
- ファイル単位でロック（1つのファイルを更新しても、他のファイルには影響しない）

## ロジックの違い

### 1. データの読み取り

#### SQLite
```sql
SELECT * FROM materials WHERE id = 'material_001';
```
→ SQLiteが内部でインデックスを使って高速に検索

#### ファイルベース
```typescript
// ファイルパスを構築
const filePath = 'materials/a/b/material_001.json';

// ファイルを読み込む
const content = await fs.readFile(filePath, 'utf-8');
const data = JSON.parse(content);
```
→ ファイルシステムから直接読み込む

### 2. データの書き込み

#### SQLite
```sql
INSERT INTO materials (id, title, ...) VALUES ('material_001', 'タイトル', ...);
```
→ SQLiteがテーブル全体をロックして書き込み

#### ファイルベース
```typescript
// 一時ファイルに書き込み
await fs.writeFile('materials/a/b/material_001.tmp', JSON.stringify(data));

// リネーム（アトミックな操作）
await fs.rename('materials/a/b/material_001.tmp', 'materials/a/b/material_001.json');
```
→ 1つのファイルだけを操作（他のファイルには影響しない）

### 3. 検索

#### SQLite
```sql
SELECT * FROM materials WHERE category_id = 'cat_001' AND type = 'document';
```
→ SQLiteがインデックスを使って高速に検索

#### ファイルベース
```typescript
// インデックスディレクトリからIDリストを取得
const categoryIds = await getIndexIds('materials', 'category_id', 'cat_001');
const typeIds = await getIndexIds('materials', 'type', 'document');

// 交差を計算
const candidateIds = categoryIds.filter(id => typeIds.includes(id));

// 該当するファイルを読み込む
const materials = await readRecords('materials', candidateIds);
```
→ ディレクトリ構造をインデックスとして使う

## 主な違いまとめ

| 項目 | SQLite | ファイルベース |
|------|--------|----------------|
| **データの保存場所** | 1つのファイル（`k_shot.db`） | 複数のJSONファイル |
| **データの操作** | SQLクエリ | ファイル操作 |
| **ロックの単位** | テーブル単位 | ファイル単位 |
| **同時アクセス** | テーブルロックで競合が発生 | ファイル単位なので競合が少ない |
| **検索** | SQLインデックスで高速 | ディレクトリ構造で検索 |
| **JOIN操作** | SQLの標準機能 | キャッシュベースで手動実装 |
| **集計クエリ** | SQLの集計関数 | 事前計算してキャッシュ |

## なぜファイルベースを選んだのか？

### SQLiteの課題

1. **テーブル単位のロック**
   - 1人が書き込むと、そのテーブル全体がロックされる
   - 20人規模で同時アクセスすると、`SQLITE_BUSY`エラーが頻発

2. **同時書き込みの制限**
   - 複数のユーザーが同時に資料をアップロードすると、待機が必要

### ファイルベースのメリット

1. **ファイル単位のロック**
   - 1つのファイルを更新しても、他のファイルには影響しない
   - 複数のユーザーが同時に別々の資料をアップロードできる

2. **同時アクセス性能**
   - 100人規模でも対応可能
   - `SQLITE_BUSY`エラーが発生しない

## 実装の例

### 資料をアップロードする場合

#### SQLite
```typescript
// テーブル全体をロック
const db = getDatabase();
const stmt = db.prepare('INSERT INTO materials ...');
stmt.run(...params); // 他のユーザーは待機が必要
```

#### ファイルベース
```typescript
// 1つのファイルだけを操作
await createRecord('materials', 'material_001', {
  id: 'material_001',
  title: 'タイトル',
  // ...
});
// 他のユーザーは別のファイルを操作できる（ブロックされない）
```

### 1GBのファイルをアップロード中でも

#### SQLite
- データベースへの保存は既に完了しているため、基本的に可能
- ただし、同時にINSERTしようとすると`SQLITE_BUSY`エラーが発生する可能性

#### ファイルベース
- **完全に可能**
- データベースへの保存（`createRecord`）は即座に完了（数ミリ秒）
- 1GBのファイルをアップロード中でも、他のユーザーは別の資料をアップロードできる

## まとめ

**ファイルベースDB**は、SQLiteの「1つのファイルに全データ」という方式から、「1レコード = 1ファイル」という方式に変更したものです。

**メリット:**
- ファイル単位のロックで、同時アクセス性能が向上
- 複数のユーザーが同時に作業できる

**デメリット:**
- 実装が複雑（SQLの標準機能を手動実装する必要がある）
- 検索や集計のパフォーマンスがSQLiteより劣る場合がある

**使い分け:**
- **20人規模以下**: SQLiteで十分
- **50人規模以上**: ファイルベースを検討
- **同時書き込みが多い**: ファイルベースが有利

