# 「hokkaクイズラリー」→「ビーバー・フィーバー🎉」置換計画

**作成日時**: 2025-08-21  
**対象**: hokka-beaver-quizプロジェクト全体  
**目的**: ブランディング変更による一括タイトル更新

## 📊 調査結果

### 対象ファイル（21ファイル）
- HTMLテンプレート: 9ファイル  
- JavaScript: 2ファイル  
- CSS: 2ファイル  
- 設定/ドキュメント: 3ファイル  
- サーバー/DB: 3ファイル  
- バックアップ: 2ファイル

### 出現箇所（全44箇所）
総計44箇所で「hokkaクイズラリー」が使用されています。

## 🎯 置換方針

### 1. 基本置換パターン
```
hokkaクイズラリー → ビーバー・フィーバー🎉
```

### 2. 文脈別の調整

#### タイトルタグ（<title>）
```html
変更前: <title>🦫 hokkaクイズラリー - ページ名</title>
変更後: <title>🦫 ビーバー・フィーバー🎉 - ページ名</title>
```

#### ヘッダーロゴ部分
```html
変更前: hokkaクイズラリー
変更後: ビーバー・フィーバー🎉
```

#### フッター著作権表示
```html
変更前: <p>&copy; 2025 金沢学院大学附属中学校２年１組 - hokkaクイズラリー</p>
変更後: <p>&copy; 2025 金沢学院大学附属中学校２年１組 - ビーバー・フィーバー🎉</p>
```

#### 説明文内
```html
変更前: hokkaクイズラリーの参加者ランキングです！
変更後: ビーバー・フィーバー🎉の参加者ランキングです！
```

#### コメント内
```javascript
変更前: /* hokkaクイズラリー - 管理画面専用JavaScript */
変更後: /* ビーバー・フィーバー🎉 - 管理画面専用JavaScript */
```

## ⚠️ 特別な注意事項

### 1. 文字数増加の影響
- 「hokkaクイズラリー」（10文字）
- 「ビーバー・フィーバー🎉」（12文字+絵文字）
- **UIレイアウトへの影響を要確認**

### 2. 絵文字の扱い
- HTMLでは問題なし
- JSコメント内でも問題なし
- package.jsonも対応可能

### 3. 特殊ケース
- README.mdの見出し
- package.jsonのdescription
- コンソールログメッセージ

## 📝 置換対象ファイルリスト

### 優先度：高（ユーザー表示）
1. templates/index.html (4箇所)
2. templates/quiz.html (3箇所)
3. templates/result.html (3箇所)
4. templates/mypage.html (3箇所)
5. templates/ranking.html (4箇所)
6. templates/survey.html (3箇所)
7. templates/review.html (3箇所)
8. templates/admin.html (3箇所)
9. templates/register.html (3箇所)

### 優先度：中（システム内部）
10. public/js/app.js (2箇所)
11. public/js/admin.js (1箇所)
12. public/css/style.css (1箇所)
13. public/css/admin.css (1箇所)

### 優先度：低（サーバー/設定）
14. enhanced_server.js (2箇所)
15. database.js (1箇所)
16. utils.js (1箇所)
17. package.json (1箇所)
18. README.md (1箇所)

### バックアップ（スキップ推奨）
19. admin.js.phase1.5-backup (1箇所)
20. backup/phase1_admin_fix_20250818_093339/admin_original.html (3箇所)
21. backup/phase2_auto_redirect_20250818_094849/admin_before_phase2.html (3箇所)

## 🚀 実行計画

### Phase 1: バックアップ作成
```bash
tar -czf hokka_title_backup_$(date +%Y%m%d_%H%M%S).tar.gz templates/ public/ *.js *.json
```

### Phase 2: 一括置換実行
HTMLテンプレート、JS、CSS、設定ファイルを順次更新

### Phase 3: 動作確認
- ローカルでの表示確認
- レイアウト崩れチェック
- 機能動作確認

### Phase 4: デプロイ
GitHub経由でEC2へ自動デプロイ

## ✅ 期待される効果
- より楽しく親しみやすいブランディング
- 「フィーバー」による盛り上がり感の演出
- 絵文字による視覚的アピール向上