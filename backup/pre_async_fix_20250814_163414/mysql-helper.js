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
        `SELECT r.user_id as userId, u.nickname, r.score, r.correct_count as correctCount, r.updated_at as completed_at
         FROM rankings r
         JOIN users u ON r.user_id = u.id
         ORDER BY r.score DESC, r.updated_at ASC 
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
  
  // === Phase 1: Users管理機能 ===
  // ユーザー作成
  async createUser(userData) {
    const pool = getPool();
    try {
      // 重複チェック
      const [existing] = await pool.execute(
        'SELECT id FROM users WHERE nickname = ?',
        [userData.nickname]
      );
      
      if (existing.length > 0) {
        throw new Error('ニックネームが既に使用されています');
      }
      
      // 新規ユーザー作成
      const [result] = await pool.execute(
        `INSERT INTO users (nickname, real_name, age_group, gender, password_hash, is_admin, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          userData.nickname,
          userData.real_name || '',
          userData.age_group,
          userData.gender || 'other',
          userData.password_hash,
          userData.is_admin || false
        ]
      );
      
      return {
        id: result.insertId,
        nickname: userData.nickname,
        real_name: userData.real_name,
        age_group: userData.age_group,
        gender: userData.gender,
        is_admin: userData.is_admin || false
      };
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },
  
  // ユーザーID取得
  async getUserById(id) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT id, nickname, real_name, age_group, gender, is_admin, created_at FROM users WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Get user by ID error:', error);
      return null;
    }
  },
  
  // ニックネーム取得
  async getUserByNickname(nickname) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT id, nickname, real_name, age_group, gender, password_hash, is_admin, created_at FROM users WHERE nickname = ?',
        [nickname]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Get user by nickname error:', error);
      return null;
    }
  },
  
  // 全ユーザー取得
  async getAllUsers() {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT id, nickname, real_name, age_group, gender, is_admin, created_at FROM users ORDER BY created_at ASC'
      );
      return rows;
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  },
  
  // ユーザー更新
  async updateUser(id, userData) {
    const pool = getPool();
    try {
      const [result] = await pool.execute(
        `UPDATE users SET 
         nickname = ?, real_name = ?, age_group = ?, gender = ?, 
         password_hash = COALESCE(?, password_hash), is_admin = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          userData.nickname,
          userData.real_name,
          userData.age_group,
          userData.gender,
          userData.password_hash, // nullの場合は既存値維持
          userData.is_admin,
          id
        ]
      );
      return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },
  
  // ユーザー削除
  async deleteUser(id) {
    const pool = getPool();
    try {
      const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
      return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },
  
  // ユーザー認証
  async authenticateUser(nickname, passwordHash) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT id, nickname, real_name, age_group, gender, is_admin FROM users WHERE nickname = ? AND password_hash = ?',
        [nickname, passwordHash]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Authenticate user error:', error);
      return null;
    }
  },
  
  // === Phase 1: Questions管理機能 ===
  // 問題作成
  async createQuestion(questionData) {
    const pool = getPool();
    try {
      // 重複チェック（question_number）
      const [existing] = await pool.execute(
        'SELECT id FROM questions WHERE question_number = ?',
        [questionData.question_number]
      );
      
      if (existing.length > 0) {
        throw new Error('問題番号が既に使用されています');
      }
      
      // 新規問題作成
      const [result] = await pool.execute(
        `INSERT INTO questions (question_number, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          questionData.question_number,
          questionData.question_text,
          questionData.choice_a,
          questionData.choice_b,
          questionData.choice_c,
          questionData.choice_d,
          questionData.correct_answer,
          questionData.explanation
        ]
      );
      
      return {
        id: result.insertId,
        question_number: questionData.question_number,
        question_text: questionData.question_text,
        choice_a: questionData.choice_a,
        choice_b: questionData.choice_b,
        choice_c: questionData.choice_c,
        choice_d: questionData.choice_d,
        correct_answer: questionData.correct_answer,
        explanation: questionData.explanation
      };
    } catch (error) {
      console.error('Create question error:', error);
      throw error;
    }
  },
  
  // 問題取得（ID）
  async getQuestionById(id) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM questions WHERE id = ?',
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Get question by ID error:', error);
      return null;
    }
  },
  
  // 問題取得（番号）
  async getQuestionByNumber(questionNumber) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM questions WHERE question_number = ?',
        [questionNumber]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Get question by number error:', error);
      return null;
    }
  },
  
  // 全問題取得
  async getAllQuestions() {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM questions ORDER BY question_number ASC'
      );
      return rows;
    } catch (error) {
      console.error('Get all questions error:', error);
      return [];
    }
  },
  
  // 問題更新
  async updateQuestion(id, questionData) {
    const pool = getPool();
    try {
      const [result] = await pool.execute(
        `UPDATE questions SET 
         question_number = ?, question_text = ?, choice_a = ?, choice_b = ?, 
         choice_c = ?, choice_d = ?, correct_answer = ?, explanation = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          questionData.question_number,
          questionData.question_text,
          questionData.choice_a,
          questionData.choice_b,
          questionData.choice_c,
          questionData.choice_d,
          questionData.correct_answer,
          questionData.explanation,
          id
        ]
      );
      return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Update question error:', error);
      throw error;
    }
  },
  
  // 問題削除
  async deleteQuestion(id) {
    const pool = getPool();
    try {
      const [result] = await pool.execute('DELETE FROM questions WHERE id = ?', [id]);
      return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
    } catch (error) {
      console.error('Delete question error:', error);
      throw error;
    }
  },
  
  // === Phase 1: UserAnswers管理機能 ===
  // ユーザー回答保存
  async saveUserAnswer(userId, questionNumber, answer) {
    const pool = getPool();
    try {
      // 問題存在確認
      const [questionCheck] = await pool.execute(
        'SELECT id, correct_answer FROM questions WHERE question_number = ?',
        [questionNumber]
      );
      
      if (questionCheck.length === 0) {
        throw new Error('問題が見つかりません');
      }
      
      const question = questionCheck[0];
      const isCorrect = question.correct_answer === answer;
      
      // 回答保存（重複時は更新）
      await pool.execute(
        `INSERT INTO user_answers (user_id, question_number, answer, is_correct, answered_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
         answer = VALUES(answer), is_correct = VALUES(is_correct), answered_at = VALUES(answered_at)`,
        [userId, questionNumber, answer, isCorrect]
      );
      
      return {
        userId: userId,
        questionNumber: questionNumber,
        answer: answer,
        isCorrect: isCorrect,
        correct: isCorrect,
        correctAnswer: question.correct_answer
      };
    } catch (error) {
      console.error('Save user answer error:', error);
      throw error;
    }
  },
  
  // ユーザー回答取得
  async getUserAnswers(userId) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        `SELECT ua.user_id as userId, ua.question_number as questionNumber, 
         ua.answer, ua.is_correct as isCorrect, ua.answered_at as answeredAt
         FROM user_answers ua
         WHERE ua.user_id = ?
         ORDER BY ua.question_number ASC`,
        [userId]
      );
      return rows;
    } catch (error) {
      console.error('Get user answers error:', error);
      return [];
    }
  },
  
  // 特定の回答取得
  async getAnswerByUserAndQuestion(userId, questionNumber) {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        `SELECT ua.user_id as userId, ua.question_number as questionNumber,
         ua.answer, ua.is_correct as isCorrect, ua.answered_at as answeredAt
         FROM user_answers ua
         WHERE ua.user_id = ? AND ua.question_number = ?`,
        [userId, questionNumber]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('Get answer by user and question error:', error);
      return null;
    }
  },
  
  // 全回答取得
  async getAllAnswers() {
    const pool = getPool();
    try {
      const [rows] = await pool.execute(
        `SELECT ua.id, ua.user_id as userId, ua.question_number as questionNumber,
         ua.answer, ua.is_correct as isCorrect, ua.answered_at as answeredAt,
         u.nickname
         FROM user_answers ua
         LEFT JOIN users u ON ua.user_id = u.id
         ORDER BY ua.answered_at DESC`
      );
      return rows;
    } catch (error) {
      console.error('Get all answers error:', error);
      return [];
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