# hokka-beaver-quiz プロジェクト情報 

*📅 最終更新: 2025-08-18 | バージョン: Phase A + Admin UI最適化 + ファイル分割計画策定版*

⚠️ **重要**: このドキュメントは **hokka-beaver-quiz** 専用です。QuestEdとは完全に別のプロジェクトです。

## 📋 プロジェクト概要

### 基本情報
- **プロジェクト名**: hokka-beaver-quiz (ビーバーほっかクイズ)
- **目的**: 中学校文化祭でのクイズラリーアプリケーション
- **対象**: 中学生および来場者（小学生〜大人）
- **テーマ**: 北陸製菓「ビーバーおかき」企業理念・製品・社会貢献
- **参加想定**: 400人規模

### システム構成
- **開発言語**: JavaScript (Node.js)
- **フロントエンド**: HTML/CSS/JavaScript（シングルページ構成）
- **バックエンド**: Express.js
- **データベース**: JSON統一方式（Memory Maps + database.json）
- **インフラ**: AWS EC2 + Elastic IP（RDS削除済み）

## 🏗️ アーキテクチャ（Phase A最適化版）

### Phase A実装内容（現在の構成）
```
hokka-beaver-quiz/
├── enhanced_server.js      # メインサーバー（656行）- Phase A最適化済み
├── database.js            # データベース管理（1,007行）- JSON主導処理
├── mysql-helper.js        # RDS接続ヘルパー（169行）- 部分機能
├── sync-local-to-rds.js   # データ同期スクリプト（193行）
├── utils.js               # ユーティリティ関数（127行）
├── public/                # 静的ファイル
├── templates/             # HTMLテンプレート
├── data/                  # JSONメインデータソース
├── create_tables.sql      # RDSテーブル定義
└── database/init.sql      # 別RDS定義（非使用）
```

### Phase A最適化機能
1. **Phase A1**: バッチ保存最適化
   - バッチ保存間隔: 1秒（セキュリティ修正済み）
   - I/O最適化によるパフォーマンス向上

2. **Phase A2**: 環境変数ログレベル制御
   - 本番環境: error level
   - 開発環境: info level
   - デバッグ環境: debug level

### Phase B削除理由（2025-08-11実施）
- コード複雑性63.8%増加（Phase A: 7%増加）
- ファイル数10倍増加（管理困難）
- セキュリティ脆弱性（XSS、認証トークン）
- **結論**: Phase Aが最適解と判断し、Phase B実装を完全削除

## 🗄️ データベース構成（ハイブリッド方式）

### 📊 実際のアーキテクチャ
```
【メイン処理フロー】
Memory Maps (データ処理) ← JSON Files (data/database.json)
     ↓ 部分的同期                ↑ バッチ保存最適化
RDS MySQL (補助)               ↑ Phase A1強化
     ↓                         
survey_answers, rankings,
quiz_completions のみ
```

### データ分散状況
- **Memory Maps**: 全データ処理の中心（46回参照）
- **JSON Files**: メインデータソース（15回読み書き）  
- **RDS MySQL**: 部分データ（2回参照、3テーブル）

## 🗄️ RDS MySQL構成（部分機能）

### 接続情報
- **Host**: hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com
- **Port**: 3306
- **Database**: hokka_quiz
- **Instance**: db.t3.micro
- **Region**: ap-northeast-1 (Tokyo)

### テーブル構造と実際のデータ状況

**🔍 本番環境データ**（2025-08-13調査結果）:
```sql
ユーザー (7人)        # 本番稼働データ
├─ admin (管理者)
├─ test (テストユーザー)
├─ aaa (テストユーザー2) 
├─ aaaa (追加ユーザー)
├─ masato (100点完了者)
├─ tomi (登録済み)
└─ tomi123 (登録済み)

ランキング (2件完了)  # アクティブデータ
├─ masato: 100点 (10問正解)
└─ test: 40点 (3問正解)

questions (10問)     # JSON管理、RDS未移行
├─ 北陸製菓企業理念・歴史（4問）
├─ ビーバー製品特徴（3問）
└─ 地域貢献・環境活動（3問）
```

**⚠️ データ整合性問題**:
```
ローカル(JSON) vs 本番環境
ユーザー: 3人    vs  7人
回答数: 11件     vs  22件
完了者: 1人      vs  2人
ランキング: 0件   vs  2件
```

