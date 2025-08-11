# 新インスタンス作成後の接続問題解決ガイド

**日時**: 2025-08-10 16:40 JST  
**状況**: 旧インスタンス削除、新インスタンス作成、キーペア使い回し

## 🔍 問題の特定

### 症状
- ✅ インスタンス状態: 実行中
- ✅ セキュリティグループ: 適切に設定済み
- ❌ SSH接続: タイムアウト
- ❌ ping応答: なし

### 原因
**Elastic IPが新インスタンスに適切に関連付けられていない**

## 🛠️ 解決手順

### Step 1: Elastic IP関連付け確認

1. **AWSコンソール** → EC2ダッシュボード
2. **Elastic IP** → 一覧表示
3. **35.76.100.207** の行を確認
4. **関連付けられたインスタンス**列をチェック

### Step 2: 関連付け状態の確認

#### ケース A: 関連付けなし
```
状況: 関連付けられたインスタンス列が空白
対処: 新インスタンスに関連付け必要
```

#### ケース B: 旧インスタンスに関連付け
```
状況: 削除済みインスタンスIDが表示
対処: 新インスタンスに再関連付け必要
```

#### ケース C: 正しく関連付け済み
```
状況: 新インスタンスIDが表示
対処: DNS伝播待ち（2-3分）
```

### Step 3: Elastic IP再関連付け（必要時）

1. **Elastic IP選択** → 35.76.100.207をクリック
2. **アクション** → 「Elastic IP アドレスの関連付け」
3. **リソースタイプ**: インスタンス
4. **インスタンス**: hokka-beaver-quiz（新しいインスタンス）選択
5. **関連付け**ボタンクリック

### Step 4: 接続確認

関連付け完了後、2-3分待ってから接続テスト：

```bash
# ping確認
ping -c 3 35.76.100.207

# SSH接続テスト
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
    -i /home/masat/hokka-beaver-quiz-key.pem \
    ec2-user@35.76.100.207
```

## 📋 新インスタンスでの初期セットアップ

SSH接続が成功したら、以下のセットアップが必要：

### 1. 基本環境構築
```bash
# Amazon Linux 2023 基本パッケージ
sudo yum update -y
sudo yum install -y git mysql
```

### 2. Node.js環境構築
```bash
# Node.js 18 インストール
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# PM2インストール
sudo npm install -g pm2
```

### 3. Nginxインストール
```bash
sudo yum install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4. アプリケーション配置
```bash
# アプリディレクトリ作成
mkdir -p /home/ec2-user/hokka-beaver-quiz
cd /home/ec2-user/hokka-beaver-quiz

# Gitからクローン（または手動転送）
# git clone https://github.com/QuestEd-masato/hokka-beaver-quiz.git .
```

## 🚀 自動セットアップスクリプト準備

接続が確立したら、ローカルから以下を実行：

```bash
cd /home/masat/beaver_hokka_quiz/
./transfer_files.sh
```

このスクリプトが自動実行する内容：
1. SSH接続確認
2. 必要ファイル転送（.env、RDSテストスクリプト）
3. Node.js環境セットアップ
4. NPMパッケージインストール
5. RDS接続テスト実行

## 🎯 次のステップ

1. **Elastic IP関連付け確認・修正**
2. **SSH接続確立**
3. **自動セットアップ実行**
4. **RDS接続テスト**
5. **アプリケーション起動**

## 💡 今後の注意点

### インスタンス削除時の注意
1. **Elastic IPの関連付け解除**を忘れずに
2. **セキュリティグループ**は削除しない（再利用可能）
3. **キーペア**は削除しない（再利用可能）
4. **RDS**は別リソースのため影響なし

### 新インスタンス作成時の注意
1. **同じVPC・サブネット**に作成
2. **同じセキュリティグループ**を適用
3. **Elastic IP再関連付け**を忘れずに
4. **AMI選択**は同じものを使用

---

**現在のアクション**: AWSコンソールでElastic IP (35.76.100.207) の関連付け状況を確認してください。