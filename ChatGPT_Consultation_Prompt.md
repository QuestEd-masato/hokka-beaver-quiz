# hokka-beaver-quiz AWS設定相談プロンプト

**ChatGPT相談用プロンプト - AWS設定とRDS構築について**

---

## 📋 プロジェクト概要

以下のNode.jsクイズアプリケーションのAWS設定について相談したいです。

### 基本情報
- **アプリ名**: hokka-beaver-quiz（ビーバーおかきクイズラリー）
- **目的**: 中学校文化祭での200名同時参加クイズラリー
- **技術**: Node.js 18, Express相当の自作HTTPサーバー
- **現在地**: EC2デプロイ完了、外部アクセス設定待ち

## 🏗️ 現在のアーキテクチャ

### EC2インスタンス構成
```
EC2インスタンス: 18.181.244.62 (Amazon Linux 2023)
├── Node.js 18.20.8 + PM2
├── hokka-quiz アプリ (Port 8080) ✅稼働中
├── Nginx リバースプロキシ (Port 80) ✅稼働中
├── Certbot 2.6.0 ✅インストール済み
└── MySQL/MariaDB クライアント ✅インストール済み
```

### アプリケーション機能
```javascript
// 16個のAPIエンドポイント
- GET  /                    // メインページ
- POST /api/auth/login      // ユーザーログイン
- POST /api/admin/users     // 管理者によるユーザー作成
- GET  /api/quiz/questions  // 10問のクイズ問題取得
- POST /api/quiz/answer     // クイズ回答送信・進捗管理
- POST /api/quiz/submit     // クイズ完了・スコア計算
- GET  /api/ranking         // ランキング表示
- POST /api/survey/submit   // アンケート送信
- GET  /api/admin/export/*  // CSV出力（4種類）
```

### データ構造（現在：インメモリ + JSON永続化）
```javascript
Database = {
  users: Map,           // ユーザー管理（管理者・一般ユーザー）
  questions: Map,       // クイズ問題（10問固定）
  userAnswers: Map,     // 個別回答記録
  quizCompletions: Map, // 完了状況・スコア
  rankings: Map,        // ランキングデータ
  surveyAnswers: Map    // アンケート回答
}
```

## ❌ 現在未設定・問題点

### 1. セキュリティグループ設定
- **問題**: Port 80, 8080が外部から接続不可
- **必要**: HTTP/HTTPS用ポート開放
- **不明点**: 適切なセキュリティ設定範囲

### 2. RDSデータベース
- **現状**: インメモリ + JSON永続化で動作
- **課題**: サーバー再起動時のデータ保持不安
- **移行必要性**: 本格運用時の信頼性向上

### 3. ドメイン・HTTPS設定
- **現状**: IPアドレス直接アクセスのみ
- **希望**: 独自ドメイン + SSL証明書
- **制限**: Route53設定にはAWS認証情報が必要

## 🎯 相談したい具体的事項

### A. セキュリティグループ設定
```
質問1: 以下の要件に最適なセキュリティグループ設定は？
- 用途: 中学校文化祭（一般公開イベント）
- 参加者: 200名同時接続
- アクセス元: 不特定多数（スマートフォン・PC）
- 必要ポート: 80(HTTP), 443(HTTPS), 8080(直接アクセス・オプション)
- セキュリティレベル: 標準的な公開Webアプリケーション

推奨設定:
□ HTTP (80): 0.0.0.0/0 全開放？
□ HTTPS (443): 0.0.0.0/0 全開放？
□ SSH (22): 特定IP制限？
□ その他の考慮事項は？
```

### B. RDS移行計画
```
質問2: 現在のデータ構造をRDS移行する最適解は？
- 現在: インメモリMap + JSON永続化
- データ量: ユーザー200名、回答2000件、ランキング200件想定
- パフォーマンス要求: 同時200接続、レスポンス< 500ms
- 予算: 開発・テスト用途（低コスト重視）

検討事項:
□ RDS MySQL vs Aurora vs DynamoDB？
□ インスタンス推奨サイズは？
□ マルチAZ必要性？
□ バックアップ戦略？
□ 現在のMap構造をSQL設計に最適変換方法？
```

### C. 運用・監視設定
```
質問3: 文化祭当日の安定運用のための設定は？
- イベント日: 1日限定
- 想定負荷: 200名同時、ピーク時間集中
- 障害許容度: 低（イベント成功に直結）

必要な設定:
□ CloudWatch監視項目？
□ Auto Scaling設定？
□ ロードバランサー必要性？
□ バックアップ戦略？
```

## 📊 技術仕様詳細

### パフォーマンス設定（現在）
```javascript
const MAX_CONNECTIONS = 200;    // 同時接続数
const TIMEOUT = 30000;          // 30秒タイムアウト
const KEEP_ALIVE_TIMEOUT = 65000;
const HEADERS_TIMEOUT = 66000;
```

### データベース接続情報（希望）
```javascript
// 移行予定の構成
const DB_CONFIG = {
  host: '[RDSエンドポイント]',
  port: 3306,
  database: 'hokka_quiz',
  user: '[ユーザー名]',
  password: '[パスワード]',
  connectionLimit: 10
};
```

### アプリケーション特性
- **読み取り重視**: 問題表示、ランキング表示
- **書き込み頻度**: ユーザー回答（200名×10問=2000件想定）
- **データ整合性**: ランキング計算の正確性重要
- **可用性**: イベント時間中（6-8時間）の100%稼働必須

## 🔧 現在のNginx設定
```nginx
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # セキュリティヘッダー設定済み
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

## ❓ 最重要質問

1. **セキュリティグループの適切な設定内容**
2. **RDS移行の必要性とコスト対効果**
3. **ドメイン取得とHTTPS設定の優先度**
4. **文化祭当日の障害対策・監視設定**
5. **予算を抑えた最小構成での推奨アーキテクチャ**

## 📝 補足情報

- AWSアカウント: 利用可能
- 予算制約: 開発・教育目的（低コスト希望）
- 技術レベル: 基本的なAWS操作可能
- 緊急度: 文化祭開催日程に依存

**このような状況でのベストプラクティスと具体的設定手順をアドバイスしてください。**