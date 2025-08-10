#!/usr/bin/env node
/**
 * hokkaクイズラリー - 強化版サーバー (モジュール分離版)
 * 作成日: 2025-07-14
 * 分離日: 2025-08-10 (データベース機能分離)
 * 
 * 機能:
 * - アドミンアカウント
 * - 実際のデータベース機能（メモリベース）
 * - ユーザー名重複チェック
 * - アドミン問題管理
 * - 実際のランキングデータ
 * - 200名同時接続対応
 * - CSV出力機能
 * - アドミン専用ユーザー作成
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 分離されたモジュールをインポート
const Database = require('./database.js');
const Utils = require('./utils.js');

const PORT = 8080;
const HOST = '0.0.0.0';

// === パフォーマンス最適化設定 (Phase A2) ===
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'error' : 'info');

// 最適化されたログ関数
const logger = {
  info: (msg) => { if (LOG_LEVEL === 'info' || LOG_LEVEL === 'debug') console.log(msg); },
  error: (msg) => { console.error(msg); },
  debug: (msg) => { if (LOG_LEVEL === 'debug') console.log('DEBUG:', msg); }
};

// 200名同時接続対応設定
const MAX_CONNECTIONS = 200;
const TIMEOUT = 30000; // 30秒タイムアウト
const KEEP_ALIVE_TIMEOUT = 65000; // 65秒
const HEADERS_TIMEOUT = 66000; // 66秒

console.log('🦫 hokkaクイズラリー 強化版サーバーを起動中...');
console.log('='.repeat(50));

// 接続数管理
let currentConnections = 0;

// MIMEタイプとユーティリティ関数はutilsモジュールから使用

// サーバー処理
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  logger.debug(`📍 ${req.method} ${pathname}`); // Phase A2: デバッグレベルに変更
  
  // CORS設定
  Utils.setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // POSTデータ読み取り（utilsモジュール使用）
  const getBody = () => Utils.getRequestBody(req);
  
  // 静的ファイル配信
  if (Utils.isStaticFile(pathname)) {
    const filePath = path.join(__dirname, 'public', pathname);
    
    if (fs.existsSync(filePath)) {
      const mimeType = Utils.getMimeType(filePath);
      res.writeHead(200, { 'Content-Type': mimeType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  
  // HTML テンプレート配信
  if (pathname === '/' || pathname === '/index.html') {
    const filePath = path.join(__dirname, 'templates', 'index.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  
  // その他のHTMLページ
  if (Utils.isHTMLPage(pathname)) {
    const filePath = path.join(__dirname, 'templates', pathname.replace('/', '') + '.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  
  // 認証API（一般ユーザー登録は無効化）
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    Utils.sendError(res, 403, '新規登録は受付スタッフにお申し出ください');
    return;
  }
  
  // アドミン専用ユーザー作成API
  if (pathname === '/api/admin/users' && req.method === 'POST') {
    const data = await getBody();
    try {
      const user = Database.createUser(data);
      Utils.sendJSON(res, { success: true, user });
    } catch (error) {
      Utils.sendError(res, 400, error.message);
    }
    return;
  }
  
  // ログインAPI
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const data = await getBody();
    try {
      const user = Database.authenticateUser(data.nickname, data.password);
      if (user) {
        Utils.sendJSON(res, { success: true, user });
      } else {
        Utils.sendError(res, 401, 'ニックネームかパスワードが間違っています');
      }
    } catch (error) {
      Utils.sendError(res, 500, 'サーバーエラーが発生しました');
    }
    return;
  }
  
  // クイズ問題取得API
  if (pathname === '/api/quiz/questions') {
    const questions = Array.from(Database.questions.values()).sort((a, b) => a.question_number - b.question_number);
    Utils.sendJSON(res, questions);
    return;
  }
  
  // 回答保存API（save-answer）
  if (pathname === '/api/quiz/save-answer' && req.method === 'POST') {
    const data = await getBody();
    try {
      const userAnswer = Database.saveUserAnswer(data.userId, data.questionNumber, data.answer);
      Utils.sendJSON(res, { success: true, ...userAnswer });
    } catch (error) {
      Utils.sendError(res, 400, error.message);
    }
    return;
  }
  
  // 回答提出API（answer）
  if (pathname === '/api/quiz/answer' && req.method === 'POST') {
    const data = await getBody();
    try {
      const userAnswer = Database.saveUserAnswer(data.userId, data.questionNumber, data.answer);
      
      // 現在の回答状況を取得
      const answers = Database.getUserAnswers(data.userId);
      const totalQuestions = Database.questions.size;
      const progress = {
        completed: answers.length,
        total: totalQuestions,
        percentage: Math.round((answers.length / totalQuestions) * 100)
      };
      
      // 全問題完了チェック
      const allCompleted = answers.length >= totalQuestions;
      
      Utils.sendJSON(res, {
        success: true,
        correct: userAnswer.correct,
        correctAnswer: userAnswer.correctAnswer,
        explanation: userAnswer.explanation,
        progress: progress,
        allCompleted: allCompleted
      });
    } catch (error) {
      Utils.sendError(res, 400, error.message);
    }
    return;
  }
  
  // クイズ完了API
  if (pathname === '/api/quiz/submit' && req.method === 'POST') {
    const data = await getBody();
    try {
      // まず完了済みかチェック
      const isCompleted = Database.quizCompletions.has(data.userId);
      const answers = Database.getUserAnswers(data.userId);
      
      if (isCompleted) {
        // 既に完了している場合は既存の結果を返す
        const completion = Database.quizCompletions.get(data.userId);
        Utils.sendJSON(res, {
          success: true,
          message: '既にクイズは完了しています',
          ...completion,
          answers: answers
        });
        return;
      }
      
      // 全問題に回答しているかチェック
      const totalQuestions = Database.questions.size;
      if (answers.length < totalQuestions) {
        Utils.sendError(res, 400, `まだ回答していない問題があります (${answers.length}/${totalQuestions})`);
        return;
      }
      
      // クイズ完了処理
      const result = Database.completeQuiz(data.userId, {});
      
      Utils.sendJSON(res, { success: true, ...result });
    } catch (error) {
      Utils.sendError(res, 400, error.message);
    }
    return;
  }
  
  // アンケート提出API
  if (pathname === '/api/survey/submit' && req.method === 'POST') {
    const data = await getBody();
    try {
      // アンケート重複提出チェック
      const isCompleted = Database.surveyAnswers.has(data.userId) ||
                         Array.from(Database.surveyAnswers.values()).some(survey => survey.userId === data.userId);
      
      if (isCompleted) {
        Utils.sendError(res, 400, '既にアンケートに回答済みです');
        return;
      }
      
      // アンケート保存
      Database.surveyAnswers.set(data.userId, {
        userId: data.userId,
        feedback: data.feedback || '',
        submittedAt: new Date()
      });
      Database.saveToFile();
      
      Utils.sendJSON(res, { success: true, message: 'アンケートを送信しました！ありがとうございました。' });
    } catch (error) {
      Utils.sendError(res, 500, 'サーバーエラーが発生しました');
    }
    return;
  }
  
  // クイズ状況取得API
  if (pathname.startsWith('/api/quiz/status/') && req.method === 'GET') {
    const userId = parseInt(pathname.split('/').pop());
    if (!userId) {
      Utils.sendError(res, 400, 'ユーザーIDが無効です');
      return;
    }
    
    try {
      const isCompleted = Database.quizCompletions.has(userId);
      const answers = Database.getUserAnswers(userId);
      const totalQuestions = Database.questions.size;
      
      Utils.sendJSON(res, {
        isCompleted: isCompleted,
        answeredCount: answers.length,
        totalQuestions: totalQuestions,
        progress: Math.round((answers.length / totalQuestions) * 100)
      });
    } catch (error) {
      Utils.sendError(res, 500, 'サーバーエラーが発生しました');
    }
    return;
  }
  
  // アンケート状況取得API
  if (pathname.startsWith('/api/survey/status/') && req.method === 'GET') {
    const userId = parseInt(pathname.split('/').pop());
    if (!userId) {
      Utils.sendError(res, 400, 'ユーザーIDが無効です');
      return;
    }
    
    try {
      const completed = Database.surveyAnswers.has(userId) ||
                       Array.from(Database.surveyAnswers.values()).some(survey => survey.userId === userId);
      
      Utils.sendJSON(res, {
        completed: completed
      });
    } catch (error) {
      Utils.sendError(res, 500, 'サーバーエラーが発生しました');
    }
    return;
  }

  // ランキングAPI
  if (pathname === '/api/ranking') {
    const ranking = Database.getRanking();
    Utils.sendJSON(res, ranking);
    return;
  }
  
  // デバッグAPI（ユーザー一覧）
  if (pathname === '/api/debug/users') {
    const users = Database.getAllUsers();
    Utils.sendJSON(res, {
      users: users,
      totalUsers: users.length,
      totalAnswers: Database.userAnswers.size,
      totalCompletions: Database.quizCompletions.size
    });
    return;
  }
  
  // 管理者問題追加API
  if (pathname === '/api/admin/questions' && req.method === 'POST') {
    const data = await getBody();
    try {
      const question = Database.addQuestion(data);
      Utils.sendJSON(res, { success: true, question });
    } catch (error) {
      Utils.sendError(res, 400, error.message);
    }
    return;
  }
  
  // CSV出力API群
  if (pathname === '/api/admin/export/scores') {
    const csvData = Database.getScoresCSV();
    Utils.sendCSV(res, csvData, 'scores.csv');
    return;
  }
  
  if (pathname === '/api/admin/export/survey') {
    const csvData = Database.getSurveyCSV();
    Utils.sendCSV(res, csvData, 'survey.csv');
    return;
  }
  
  if (pathname === '/api/admin/export/questions') {
    const csvData = Database.getQuestionsCSV();
    Utils.sendCSV(res, csvData, 'questions.csv');
    return;
  }
  
  if (pathname === '/api/admin/export/full') {
    const csvData = Database.getScoresCSV();
    Utils.sendCSV(res, csvData, 'full_data.csv');
    return;
  }
  
  // 404エラー
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('ページが見つかりません');
});

// サーバー接続管理
server.on('connection', (socket) => {
  currentConnections++;
  logger.debug(`📊 現在の接続数: ${currentConnections}/${MAX_CONNECTIONS}`); // Phase A2: デバッグレベル
  
  if (currentConnections > MAX_CONNECTIONS) {
    console.log('⚠️  最大接続数を超過しました。接続を閉じます。');
    socket.destroy();
    return;
  }
  
  socket.setTimeout(TIMEOUT);
  socket.on('close', () => {
    currentConnections--;
    console.log(`📊 接続終了: ${currentConnections}/${MAX_CONNECTIONS}`);
  });
  
  socket.on('error', (error) => {
    console.error('🔴 ソケットエラー:', error.message);
    currentConnections--;
  });
});

// サーバー起動
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
server.headersTimeout = HEADERS_TIMEOUT;

server.listen(PORT, HOST, () => {
  // データベース初期化
  Database.init();
  
  console.log('✅ アプリケーションの初期化完了');
  console.log(`📍 アクセスURL: http://localhost:${PORT}`);
  console.log(`📍 アクセスURL: http://127.0.0.1:${PORT}`);
  console.log(`📍 WSL2アクセスURL: http://172.20.251.113:${PORT}`);
  console.log(`🔗 最大同時接続数: ${MAX_CONNECTIONS}名`);
  console.log('👤 アドミンアカウント: admin / admin123');
  console.log('👤 テストアカウント: test / test123, aaa / aaa123');
  console.log('📊 CSV出力機能: 利用可能');
  console.log('🛑 停止するには Ctrl+C を押してください');
  console.log('='.repeat(50));
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 サーバーを停止します...');
  Database.saveToFile(); // 最終データ保存
  server.close(() => {
    console.log('✅ サーバーを停止しました');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  console.error('❌ 予期しないエラー:', error);
  Database.saveToFile(); // エラー時も保存
  process.exit(1);
});