### RDS使用状況
- ✅ **survey_answers**: JSON管理（Memory Maps + database.json）
- ✅ **rankings**: JSON管理（Memory Maps + database.json）
- ✅ **quiz_completions**: JSON管理（Memory Maps + database.json）
- ❌ **users**: JSON管理（RDS未使用）
- ❌ **questions**: JSON管理（RDS未使用）
- ❌ **user_answers**: JSON管理（RDS未使用）

## 🌐 アクセス・接続方法

### 本番環境URL（稼働中）
```
メインURL: http://35.76.100.207/
直接アクセス: http://35.76.100.207:8080/
ステータス: ✅ 正常稼働中
応答時間: <20ms
```

### SSH接続（EC2）
```bash
# EC2接続
ssh -i /home/masat/hokka-beaver-quiz-key.pem ec2-user@35.76.100.207

# アプリケーション管理
pm2 status           # 稼働状況確認
pm2 restart hokka-quiz  # アプリ再起動
pm2 logs hokka-quiz     # ログ確認
```

### GitHub連携
```bash
# リポジトリ
git remote: https://github.com/QuestEd-masato/hokka-beaver-quiz.git
最新commit: 411c345 (Phase A rollback with security fixes)

# デプロイフロー
Local → GitHub → EC2 (自動同期)
```

## 💰 運用費用（400人規模）

### 月額費用内訳
| サービス | 費用（円/月） | 用途 |
|----------|---------------|------|
| EC2 t3.micro | ¥1,124 | アプリケーション |
| RDS db.t3.micro | ¥1,836 | データベース |
| RDS Storage 20GB | ¥345 | データ保存 |
| EBS 8GB | ¥120 | EC2ストレージ |
| Elastic IP | ¥540 | 固定IP |
| Data Transfer | ¥203 | 通信費 |
| 監視・雑費 | ¥300 | CloudWatch他 |
| **月額合計** | **¥4,468** | **¥11.2/人** |

### 運用パターン別費用
- **文化祭3日間**: ¥600（¥1.5/人）
- **1ヶ月運用**: ¥4,468（¥11.2/人）
- **ピーク対応**: ¥5,592（¥14/人）

## 🎯 現在の運用状況

### システム稼働状況（2025-08-11時点）
```
✅ EC2インスタンス: 正常稼働
✅ RDSデータベース: 正常接続
✅ PM2プロセス: hokka-quiz online
✅ Nginx: リバースプロキシ稼働
✅ アプリケーション: HTTP 200応答
✅ データ整合性: 問題なし
```

### パフォーマンス状況
- **同時接続対応**: 200人（現構成）
- **応答時間**: 16ms（平均）
- **データベース**: 10回クエリ平均 <20ms
- **メモリ使用量**: 55.3MB
- **CPU使用率**: 0%（待機時）

## 🎪 文化祭での利用想定

### 利用シナリオ
```
参加者: 400人（3日間）
同時アクセス: 最大100人
問題数: 10問（北陸製菓テーマ）
回答時間: 10分/人
データ保持: 1ヶ月後削除
```

### 推奨構成
- **予算**: ¥5,000/月以内
- **構成**: 現行（t3.micro + RDS）
- **スケーリング**: 必要時t3.smallに変更可能（+¥1,124/月）
- **バックアップ**: RDS自動バックアップ有効

## 🔒 セキュリティ・品質管理

### セキュリティ対策
- ✅ パスワードハッシュ化（SHA-256）
- ✅ SQLインジェクション対策（prepared statements）
- ✅ XSS対策（入力検証）
- ✅ CSRF対策（トークン検証）
- ✅ セキュアヘッダー設定（Nginx）

### 品質保証
- ✅ Phase A最適化（7%コード増加に抑制）
- ✅ バッチ処理最適化（I/O効率化）
- ✅ エラーハンドリング統一
- ✅ ログレベル管理
- ✅ データ整合性チェック

## 📈 今後の展開

### 完了済み項目
- ✅ Phase A最適化実装
- ✅ Phase B複雑化の除去
- ✅ セキュリティ修正
- ✅ 400人規模対応確認
- ✅ 費用最適化計算
- ✅ 管理画面統計表示問題修正
- ✅ システム構成実態調査完了

### 現在の課題
- ❌ **データ整合性問題**: ローカル vs 本番環境で不整合
- ❌ **ファイル重複**: 5つのDB関連ファイルが並存
- ❌ **アーキテクチャ方針**: RDS一元化 vs ハイブリッド維持の未決定
- ❌ **SQL定義重複**: create_tables.sql vs database/init.sql

### 将来の拡張可能性
- 🔄 独自ドメイン + HTTPS対応（お名前.com取得後）
- 🔄 CloudFront CDN導入（高速化）
- 🔄 Auto Scaling（大規模対応）
- 🔄 監視・アラート強化

