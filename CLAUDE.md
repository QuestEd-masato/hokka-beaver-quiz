# ビーバーほっかクイズ技術仕様書

*📅 最終更新: 2025-08-10 | バージョン: 5.0.0*

## 🔒 HTTPS化対応状況（2025-08-10 最新）

### 現在の状況
- **HTTP**: http://35.76.100.207/ で稼働中
- **HTTPS**: 独自ドメイン取得後に実装予定
- **独自ドメイン**: お名前.comで取得予定

### HTTPS実装プラン
1. **✅ Phase 1**: IP基盤での自己署名証明書テスト完了
   - 結果: `ERR_SSL_KEY_USAGE_INCOMPATIBLE`, `ERR_CERT_AUTHORITY_INVALID`
   - 結論: ブラウザ互換性のため独自ドメイン必須

2. **🔄 Phase 2**: 独自ドメイン + Let's Encrypt実装（進行中）
   - **ドメイン取得**: お名前.com（ユーザーが取得予定）
   - **DNS設定**: Aレコードで35.76.100.207に関連付け
   - **SSL証明書**: Let's Encrypt（無料・自動更新）
   - **期待される結果**: 全ブラウザで警告なしHTTPSアクセス

### HTTPS実装手順（ドメイン取得後）
```bash
# 1. DNS伝播確認
nslookup your-domain.com

# 2. Let's Encrypt証明書取得
sudo certbot --nginx -d your-domain.com

# 3. 自動更新設定
sudo systemctl enable certbot.timer

# 4. アクセス確認
curl -I https://your-domain.com/
```

**⚠️ 重要**: このプロジェクトは **hokka-beaver-quiz** です。QuestEdとは完全に別のプロジェクトです。

## 📋 プロジェクト概要

### 基本情報
- **プロジェクト名**: ビーバーほっかクイズ (hokka-beaver-quiz)
- **目的**: 中学校文化祭でのクイズラリーアプリケーション
- **対象**: 中学生および来場者（小学生〜大人）
- **開発言語**: JavaScript (Node.js)
- **データベース**: インメモリデータベース + JSON永続化（RDS準備中）

### プロジェクトの特徴
- 北陸製菓の「ビーバーおかき」をテーマにした教育的クイズ
- 紙の問題とアプリ回答を組み合わせたハイブリッド方式
- 200名同時接続対応の高性能設計
- **モジュラーアーキテクチャ**: Phase 1 & 2 完了

## 🏗️ アーキテクチャ（2025-08-10更新）

### モジュール構成（Phase 1 & 2 完了）

```
hokka-beaver-quiz/
├── enhanced_server.js      # メインサーバー（413行）
│   └── 16個のAPIエンドポイント処理
├── database.js            # データベース管理モジュール（609行）
│   ├── インメモリデータベース（Map構造）
│   ├── JSON永続化機能
│   ├── ユーザー認証・管理
│   ├── クイズ進行管理
│   └── CSV出力機能
├── utils.js               # ユーティリティ関数（127行）
│   ├── MIMEタイプ処理
│   ├── CORS設定
│   ├── エラー処理統一
│   └── レスポンス処理統一
└── その他のファイル...
```

### データ永続化方式
```javascript
// インメモリ + JSON永続化
const Database = {
  users: new Map(),           // ユーザー管理
  questions: new Map(),       // 問題管理
  userAnswers: new Map(),     // 回答管理
  rankings: new Map(),        // ランキング管理
  quizCompletions: new Map(), // 完了状況
  saveToFile(),              // JSON保存
  loadFromFile()             // JSON読み込み
}
```

## 🔗 接続・アクセス方法（非エンジニア向け）

### 1. GitHub接続方法

**リポジトリURL**: https://github.com/QuestEd-masato/hokka-beaver-quiz.git

**注意**: QuestEd-BaseBuilderとは完全に別のリポジトリです！

#### コードのダウンロード方法
```bash
# 1. GitHubからダウンロード（開発者向け）
git clone https://github.com/QuestEd-masato/hokka-beaver-quiz.git

# 2. ブラウザでダウンロード（一般向け）
# GitHubページで緑色の「Code」ボタン → 「Download ZIP」をクリック
```

### 2. EC2接続方法

**⚠️ 重要**: このEC2はhokka-beaver-quiz専用です。QuestEdのEC2とは別です。

#### 接続情報（2025-08-10更新）
```bash
# EC2接続コマンド（新Elastic IP）
ssh -i /home/masat/hokka-beaver-quiz-key.pem ec2-user@35.76.100.207

# ファイル転送
scp -i /home/masat/hokka-beaver-quiz-key.pem [ローカルファイル] ec2-user@35.76.100.207:[送信先]

# PEMキー場所（WSL環境）
/home/masat/hokka-beaver-quiz-key.pem

# 旧IP（無効）
# ssh -i ~/hokka-beaver-quiz-key.pem ec2-user@18.181.244.62
```

