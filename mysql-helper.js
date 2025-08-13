// MySQL Helper - 最小限のMySQL接続ヘルパー
// hokka-beaver-quiz専用

const mysql = require('mysql2/promise');
require('dotenv').config();

// 接続プール作成（シングルトン）
let pool = null;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'hokka_quiz',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'hokka-beaver-quiz-20250810',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  return pool;
};

// ヘルパー関数
const MySQLHelper = {
  // アンケート保存
  async saveSurveyAnswer(userId, feedback) {
    const pool = getPool();
    try {
      // 既存チェック
      const [existing] = await pool.execute(
        'SELECT id FROM survey_answers WHERE user_id = ?',
        [userId]
      );
      
      if (existing.length > 0) {
        return { success: false, message: '既にアンケートに回答済みです' };
      }
      
      // 新規保存
      await pool.execute(
        'INSERT INTO survey_answers (user_id, feedback, submitted_at) VALUES (?, ?, NOW())',
        [userId, feedback || '']
      );
      
      return { success: true, message: 'アンケートを保存しました' };
    } catch (error) {
      console.error('Survey save error:', error);
      return { success: false, message: 'データベースエラー' };
    }
  },
  
  // アンケート完了状態確認
  async getSurveyStatus(userId) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT id, submitted_at FROM survey_answers WHERE user_id = ?',
        [userId]
      );
      return {
        completed: rows.length > 0,
        submittedAt: rows.length > 0 ? rows[0].submitted_at : null
      };
    } catch (error) {
      console.error('Survey status error:', error);
      return { completed: false, submittedAt: null };
    }
  },
  
  // ランキング保存（ボーナスポイント対応）
  async saveRanking(userId, nickname, score, correctCount, withBonus = false) {
    const pool = getPool();
    try {
      // ボーナスポイント加算
      const finalScore = withBonus ? score + 10 : score;
      
      // 既存のランキングを更新または新規作成
      await pool.execute(
        `INSERT INTO rankings (user_id, nickname, score, correct_count, completed_at) 
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         score = VALUES(score), 
         correct_count = VALUES(correct_count),
         completed_at = VALUES(completed_at)`,
        [userId, nickname, finalScore, correctCount]
      );
      
      return { success: true, score: finalScore };
    } catch (error) {
      console.error('Ranking save error:', error);
      return { success: false, score: score };
    }
  },
  
  // ランキング取得
  async getRankings(limit = 100) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        `SELECT user_id as userId, nickname, score, correct_count as correctCount, completed_at
         FROM rankings 
         ORDER BY score DESC, completed_at ASC 
         LIMIT ?`,
        [limit]
      );
      return rows;
    } catch (error) {
      console.error('Get rankings error:', error);
      return [];
    }
  },
  
  // クイズ完了記録
  async saveQuizCompletion(userId, score, correctCount) {
    const pool = getPool();
    try {
      await pool.execute(
        `INSERT INTO quiz_completions (user_id, score, correct_count, completed_at) 
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         score = VALUES(score), 
         correct_count = VALUES(correct_count),
         completed_at = VALUES(completed_at)`,
        [userId, score, correctCount]
      );
      return { success: true };
    } catch (error) {
      console.error('Quiz completion save error:', error);
      return { success: false };
    }
  },
  
  // クイズ完了状態確認
  async getQuizCompletionStatus(userId) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT score, correct_count FROM quiz_completions WHERE user_id = ?',
        [userId]
      );
      return {
        isCompleted: rows.length > 0,
        score: rows.length > 0 ? rows[0].score : 0,
        correctCount: rows.length > 0 ? rows[0].correct_count : 0
      };
    } catch (error) {
      console.error('Quiz status error:', error);
      return { isCompleted: false, score: 0, correctCount: 0 };
    }
  },
  
  // 問題解答保存（非同期、エラー無視で既存処理を妨げない）
  async saveUserAnswer(userId, questionNumber, answer, isCorrect) {
    const pool = getPool();
    try {
      await pool.execute(
        'INSERT IGNORE INTO user_answers (user_id, question_number, answer, is_correct, answered_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, questionNumber, answer, isCorrect ? 1 : 0]
      );
      return { success: true };
    } catch (error) {
      // エラーをログに記録するが、既存処理は継続
      console.warn('MySQL user_answer save warning (non-critical):', error.message);
      return { success: false, error: error.message };
    }
  },
  
  // 接続テスト
  async testConnection() {
    const pool = getPool();
    try {
      const [rows] = await pool.execute('SELECT 1 as test');
      return rows.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
};

module.exports = MySQLHelper;