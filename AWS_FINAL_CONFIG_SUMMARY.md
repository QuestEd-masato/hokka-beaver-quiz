# hokka-beaver-quiz AWS構成確定情報

**日時**: 2025-08-10 16:25 JST  
**状況**: AWS構成が確定、接続テスト準備完了

## ✅ 確定したAWS構成

### ネットワーク（VPC/サブネット/ルート）
```yaml
VPC: vpc-hokka-beaver-quiz
  CIDR: 10.0.0.0/16

サブネット:
  public-1a: 10.0.0.0/24 (ap-northeast-1a) ← EC2配置
  private-1a: 10.0.1.0/24 (ap-northeast-1a)
  private-1c: 10.0.2.0/24 (ap-northeast-1c)

インターネットゲートウェイ: 
  作成・VPCアタッチ済み

ルートテーブル:
  rtb-hokka-public:
    - 0.0.0.0/0 → IGW (外向け)
    - 関連付け: public-1a
```

### EC2（Webサーバ）
```yaml
インスタンス: hokka-beaver-quiz
  タイプ: t2.micro (テスト構成)
  OS: Amazon Linux 2023
  サブネット: public-1a
  パブリックIP: 有効
  
Elastic IP: 35.76.100.207 (関連付け済み)

セキュリティグループ: hokka-beaver-quiz-web
  Inbound:
    - SSH 22/tcp: 管理者IP (x.x.x.x/32)
    - HTTP 80/tcp: 0.0.0.0/0
    - (推奨) HTTPS 443/tcp: 0.0.0.0/0
  Outbound: All (0.0.0.0/0)
```

### RDS（MySQL）
```yaml
DB識別子: hokka-db
エンドポイント: hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com
ポート: 3306
エンジン: MySQL 8.0系
可用性: シングルAZ (ap-northeast-1a)

サブネットグループ: db-subnet-hokka
  含むサブネット: private-1a, private-1c
  パブリックアクセス: なし (VPC内からのみ)

セキュリティグループ:
  hokka-beaver-quiz-db:
    Inbound: MySQL 3306/tcp ← EC2のSGに限定
  rds-ec2-1 (自動作成): 削除検討対象

認証: admin / hokka-beaver-quiz-20250810
ストレージ: gp3 20GB (デフォルト設定)
```

## 🎯 次の作業選択肢

### オプション A: EC2→RDS接続テスト（推奨）
```bash
# EC2にSSH接続
ssh -i /home/masat/hokka-beaver-quiz-key.pem ec2-user@35.76.100.207

# MySQLクライアントインストール
sudo yum install -y mysql

# RDS接続テスト
mysql -h hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com \
      -P 3306 \
      -u admin \
      -p'hokka-beaver-quiz-20250810'

# 接続確認
SHOW DATABASES;
```

### オプション B: Web公開設定（Nginx/PM2）
- Nginx HTTPSリバースプロキシ設定
- PM2プロセス管理設定  
- Let's Encrypt証明書取得

## 📋 準備完了ファイル

### 1. .env設定ファイル ✅
```bash
# RDS MySQL Configuration
DB_HOST=hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=hokka_quiz
DB_USER=admin
DB_PASSWORD=hokka-beaver-quiz-20250810

# Server Configuration  
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
ALLOWED_ORIGINS=http://35.76.100.207,https://35.76.100.207
```

### 2. RDSテーブル作成スクリプト ✅
- ファイル: `test_rds_connection.js`
- 機能: 接続、DB作成、テーブル作成、初期データ

### 3. ファイル転送コマンド ✅
```bash
# .envファイル転送
scp -i /home/masat/hokka-beaver-quiz-key.pem \
    /home/masat/beaver_hokka_quiz/.env \
    ec2-user@35.76.100.207:/home/ec2-user/hokka-beaver-quiz/

# RDSテストスクリプト転送
scp -i /home/masat/hokka-beaver-quiz-key.pem \
    /home/masat/beaver_hokka_quiz/test_rds_connection.js \
    ec2-user@35.76.100.207:/home/ec2-user/hokka-beaver-quiz/
```

## 🚀 推奨作業フロー

### Phase 1: 基本接続確認
1. EC2 SSH接続テスト
2. EC2からRDS接続テスト  
3. Node.jsアプリケーション起動確認

### Phase 2: データベース初期化
1. RDSにテーブル作成
2. 初期データ投入
3. アプリケーションのRDS接続切り替え

### Phase 3: Web公開設定
1. Nginx HTTPSリバースプロキシ設定
2. Let's Encrypt証明書取得
3. 外部アクセステスト

## 🔧 即座に実行可能なコマンド

```bash
# SSH接続テスト
ssh -i /home/masat/hokka-beaver-quiz-key.pem ec2-user@35.76.100.207 "
  echo '✅ SSH接続成功'
  echo '📊 現在時刻:' \$(date)
  echo '📊 ディスク容量:' && df -h
  echo '📊 プロセス状況:' && pm2 status
"
```

どちらから進めますか？

**A) EC2→RDS接続テストから始める**  
**B) Web公開設定（Nginx/PM2）から始める**