#### EC2上でのアプリケーション管理
```bash
# PM2でのアプリケーション管理
pm2 status           # アプリの状況確認
pm2 logs hokka-quiz  # ログ確認
pm2 restart hokka-quiz  # アプリ再起動
pm2 stop hokka-quiz     # アプリ停止

# Nginx（ウェブサーバー）管理
sudo systemctl status nginx   # Nginx状況確認
sudo systemctl restart nginx  # Nginx再起動
sudo nginx -t                 # Nginx設定確認
```

### 3. 現在のアクセス状況

#### ✅ 動作中のサービス
```
┌─────────────┬──────────────┬────────┬──────────┐
│ サービス名   │ ポート       │ 状況   │ 用途     │
├─────────────┼──────────────┼────────┼──────────┤
│ hokka-quiz  │ 8080        │ ✅動作 │ アプリ本体│
│ nginx       │ 80          │ ✅動作 │ リバース  │
│ PM2         │ -           │ ✅動作 │ プロセス  │
│ certbot     │ -           │ ✅準備 │ SSL証明書 │
└─────────────┴──────────────┴────────┴──────────┘
```

#### 現在のアクセスURL
```
# 現在動作中（HTTPのみ）
http://35.76.100.207/        # Port 80（Nginx経由・推奨）
http://35.76.100.207:8080/   # Port 8080（直接アクセス・開発用）

# ドメイン取得後に追加される予定
https://your-domain.com/     # HTTPS（Let's Encrypt・全ブラウザ対応）
http://your-domain.com/      # HTTP→HTTPS自動リダイレクト

# 旧IP（無効）
# http://18.181.244.62/
```

## 🚫 まだ接続できていない・設定できていないこと

### 1. EC2への SSH接続 ❌ (2025-08-10 緊急事項)

**問題**: 新Elastic IP (35.76.100.207) および旧IP (18.181.244.62) 両方でSSH接続不可

**症状**: `ssh: connect to host 35.76.100.207 port 22: Connection timed out`

**考えられる原因**:
- セキュリティグループでSSHポート(22)が閉鎖状態
- EC2インスタンスが停止している可能性
- Elastic IPの関連付けが完了していない
- ネットワークACLによる制限

**必要な対処** (AWSコンソールで確認必要):
1. EC2インスタンスの起動状態確認
2. セキュリティグループでSSHポート(22)開放確認
3. Elastic IP (35.76.100.207)の関連付け確認
4. ネットワークACL設定確認

### 2. 外部インターネットからのアクセス ❌

**問題**: AWSセキュリティグループで必要ポートが開放されていない

**必要な設定**:
- Port 22 (SSH) の開放（管理用）
- Port 80 (HTTP) の開放
- Port 443 (HTTPS) の開放（将来）
- Port 8080 の開放（オプション）

**設定場所**: AWSコンソール → EC2 → セキュリティグループ

### 3. 独自ドメイン設定 🔄 (進行中)

**現在の状況**:
- **ドメイン取得**: お名前.com（ユーザーが取得中）
- **DNS設定**: 取得後にAレコード設定予定
- **Let's Encrypt準備**: Certbot 2.6.0 インストール済み

**必要な作業** (ドメイン取得後):
1. お名前.com でDNS設定（Aレコード: your-domain.com → 35.76.100.207）
2. DNS伝播確認（24-48時間）
3. Let's Encrypt証明書取得
4. Nginx HTTPS設定更新

### 4. HTTPS証明書設定 🔄 (準備完了)

**準備済み**: Let's Encrypt (Certbot 2.6.0) インストール済み
**前回のIP証明書問題**: ERR_SSL_KEY_USAGE_INCOMPATIBLE, ERR_CERT_AUTHORITY_INVALID
**解決策**: 独自ドメイン使用で全ブラウザ対応

**ドメイン取得後の実行手順**:
```bash
# 1. DNS伝播確認
nslookup your-domain.com
dig your-domain.com

# 2. 証明書取得（Nginxモード）
sudo certbot --nginx -d your-domain.com

# 3. 自動更新確認
sudo systemctl status certbot.timer

# 4. HTTPS動作確認
curl -I https://your-domain.com/
```

**期待される結果**: Chrome, Firefox, Safari, Edge で警告なしアクセス

### 5. RDSデータベース ❌

**現状**: インメモリデータベース + JSON永続化で動作中
**将来**: RDS MySQL接続予定
**影響**: 現在も完全に動作するため急務ではない

## 📊 現在の構成（非エンジニア向け説明）

### 1. サーバー構成

