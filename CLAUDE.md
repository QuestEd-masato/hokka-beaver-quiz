# ビーバーほっかクイズ技術仕様書

*📅 最終更新: 2025-01-25 | バージョン: 3.0.0*

## 📋 プロジェクト概要

### 基本情報
- **プロジェクト名**: ビーバーほっかクイズ (beaver_hokka_quiz)
- **目的**: 中学校文化祭でのクイズラリーアプリケーション
- **対象**: 中学生および来場者（小学生〜大人）
- **開発言語**: JavaScript (Node.js)
- **データベース**: MySQL 8.0

### プロジェクトの特徴
- 北陸製菓の「ビーバーおかき」をテーマにした教育的クイズ
- 紙の問題とアプリ回答を組み合わせたハイブリッド方式
- 200名同時接続対応の高性能設計

## 🗂️ ディレクトリ構造

```
beaver_hokka_quiz/
├── enhanced_server.js      # メインサーバーファイル
├── package.json           # プロジェクト設定
├── CLAUDE.md             # 本仕様書
├── README.md             # プロジェクト説明
├── database/             # データベース関連
│   └── init.sql         # DB初期化スクリプト
├── templates/            # HTMLテンプレート
│   ├── index.html       # トップページ
│   ├── register.html    # ユーザー登録
│   ├── quiz.html        # クイズ画面
│   ├── result.html      # 結果画面
│   ├── ranking.html     # ランキング
│   ├── survey.html      # アンケート
│   ├── mypage.html      # マイページ
│   ├── review.html      # 復習画面
│   └── admin.html       # 管理画面
├── public/              # 静的ファイル
│   ├── css/
│   │   └── style.css    # スタイルシート
│   ├── js/
│   │   └── app.js       # クライアントJS
│   └── images/          # 画像ファイル
└── data/                # データ永続化
    └── database.json    # バックアップデータ
```

## 📐 命名規則・コーディングルール

### 1. データベース命名規則

#### テーブル名
- **形式**: 複数形・スネークケース
- **例**: `users`, `questions`, `user_answers`

#### カラム名
- **形式**: スネークケース
- **例**: `created_at`, `is_admin`, `question_text`

#### 標準カラム
```sql
-- すべてのテーブルに含める標準カラム
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    -- 作成日時
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    -- 更新日時
               ON UPDATE CURRENT_TIMESTAMP
```

### 2. JavaScript命名規則

#### 変数・関数
```javascript
// 変数: キャメルケース（名詞）
let currentUser = null;        // 現在のユーザー
let questionCount = 10;        // 問題数
const maxConnections = 200;    // 最大接続数

// 関数: キャメルケース（動詞始まり）
function getUserData() {}      // ユーザーデータを取得する
function saveAnswer() {}       // 回答を保存する
function calculateScore() {}   // スコアを計算する

// 定数: 大文字スネークケース
const PORT = 8080;
const MAX_ATTEMPTS = 3;
const DATABASE_NAME = 'beaver_hokka_quiz';
```

#### オブジェクト・クラス
```javascript
// オブジェクト: パスカルケース
const Database = {
  users: new Map(),
  questions: new Map()
};

// クラス: パスカルケース
class QuizManager {
  constructor() {}
}
```

### 3. CSS命名規則

#### CSS変数
```css
/* カラーテーマ: --用途名 */
--primary: #d2691e;        /* メインカラー */
--secondary: #daa520;      /* サブカラー */
--font-size-base: 1rem;    /* 基本文字サイズ */
```

#### クラス名
```css
/* BEM風の命名 */
.quiz-container {}           /* ブロック */
.quiz-container__header {}   /* 要素 */
.quiz-container--active {}   /* 修飾子 */
```

### 4. エンドポイント命名規則

#### RESTful API設計
```javascript
// 形式: /api/リソース名/アクション
'/api/register'          // POST: ユーザー登録
'/api/login'            // POST: ログイン
'/api/quiz/start'       // POST: クイズ開始
'/api/quiz/answer'      // POST: 回答送信
'/api/quiz/result'      // GET:  結果取得
'/api/ranking'          // GET:  ランキング取得
'/api/admin/questions'  // GET:  問題一覧（管理者）
```

## 💬 コメント記述ルール（小学生にも分かりやすく）

### 基本方針
すべての重要な処理には、小学生でも理解できる日本語コメントを追加する

### コメント例
```javascript
/**
 * ユーザー登録機能
 * 新しいユーザーをデータベースに登録します
 * 
 * やること：
 * 1. ニックネームが他の人と同じじゃないか確認する
 * 2. パスワードを暗号化（あんごうか）する
 * 3. データベースに保存する
 * 
 * @param {string} nickname - ニックネーム（あだ名）
 * @param {string} ageGroup - 年齢層（ねんれいそう）
 * @param {string} password - パスワード（ひみつの言葉）
 * @returns {boolean} 成功したらtrue、失敗したらfalse
 */
function registerUser(nickname, ageGroup, password) {
    // ニックネームが既に使われていないかチェック
    // （同じ名前の人がいないか確認する）
    if (Database.users.has(nickname)) {
        return false; // もう使われている！
    }
    
    // パスワードを暗号化する
    // （他の人に見られても分からないようにする）
    const hashedPassword = hashPassword(password);
    
    // 新しいユーザーとして保存
    Database.users.set(nickname, {
        nickname: nickname,
        ageGroup: ageGroup,
        password: hashedPassword,
        createdAt: new Date() // 今の時間を記録
    });
    
    return true; // 登録成功！
}
```

