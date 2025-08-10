#!/bin/bash
# hokka-beaver-quiz ファイル転送スクリプト
# SSH接続復旧後に実行

EC2_HOST="35.76.100.207"
SSH_KEY="/home/masat/hokka-beaver-quiz-key.pem"
EC2_USER="ec2-user"
APP_DIR="/home/ec2-user/hokka-beaver-quiz"

echo "🚀 hokka-beaver-quiz ファイル転送開始"
echo "======================================"
echo "📍 転送先: $EC2_HOST"
echo "📂 ディレクトリ: $APP_DIR"
echo "======================================"

# 1. SSH接続テスト
echo "1️⃣ SSH接続テスト..."
if ssh -o ConnectTimeout=5 -i $SSH_KEY $EC2_USER@$EC2_HOST "echo 'SSH接続OK'" 2>/dev/null; then
    echo "✅ SSH接続成功"
else
    echo "❌ SSH接続失敗"
    echo "AWSコンソールでセキュリティグループを確認してください"
    exit 1
fi

# 2. .envファイル転送
echo -e "\n2️⃣ .envファイル転送..."
scp -i $SSH_KEY .env $EC2_USER@$EC2_HOST:$APP_DIR/
echo "✅ .envファイル転送完了"

# 3. RDSテストスクリプト転送
echo -e "\n3️⃣ RDSテストスクリプト転送..."
scp -i $SSH_KEY simple_rds_test.js $EC2_USER@$EC2_HOST:$APP_DIR/
scp -i $SSH_KEY test_rds_connection.js $EC2_USER@$EC2_HOST:$APP_DIR/
echo "✅ RDSテストスクリプト転送完了"

# 4. セットアップスクリプト転送・実行
echo -e "\n4️⃣ セットアップスクリプト転送・実行..."
scp -i $SSH_KEY EC2_SETUP_COMMANDS.sh $EC2_USER@$EC2_HOST:$APP_DIR/
ssh -i $SSH_KEY $EC2_USER@$EC2_HOST "cd $APP_DIR && chmod +x EC2_SETUP_COMMANDS.sh && ./EC2_SETUP_COMMANDS.sh"

# 5. RDS接続テスト実行
echo -e "\n5️⃣ RDS接続テスト実行..."
ssh -i $SSH_KEY $EC2_USER@$EC2_HOST "cd $APP_DIR && node simple_rds_test.js"

echo -e "\n✅ 全ての転送・テスト完了"
echo "======================================"