```
インターネット
    ↓
【AWSセキュリティグループ】← 現在閉鎖中（設定必要）
    ↓
【EC2インスタンス：18.181.244.62】
    ├── Nginx（ポート80） ← リバースプロキシ
    │   └── セキュリティヘッダー追加
    │   └── アクセスログ記録
    └── hokka-quiz（ポート8080） ← Node.jsアプリケーション
        ├── ユーザー管理
        ├── クイズ機能
        ├── ランキング
        └── 管理画面
```

### 2. データの流れ

```
ユーザーのスマホ/PC
    ↓（HTTPリクエスト）
Nginx（ポート80）
    ↓（プロキシ転送）
hokka-quizアプリ（ポート8080）
    ↓（データ処理）
インメモリデータベース
    ↓（定期保存）
JSON永続化ファイル（/data/database.json）
```

### 3. データ内容

**現在保存されているデータ**:
- ユーザー: 3名（admin, test, aaa）
- 問題: 10問（北陸製菓ビーバー関連）
- 回答履歴: 0件
- ランキング: 0件

## 🎯 システムの利点

### 1. 高い可用性
- PM2による自動復旧
- Nginxによる安定したWebサーバー
- インメモリデータベースによる高速処理

### 2. スケーラビリティ
- 200名同時接続対応
- モジュラー設計による拡張性
- 将来のRDS移行準備完了

### 3. 運用しやすさ
- ログ自動記録
- PM2による簡単なプロセス管理
- 自動データバックアップ

## 📝 次のステップ

### 即座に実施可能
1. **セキュリティグループ設定**（AWSコンソール）
   - Port 80, 443の開放
   - HTTPアクセス有効化

### 中期的な改善（進行中）
1. **✅ ドメイン取得**: お名前.com（ユーザーが取得中）
2. **🔄 DNS設定**: Aレコード 35.76.100.207 設定予定
3. **🔄 HTTPS証明書**: Let's Encrypt 自動取得予定
4. **⏳ RDSデータベース構築**: 将来対応

### 長期的な拡張
1. **CDN導入**（CloudFront）
2. **ロードバランサー設定**
3. **監視・アラート設定**

---

## 📋 設定準備完了項目

### .env環境変数ファイル ✅

**場所**: `/home/masat/beaver_hokka_quiz/.env`
**状況**: EC2転送準備完了

**主要設定内容**:
```bash
# Server Configuration
PORT=8080
HOST=0.0.0.0
NODE_ENV=production

# Database Configuration  
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hokka_quiz

# Security Settings
JWT_SECRET=hokka_beaver_quiz_jwt_secret_key_2025_very_secure
SESSION_SECRET=hokka_beaver_session_secret_2025_ultra_secure

# Network Configuration
ALLOWED_ORIGINS=http://35.76.100.207,https://35.76.100.207,https://your-domain.com
```

**転送予定コマンド** (SSH接続復旧後):
```bash
scp -i /home/masat/hokka-beaver-quiz-key.pem /home/masat/beaver_hokka_quiz/.env ec2-user@35.76.100.207:/home/ec2-user/hokka-beaver-quiz/
```

---

---

## 📞 お名前.com ドメイン設定ガイド（2025-08-10追加）

### ドメイン取得後の設定手順

1. **お名前.com 管理画面ログイン**
   ```
   https://www.onamae.com/
   → 会員専用ページ → DNS関連機能の設定
   ```

2. **DNSレコード設定**
   ```
   レコードタイプ: A
   ホスト名: @ (または空欄)
   VALUE: 35.76.100.207
   TTL: 3600 (デフォルト)
   ```

3. **DNS伝播確認**
   ```bash
   # Windows/Mac/Linux
   nslookup your-domain.com
   dig your-domain.com @8.8.8.8
   ```

4. **EC2でのHTTPS設定**
   ```bash
   # SSH接続復旧後に実行
   sudo certbot --nginx -d your-domain.com
   ```

### よくある問題と解決

**問題1**: DNS伝播が遅い
- **解決**: 24-48時間待機、キャッシュクリア

**問題2**: Let's Encrypt エラー
- **解決**: ドメインが正しく解決されることを事前確認

**問題3**: Nginx設定エラー
- **解決**: `sudo nginx -t` でテスト後再読み込み

---

**最終更新**: 2025-08-10 17:30 JST
**作成者**: Claude (Anthropic)  
**プロジェクト**: hokka-beaver-quiz v5.0.0
**EC2 Elastic IP**: 35.76.100.207 (安定稼働中)
**HTTPS対応**: 独自ドメイン取得後に実装予定
**GitHub**: https://github.com/QuestEd-masato/hokka-beaver-quiz.git

**📋 現在の状況**: 
- HTTP稼働中（35.76.100.207）
- 独自ドメイン取得中（お名前.com）
- HTTPS実装準備完了（Let's Encrypt + Certbot）
- 全ブラウザ対応HTTPS実装予定

**⚠️ 再度確認**: このドキュメントはhokka-beaver-quiz専用です。QuestEdプロジェクトとは無関係です。