### SQLコメント
```sql
-- ユーザーテーブル: みんなの情報を保存する場所
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- 一人一人の番号（自動で増える）
    nickname VARCHAR(50) NOT NULL,      -- ニックネーム（必ず入力）
    age_group ENUM(                     -- 年齢層（次の中から選ぶ）
        'kindergarten',  -- ようちえん・ほいくえん
        'elementary',    -- 小学生
        'junior_high',   -- 中学生
        'high_school',   -- 高校生
        'adult'         -- 大人
    ) NOT NULL
);
```

### HTMLコメント
```html
<!-- クイズの解答エリア -->
<!-- ここで答えを選んでもらいます -->
<div class="quiz-answer-area">
    <!-- 4つの選択肢（A, B, C, D） -->
    <button class="answer-button" data-answer="A">A</button>
    <button class="answer-button" data-answer="B">B</button>
    <button class="answer-button" data-answer="C">C</button>
    <button class="answer-button" data-answer="D">D</button>
</div>
```

## 🗄️ データベース設計

### テーブル一覧

#### 1. users（ユーザー）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT | ユーザーID（自動番号） |
| nickname | VARCHAR(50) | ニックネーム |
| age_group | ENUM | 年齢層 |
| gender | ENUM | 性別 |
| password_hash | VARCHAR(255) | 暗号化パスワード |
| is_admin | BOOLEAN | 管理者フラグ |
| created_at | TIMESTAMP | 登録日時 |

#### 2. questions（問題）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT | 問題ID |
| question_number | INT | 問題番号（1〜10） |
| question_text | TEXT | 問題文 |
| choice_a〜d | VARCHAR(255) | 選択肢A〜D |
| correct_answer | ENUM('A','B','C','D') | 正解 |
| explanation | TEXT | 解説文 |

#### 3. user_answers（ユーザー回答）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT | 回答ID |
| user_id | INT | ユーザーID |
| question_id | INT | 問題ID |
| selected_answer | ENUM | 選んだ答え |
| is_correct | BOOLEAN | 正解かどうか |
| answered_at | TIMESTAMP | 回答日時 |

#### 4. rankings（ランキング）
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | INT | ランキングID |
| user_id | INT | ユーザーID |
| score | DECIMAL(5,2) | 得点 |
| correct_answers | INT | 正解数 |
| final_score | DECIMAL(5,2) | 最終得点 |
| rank_position | INT | 順位 |

## 🚀 サーバー設定

### 基本設定
```javascript
// サーバー設定
const PORT = 8080;              // ポート番号
const HOST = '0.0.0.0';        // すべてのIPから接続可能
const MAX_CONNECTIONS = 200;    // 最大同時接続数
const TIMEOUT = 30000;          // タイムアウト時間（30秒）
```

### 起動方法
```bash
# サーバー起動
node enhanced_server.js

# アクセスURL
http://localhost:8080
http://127.0.0.1:8080
```

## 🔒 セキュリティ設定

### パスワード管理
- bcryptによるハッシュ化
- 平文パスワードは保存しない

### セッション管理
- メモリベースセッション
- タイムアウト設定あり

### 入力値検証
- SQLインジェクション対策
- XSS対策（HTMLエスケープ）

## 📊 パフォーマンス設定

### 同時接続対応
- 最大200名同時接続
- 接続数モニタリング
- 自動タイムアウト処理

### データ永続化
- 定期的なJSONファイル保存
- サーバー再起動時の自動復元

## 🎨 UIデザイン仕様

### カラーテーマ
```css
/* ビーバー・おかきテーマ */
--primary: #d2691e;      /* チョコレート色 */
--secondary: #daa520;    /* おかきの色 */
--accent: #cd853f;       /* せんべいの色 */
--success: #228b22;      /* 成功（緑） */
--warning: #ff8c00;      /* 警告（オレンジ） */
--error: #dc143c;        /* エラー（赤） */
```

### レスポンシブ対応
- スマートフォン: 320px〜
- タブレット: 768px〜
- PC: 1024px〜

## 📝 今後の開発方針

### コード整理の推奨事項
1. **機能別ファイル分割**
   - enhanced_server.jsを機能ごとに分割
   - ルーティング、データベース、認証を別ファイル化

2. **コメントの充実**
   - すべての関数に日本語説明を追加
   - 複雑な処理には段階的な説明を記載

3. **エラーハンドリング強化**
   - try-catchの適切な使用
   - ユーザーフレンドリーなエラーメッセージ

### 推奨ファイル構成（将来）
```
src/
├── server.js          # メインサーバー
├── routes/            # ルーティング
│   ├── auth.js       # 認証関連
│   ├── quiz.js       # クイズ関連
│   └── admin.js      # 管理機能
├── models/            # データモデル
├── services/          # ビジネスロジック
└── utils/             # ユーティリティ
```

---

**最終更新**: 2025-01-25
**作成者**: Claude (Anthropic)
**プロジェクト**: beaver_hokka_quiz v3.0