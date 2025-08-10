#!/bin/bash
# hokka-beaver-quiz EC2セットアップコマンド
# SSH接続復旧後に実行

echo "🚀 hokka-beaver-quiz EC2セットアップ開始"
echo "=================================="

# 1. 基本情報確認
echo "📊 サーバー基本情報:"
date
whoami
hostname -I
uptime

# 2. アプリケーション状況確認
echo -e "\n📁 アプリケーション確認:"
ls -la /home/ec2-user/hokka-beaver-quiz/
echo -e "\n⚙️ PM2プロセス状況:"
pm2 status

# 3. MySQLクライアントインストール
echo -e "\n🔧 MySQLクライアントインストール:"
sudo yum update -y
sudo yum install -y mysql

# 4. Node.jsとNPM確認
echo -e "\n📦 Node.js環境確認:"
node --version
npm --version
which node
which npm

# 5. 必要なパッケージ確認・インストール
echo -e "\n📦 NPMパッケージ確認:"
cd /home/ec2-user/hokka-beaver-quiz/
npm list mysql2 || npm install mysql2
npm list dotenv || npm install dotenv

# 6. 環境設定ファイル確認
echo -e "\n📄 環境設定確認:"
if [ -f ".env" ]; then
    echo "✅ .env ファイル存在"
    echo "先頭5行:"
    head -5 .env
else
    echo "❌ .env ファイル未存在"
fi

# 7. ログディレクトリ作成
echo -e "\n📂 ログディレクトリ作成:"
mkdir -p /home/ec2-user/hokka-beaver-quiz/logs
mkdir -p /home/ec2-user/hokka-beaver-quiz/data

echo -e "\n✅ セットアップ準備完了"
echo "=================================="