## 🚀 Quick Start

### 開発者向け起動手順
```bash
# 1. リポジトリクローン
git clone https://github.com/QuestEd-masato/hokka-beaver-quiz.git

# 2. 依存関係インストール
npm install

# 3. 環境変数設定
cp .env.example .env

# 4. 起動
npm start
# または
node enhanced_server.js
```

### 管理者向け操作
```bash
# EC2アクセス
ssh -i hokka-beaver-quiz-key.pem ec2-user@35.76.100.207

# アプリ再起動
pm2 restart hokka-quiz

# ログ確認
pm2 logs hokka-quiz

# データベース確認
mysql -h hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com -u admin -p hokka_quiz
```

---

## 📋 重要な注意事項

### プロジェクト識別
⚠️ **このプロジェクトは hokka-beaver-quiz です**
- QuestEd とは完全に別のプロジェクト
- データベース、サーバー、リポジトリすべて独立

### データ管理
⚠️ **本番データの取り扱い**  
- RDS本番データベースにアクセス時は慎重に操作
- バックアップ確認後に変更作業実施
- テスト用データと本番データを明確に区別

### コスト管理
⚠️ **AWS費用の監視**
- 月額¥4,500程度を目安
- 不要時はインスタンス停止
- データ転送量の監視

---

## 🔧 最新の修正履歴（2025-08-18）

### Admin UI最適化実装完了
**実施日時**: 2025-08-18 19:00-20:30 JST  
**コミットID**: 未コミット（デプロイ済み）

#### 修正1: 年齢2文字化 + テーブル幅最適化
**問題**: 管理画面のテーブルがスマホでヘッダー幅を超過、年齢列が長すぎる
**修正内容**:
- モバイル用年齢ラベル追加（園児・小学・中学・高校・大人）
- テーブル列幅最適化：365px → 335px（8.2%削減）
- 400px以下画面：310px → 285px（8.1%削減）
- デスクトップ表示は従来通り維持

**修正箇所**: `templates/admin.html` 
- JavaScript: ageGroupLabels条件分岐追加（2箇所）
- CSS: 列幅調整（デスクトップ・モバイル・超小画面）

#### 技術債務の重大発見
**調査結果**: admin.html コード集中問題が深刻レベル
- **ファイルサイズ**: 1710行 (75KB) - 業界標準の5-17倍
- **構成**: HTML(373行) + CSS(470行) + JavaScript(867行)
- **重複コード**: ageGroupLabels(4箇所)、CSS規則(46箇所)
- **保守性**: CRITICAL レベル

#### ファイル分割計画策定
**計画立案**: 段階的リファクタリング戦略
- **Phase 1**: CSS/JS外部化 (48%削減)
- **Phase 2**: 機能別モジュール化 (77%削減)
- **Phase 3**: 重複除去・品質向上
- **最終目標**: 1710行 → 340行 (80%削減)

**評価結果**: 技術的に正しいが、文化祭直前のタイミングでは**実行非推奨**
- **推奨**: 文化祭終了後の計画的実装
- **理由**: 本番稼働中システムのリスク管理優先

---

**最終更新**: 2025-08-18 20:30 JST  
**作成者**: Claude (Anthropic)  
**プロジェクト**: hokka-beaver-quiz Phase A + Admin UI最適化 + 分割計画版  
**稼働URL**: http://35.76.100.207/ (✅ 正常稼働中)  
**GitHub**: https://github.com/QuestEd-masato/hokka-beaver-quiz.git  

**📊 現在の状況**: 
- Phase A最適化版稼働中（ハイブリッドアーキテクチャ）
- Admin UI最適化完了（モバイル対応・テーブル幅調整）
- 重大技術債務特定完了（admin.html 1710行問題）
- ファイル分割計画策定完了（事後実行推奨）
- 400人規模対応準備完了
- 文化祭利用可能状態（基本機能は安定稼働）

**⚠️ 重要な技術的知見**:
1. **アーキテクチャ実態**: JSON主導 + RDS部分補助のハイブリッド方式で稼働中
2. **技術債務**: admin.html のコード集中問題が CRITICAL レベル
3. **改善戦略**: 段階的リファクタリング計画策定済み（事後実行推奨）
4. **運用方針**: 文化祭成功優先、技術改善は事後対応

**⚠️ 再度確認**: このドキュメントは hokka-beaver-quiz 専用です。QuestEd プロジェクトとは無関係です。