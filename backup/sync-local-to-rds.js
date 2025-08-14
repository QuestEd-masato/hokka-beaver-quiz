#!/usr/bin/env node
/**
 * ローカルJSONデータをRDSに同期するスクリプト
 * hokka-beaver-quiz専用
 */

const fs = require('fs');
const path = require('path');
const MySQLHelper = require('./mysql-helper');
require('dotenv').config();

async function syncLocalToRDS() {
  console.log('🔄 ローカルJSONデータをRDSに同期開始...');
  
  try {
    // 1. ローカルJSONデータ読み込み
    const dataPath = path.join(__dirname, 'data', 'database.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error('ローカルデータファイルが見つかりません: ' + dataPath);
    }
    
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('📊 ローカルデータ読み込み完了');
    console.log(`  - users: ${data.users?.length || 0}件`);
    console.log(`  - questions: ${data.questions?.length || 0}件`);
    console.log(`  - userAnswers: ${data.userAnswers?.length || 0}件`);
    console.log(`  - quizCompletions: ${data.quizCompletions?.length || 0}件`);
    console.log(`  - rankings: ${data.rankings?.length || 0}件`);
    console.log(`  - surveyAnswers: ${data.surveyAnswers?.length || 0}件`);
    
    // 2. MySQL接続テスト
    const connected = await MySQLHelper.testConnection();
    if (!connected) {
      throw new Error('RDSへの接続に失敗しました');
    }
    console.log('✅ RDS接続確認完了');
    
    // 3. 動的データの移行（users, questionsは既に同期済みなのでスキップ）
    
    // 3.1 user_answers移行
    if (data.userAnswers && data.userAnswers.length > 0) {
      console.log('📝 user_answers移行開始...');
      let userAnswerCount = 0;
      
      const mysql = require('mysql2/promise');
      const pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        waitForConnections: true,
        connectionLimit: 10
      });
      
      for (const [key, answer] of data.userAnswers) {
        try {
          await pool.execute(
            `INSERT IGNORE INTO user_answers 
             (user_id, question_number, answer, is_correct, answered_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              answer.userId,
              answer.questionId || answer.questionNumber,
              answer.answer,
              answer.isCorrect ? 1 : 0,
              new Date(answer.answeredAt)
            ]
          );
          userAnswerCount++;
        } catch (error) {
          console.warn(`⚠️  回答データ移行エラー (${key}):`, error.message);
        }
      }
      console.log(`✅ user_answers移行完了: ${userAnswerCount}件`);
    }
    
    // 3.2 quiz_completions移行
    if (data.quizCompletions && data.quizCompletions.length > 0) {
      console.log('🏆 quiz_completions移行開始...');
      let completionCount = 0;
      
      for (const [userId, completion] of data.quizCompletions) {
        try {
          await MySQLHelper.saveQuizCompletion(
            completion.userId,
            completion.score,
            completion.correctCount
          );
          completionCount++;
        } catch (error) {
          console.warn(`⚠️  完了データ移行エラー (${userId}):`, error.message);
        }
      }
      console.log(`✅ quiz_completions移行完了: ${completionCount}件`);
    }
    
    // 3.3 rankings移行
    if (data.rankings && data.rankings.length > 0) {
      console.log('🏅 rankings移行開始...');
      let rankingCount = 0;
      
      // usersデータを取得してニックネーム解決
      const userMap = new Map();
      if (data.users) {
        for (const [userId, user] of data.users) {
          userMap.set(userId, user.nickname);
        }
      }
      
      for (const [userId, ranking] of data.rankings) {
        try {
          const nickname = userMap.get(ranking.userId) || 'Unknown';
          await MySQLHelper.saveRanking(
            ranking.userId,
            nickname,
            ranking.score,
            ranking.correctCount
          );
          rankingCount++;
        } catch (error) {
          console.warn(`⚠️  ランキングデータ移行エラー (${userId}):`, error.message);
        }
      }
      console.log(`✅ rankings移行完了: ${rankingCount}件`);
    }
    
    // 3.4 survey_answers移行
    if (data.surveyAnswers && data.surveyAnswers.length > 0) {
      console.log('📋 survey_answers移行開始...');
      let surveyCount = 0;
      
      for (const [userId, survey] of data.surveyAnswers) {
        try {
          await MySQLHelper.saveSurveyAnswer(
            survey.userId,
            survey.feedback
          );
          surveyCount++;
        } catch (error) {
          console.warn(`⚠️  アンケートデータ移行エラー (${userId}):`, error.message);
        }
      }
      console.log(`✅ survey_answers移行完了: ${surveyCount}件`);
    }
    
    console.log('🎉 ローカルデータのRDS移行が完了しました！');
    
    // 4. 移行結果確認
    console.log('\n📊 移行結果確認:');
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
    
    const tables = ['users', 'questions', 'user_answers', 'quiz_completions', 'rankings', 'survey_answers'];
    for (const table of tables) {
      try {
        const [rows] = await pool.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  - ${table}: ${rows[0].count}件`);
      } catch (error) {
        console.error(`❌ ${table}件数取得エラー:`, error.message);
      }
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ 同期エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  syncLocalToRDS()
    .then(() => {
      console.log('✅ 同期処理完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 同期処理失敗:', error);
      process.exit(1);
    });
}

module.exports = { syncLocalToRDS };