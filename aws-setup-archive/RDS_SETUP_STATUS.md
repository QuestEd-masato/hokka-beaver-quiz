# hokka-beaver-quiz RDS設定状況

**作成日**: 2025-08-10 16:15 JST  
**プロジェクト**: hokka-beaver-quiz（QuestEdとは別）

## 📊 RDS接続情報（提供済み）

| 項目 | 値 |
|------|-----|
| RDSエンドポイント | hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com |
| ポート | 3306 (MySQL標準) |
| ユーザー名 | admin |
| パスワード | hokka-beaver-quiz-20250810 |
| データベース名 | hokka_quiz (作成予定) |
| リージョン | ap-northeast-1 (東京) |

## 🔍 現在の接続状況

### ローカル環境からの接続テスト結果

```bash
# 接続テスト実施時刻: 2025-08-10 16:14 JST
❌ ポート3306への接続: タイムアウト
❌ DNS解決: 失敗（0.0.0.2に解決される異常な動作）
```

### 問題診断

1. **DNS解決問題**
   - RDSエンドポイントが正しく解決されない
   - WSL2環境特有のDNS問題の可能性

2. **ネットワーク接続問題**
   - セキュリティグループでポート3306が制限されている可能性
   - RDSが起動していない、または一時停止中の可能性
   - VPC設定によるアクセス制限

## 🛠️ 必要な対処（AWSコンソールで確認）

### 1. RDSインスタンス状態確認
- [ ] RDSインスタンスが「利用可能」状態か確認
- [ ] エンドポイント名が正しいか再確認
- [ ] インスタンスクラス、ストレージ確認

### 2. セキュリティグループ設定
- [ ] RDS用セキュリティグループでポート3306が開放されているか
- [ ] 接続元IP（ローカル開発環境、EC2）が許可されているか
- [ ] VPCセキュリティグループのインバウンドルール確認

### 3. パラメータグループ設定
- [ ] 文字コード設定（utf8mb4推奨）
- [ ] タイムゾーン設定（Asia/Tokyo）
- [ ] max_connections設定（200以上推奨）

### 4. VPC設定
- [ ] RDSサブネットグループの確認
- [ ] パブリックアクセシビリティの設定確認
- [ ] VPCのルートテーブル確認

## 📝 準備済みファイル

### 1. .env環境変数ファイル ✅
```bash
# Database Configuration (RDS MySQL)
DB_HOST=hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=hokka_quiz
DB_USER=admin
DB_PASSWORD=hokka-beaver-quiz-20250810
```

### 2. RDS接続テストスクリプト ✅
- ファイル: `test_rds_connection.js`
- 機能: 接続確認、テーブル作成、初期データ投入
- 状態: WSL環境からの接続不可（タイムアウト）

### 3. RDS用テーブル設計 ✅

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  nickname VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  age_group VARCHAR(50),
  gender VARCHAR(20),
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 問題テーブル
CREATE TABLE questions (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  options JSON NOT NULL,
  correct_answer INT NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 回答テーブル
CREATE TABLE user_answers (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  answer INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id),
  UNIQUE KEY unique_user_question (user_id, question_id)
);

-- クイズ完了テーブル
CREATE TABLE quiz_completions (
  user_id VARCHAR(255) PRIMARY KEY,
  score INT NOT NULL,
  total INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ランキングテーブル
CREATE TABLE rankings (
  user_id VARCHAR(255) PRIMARY KEY,
  nickname VARCHAR(255) NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  age_group VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- アンケートテーブル
CREATE TABLE survey_answers (
  user_id VARCHAR(255) PRIMARY KEY,
  visited_booth BOOLEAN DEFAULT FALSE,
  booth_thoughts TEXT,
  liked_quiz TEXT,
  suggestions TEXT,
  bonus_points INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🚀 次のステップ

### EC2からのRDS接続テスト（SSH復旧後）

```bash
# EC2にSSH接続後
ssh -i /home/masat/hokka-beaver-quiz-key.pem ec2-user@35.76.100.207

# EC2上でRDS接続テスト
mysql -h hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com \
      -P 3306 \
      -u admin \
      -p'hokka-beaver-quiz-20250810'
```

### セキュリティグループ推奨設定

#### RDS用セキュリティグループ
| タイプ | プロトコル | ポート | ソース | 説明 |
|--------|-----------|--------|--------|------|
| MySQL/Aurora | TCP | 3306 | EC2セキュリティグループID | EC2からの接続 |
| MySQL/Aurora | TCP | 3306 | 開発環境IP/32 | 開発環境から（一時的） |

## ⚠️ 注意事項

1. **セキュリティ**
   - パスワードは本番環境では AWS Secrets Manager 使用推奨
   - 開発環境からの直接接続は開発時のみ許可

2. **パフォーマンス**
   - 200名同時接続想定のため、RDSインスタンスサイズ確認必要
   - db.t3.small以上推奨

3. **バックアップ**
   - 自動バックアップ有効化推奨
   - 保持期間: 7日以上

## 📞 追加で必要な情報

AWS管理者に以下の情報を確認してください：

1. RDSインスタンスの現在の状態
2. セキュリティグループのインバウンドルール設定
3. VPCのパブリックアクセシビリティ設定
4. EC2とRDSが同じVPC内にあるか確認

---

**注意**: このドキュメントはhokka-beaver-quiz専用です。QuestEdプロジェクトとは無関係です。