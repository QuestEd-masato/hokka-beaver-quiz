/**
 * hokkaクイズラリー - データベース機能
 * 分離日: 2025-08-10
 * 
 * 機能:
 * - ユーザー管理（登録、認証、データ保存）
 * - 問題管理（クイズデータ、CRUD操作）
 * - 回答管理（ユーザー回答、採点）
 * - データ永続化（JSON ファイル保存/読み込み）
 * - ランキング管理
 * - アンケート管理
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MySQLHelper = require('./mysql-helper');

// === パフォーマンス最適化設定 (Phase A2) ===
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'error' : 'info');

// 最適化されたログ関数
const logger = {
  info: (msg) => { if (LOG_LEVEL === 'info' || LOG_LEVEL === 'debug') console.log(msg); },
  error: (msg) => { console.error(msg); },
  debug: (msg) => { if (LOG_LEVEL === 'debug') console.log('DEBUG:', msg); }
};

// データディレクトリ設定
const DATA_DIR = './data';

/**
 * メインデータベースオブジェクト
 * メモリベースのデータ管理 + JSON永続化
 */
const Database = {
  users: new Map(),
  questions: new Map(),
  userAnswers: new Map(),
  quizSessions: new Map(),
  rankings: new Map(),
  surveyAnswers: new Map(),
  quizCompletions: new Map(), // クイズ完了状況を追跡
  
  // === パフォーマンス最適化用フィールド (Phase A1) ===
  _isDirty: false,        // データ変更フラグ
  _batchTimer: null,      // バッチ保存用タイマー
  _batchInterval: 1000,   // バッチ保存間隔（1秒）- セキュリティ修正
  
  /**
   * 非同期バッチ保存のスケジューリング (Phase A1 最適化)
   * データ変更を検知してバッチでまとめて保存
   */
  scheduleSave() {
    this._isDirty = true;
    
    // 既にタイマーが設定されている場合は何もしない
    if (this._batchTimer) {
      return;
    }
    
    // バッチ保存タイマーを設定
    this._batchTimer = setTimeout(async () => {
      if (this._isDirty) {
        try {
          await this.saveToFileAsync();
          this._isDirty = false;
          logger.info('📄 バッチ保存完了');
        } catch (error) {
          logger.error('❌ バッチ保存エラー:' + error.message);
          // エラー時は次回再試行のためフラグを維持
        }
      }
      this._batchTimer = null;
    }, this._batchInterval);
  },

  /**
   * 非同期でデータをファイルに保存 (Phase A1 最適化)
   * 全てのMapオブジェクトをJSONファイルに永続化
   */
  async saveToFileAsync() {
    const data = {
      users: Array.from(this.users.entries()),
      questions: Array.from(this.questions.entries()),
      userAnswers: Array.from(this.userAnswers.entries()),
      quizSessions: Array.from(this.quizSessions.entries()),
      rankings: Array.from(this.rankings.entries()),
      surveyAnswers: Array.from(this.surveyAnswers.entries()),
      quizCompletions: Array.from(this.quizCompletions.entries()),
      timestamp: new Date().toISOString()
    };
    
    // データディレクトリが存在しない場合は作成
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // 非同期でファイル書き込み
    const fs_promises = require('fs').promises;
    await fs_promises.writeFile(
      path.join(DATA_DIR, 'database.json'), 
      JSON.stringify(data, null, 2)
    );
  },

  /**
   * データをファイルに保存 (互換性維持用 - 段階的に置換予定)
   * 全てのMapオブジェクトをJSONファイルに永続化
   */
  saveToFile() {
    try {
      const data = {
        users: Array.from(this.users.entries()),
        questions: Array.from(this.questions.entries()),
        userAnswers: Array.from(this.userAnswers.entries()),
        quizSessions: Array.from(this.quizSessions.entries()),
        rankings: Array.from(this.rankings.entries()),
        surveyAnswers: Array.from(this.surveyAnswers.entries()),
        quizCompletions: Array.from(this.quizCompletions.entries()),
        timestamp: new Date().toISOString()
      };
      
      // データディレクトリが存在しない場合は作成
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      
      fs.writeFileSync(path.join(DATA_DIR, 'database.json'), JSON.stringify(data, null, 2));
      logger.info('✅ データを保存しました');
    } catch (error) {
      logger.error('❌ データ保存エラー:' + error.message);
    }
  },
  
  /**
   * ファイルからデータを読み込み
   * JSONファイルからMapオブジェクトを復元
   */
  loadFromFile() {
    try {
      const filePath = path.join(DATA_DIR, 'database.json');
      if (!fs.existsSync(filePath)) {
        console.log('📄 データファイルが見つかりません。新規作成します');
        return false;
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      this.users = new Map(data.users || []);
      this.questions = new Map(data.questions || []);
      this.userAnswers = new Map(data.userAnswers || []);
      this.quizSessions = new Map(data.quizSessions || []);
      this.rankings = new Map(data.rankings || []);
      this.surveyAnswers = new Map(data.surveyAnswers || []);
      this.quizCompletions = new Map(data.quizCompletions || []);
      
      logger.info(`✅ データを復元しました (${data.timestamp || '不明'})`);
      console.log(`👥 ユーザー数: ${this.users.size}, 📝 解答数: ${this.userAnswers.size}`);
      return true;
    } catch (error) {
      console.error('❌ データ読み込みエラー:', error.message);
      return false;
    }
  },
  
  /**
   * パスワードをハッシュ化
   * セキュリティのため平文保存を避ける
   */
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  },
  
  /**
   * ユーザー認証 - RDS統合版
   * ニックネームとパスワードでログイン確認
   */
  async authenticateUser(nickname, password) {
    try {
      // Memory Mapで認証
      for (let user of this.users.values()) {
        if (user.nickname === nickname && user.password_hash === this.hashPassword(password)) {
          logger.info(`ユーザー認証成功: ${nickname}`);
          return { ...user, password_hash: undefined }; // パスワードハッシュは返さない
        }
      }
      
      logger.info(`ユーザー認証失敗: ${nickname}`);
      return null;
    } catch (error) {
      logger.error(`ユーザー認証エラー: ${error.message}`);
      return null;
    }
  },
  
  /**
   * 新規ユーザー作成 - RDS統合版
   * 重複チェック + パスワードハッシュ化
   */
  async createUser(userData) {
    try {
      // パスワードハッシュ化
      const hashedUserData = {
        ...userData,
        password_hash: this.hashPassword(userData.password)
      };
      
      // MySQLHelperでRDS作成（重複チェック含む）
      const user = await MySQLHelper.createUser(hashedUserData);
      
      logger.info(`新規ユーザー作成: ${user.nickname}`);
      
      // Mapからの保存を削除（RDSに一元化）
      // this.users.set(user.id, user); // 削除
      // this.saveToFile(); // 削除
      
      return user;
    } catch (error) {
      logger.error(`ユーザー作成エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * ユーザー回答を保存 - RDS統合版
   * 問題番号と選択した答えを記録
   */
  async saveUserAnswer(userId, questionNumber, answer) {
    try {
      // MySQLHelperでRDS保存（正解判定含む）
      const result = await MySQLHelper.saveUserAnswer(userId, questionNumber, answer);
      
      logger.debug(`回答保存: ユーザー${userId} 問題${questionNumber} 答え${answer}`);
      
      // Mapからの保存を削除（RDSに一元化）
      // this.userAnswers.set(answerKey, userAnswer); // 削除
      // this.scheduleSave(); // 削除
      
      return {
        correct: result.isCorrect,
        correctAnswer: result.correctAnswer,
        explanation: null // 解説はMySQLHelperから今後取得
      };
    } catch (error) {
      logger.error(`回答保存エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * ユーザーの全回答を取得 - RDS統合版
   * スコア計算等で使用
   */
  async getUserAnswers(userId) {
    try {
      const answers = await MySQLHelper.getUserAnswers(userId);
      logger.debug(`ユーザー${userId}の回答数: ${answers.length}`);
      return answers.sort((a, b) => a.questionNumber - b.questionNumber);
    } catch (error) {
      logger.error(`ユーザー回答取得エラー: ${error.message}`);
      return [];
    }
  },
  
  /**
   * クイズ完了処理
   * 最終スコア計算とランキング更新
   */
  async completeQuiz(userId, additionalData = {}) {
    const answers = this.getUserAnswers(userId);
    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalQuestions = this.questions.size;
    const baseScore = (correctCount / totalQuestions) * 100;
    
    // アンケート完了確認（ボーナスポイント判定）
    const surveyStatus = await MySQLHelper.getSurveyStatus(userId);
    const bonusPoints = surveyStatus.completed ? 10 : 0;
    const finalScore = baseScore + bonusPoints;
    
    // クイズ完了をマーク（メモリ）
    this.quizCompletions.set(userId, {
      userId: userId,
      completedAt: new Date(),
      score: finalScore,
      baseScore: baseScore,
      bonusPoints: bonusPoints,
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      ...additionalData
    });
    
    // MySQLに保存
    await MySQLHelper.saveQuizCompletion(userId, finalScore, correctCount);
    
    // ランキング更新（メモリ + MySQL）
    const user = this.users.get(userId);
    const nickname = user ? user.nickname : 'Unknown';
    await this.updateRanking(userId, finalScore, correctCount, nickname, surveyStatus.completed);
    
    this.scheduleSave(); // Phase A1: バッチ保存に変更
    
    return {
      score: finalScore,
      baseScore: baseScore,
      bonusPoints: bonusPoints,
      correctCount: correctCount,
      totalQuestions: totalQuestions,
      answers: answers
    };
  },
  
  /**
   * ランキング更新
   * スコア順でランキングを管理
   */
  async updateRanking(userId, score, correctCount, nickname = null, hasBonus = false) {
    // メモリに保存
    this.rankings.set(userId, {
      userId: userId,
      score: score,
      correctCount: correctCount,
      updatedAt: new Date()
    });
    
    // MySQLに保存（ボーナス込み）
    if (nickname) {
      await MySQLHelper.saveRanking(userId, nickname, score, correctCount, false);
    }
  },
  
  /**
   * ランキング取得 - RDS統合版
   * スコア順でソート済みの結果を返す
   */
  async getRanking() {
    try {
      const rankings = await MySQLHelper.getRankings();
      
      // ランク付けとアンケート情報を追加
      return rankings.map((ranking, index) => {
        // アンケート回答状況をチェック
        const isSurveyCompleted = this.surveyAnswers.has(ranking.userId);
        const surveyBonus = isSurveyCompleted ? 10 : 0;
        
        return {
          rank: index + 1,
          nickname: ranking.nickname,
          userId: ranking.userId,
          score: ranking.score,
          correctCount: ranking.correctCount,
          completed_at: ranking.completed_at,
          surveyBonus: surveyBonus,
          surveyCompleted: isSurveyCompleted
        };
      });
    } catch (error) {
      logger.error(`ランキング取得エラー: ${error.message}`);
      return [];
    }
  },
  
  /**
   * データ整合性チェック - RDS統合版
   * RDS内のデータ一貫性を確認
   */
  async checkDataIntegrity() {
    try {
      console.log('🔍 RDSデータ整合性をチェック中...');
      
      // RDSでのデータ整合性チェック
      const users = await MySQLHelper.getAllUsers();
      const questions = await MySQLHelper.getAllQuestions();
      const answers = await MySQLHelper.getAllAnswers();
      
      console.log(`📀 RDSデータ状況:`);
      console.log(`  - ユーザー: ${users.length}件`);
      console.log(`  - 問題: ${questions.length}件`);
      console.log(`  - 回答: ${answers.length}件`);
      
      // 孤立回答チェック（SQL制約で防止済み）
      const orphanAnswers = answers.filter(answer => 
        !users.some(user => user.id === answer.userId)
      );
      
      if (orphanAnswers.length > 0) {
        console.log(`⚠️  孤立回答データ: ${orphanAnswers.length}件`);
      }
      
      console.log('✅ RDSデータ整合性チェック完了');
    } catch (error) {
      console.error('❌ データ整合性チェックエラー:', error.message);
    }
  },

  /**
   * 初期データ設定
   * ファイルからの復元または新規データ作成
   */
  init() {
    // まずファイルからデータを復元を試行
    const restored = this.loadFromFile();
    const hasValidData = this.questions.size > 0 && this.users.size > 0;
    
    if (restored && hasValidData) {
      // 有効なデータが復元された場合は初期データ設定をスキップ
      console.log(`✅ 有効データ復元: 問題${this.questions.size}問, ユーザー${this.users.size}名`);
      this.checkDataIntegrity();
      return;
    }
    
    if (restored && !hasValidData) {
      console.log('⚠️ 空データファイル検出: 初期データを作成します');
    } else {
      console.log('📄 データファイル未存在: 初期データを作成します');
    }
    
    // データが復元できなかった場合のみ初期データを設定
    console.log('🔧 初期データを作成します');
    
    // デフォルトアドミンユーザー
    this.users.set(1, {
      id: 1,
      nickname: 'admin',
      real_name: 'システム管理者',
      age_group: 'adult',
      gender: 'other',
      password_hash: this.hashPassword('admin123'),
      is_admin: true,
      created_at: new Date()
    });

    // デフォルト問題データ（北陸製菓の企業理念・企業努力に特化）
    const defaultQuestions = [
      {
        id: 1,
        question_number: 1,
        question_text: '北陸製菓の会社ができたのはいつでしょうか？',
        choice_a: '大正7年（1918年）',
        choice_b: '昭和25年（1950年）',
        choice_c: '昭和40年（1965年）',
        choice_d: '昭和45年（1970年）',
        correct_answer: 'A',
        explanation: '北陸製菓は大正7年（1918年）に創業しました。100年以上もの長い歴史を持つ老舗のお菓子会社で、長年にわたってみんなに愛される美味しいお菓子を作り続けています。'
      },
      {
        id: 2,
        question_number: 2,
        question_text: '北陸製菓が一番大切にしていることで正しいのはどれでしょうか？',
        choice_a: '安い商品をたくさん作る',
        choice_b: 'お客様に喜んでもらえる商品作り',
        choice_c: '新しい商品だけを作る',
        choice_d: '機械だけで作る',
        correct_answer: 'B',
        explanation: '北陸製菓は「お客様に喜んでもらえる商品作り」を一番大切にしています。美味しくて安全なお菓子を作って、みんなが笑顔になれるように心を込めて作っています。'
      },
      {
        id: 3,
        question_number: 3,
        question_text: '北陸製菓の「ビーバー」というお菓子の特徴はどれでしょうか？',
        choice_a: 'チョコレート味だけ',
        choice_b: '固くて食べにくい',
        choice_c: 'サクサクした食感',
        choice_d: '冷たいお菓子',
        correct_answer: 'C',
        explanation: 'ビーバーはサクサクした軽い食感が特徴のお菓子です。北陸製菓の技術と工夫により、誰でも食べやすく美味しいお菓子として多くの人に愛されています。'
      },
      {
        id: 4,
        question_number: 4,
        question_text: '北陸製菓が商品を作るときに一番気をつけていることは何でしょうか？',
        choice_a: '早く作ること',
        choice_b: '安全で美味しいこと',
        choice_c: '見た目だけきれいにすること',
        choice_d: '安い材料を使うこと',
        correct_answer: 'B',
        explanation: '北陸製菓では「安全で美味しいこと」を一番大切にしています。みんなが安心して食べられるように、きちんと確認して美味しいお菓子を作っています。'
      },
      {
        id: 5,
        question_number: 5,
        question_text: '北陸製菓の工場では、どのような工夫をしているでしょうか？',
        choice_a: '機械だけで作っている',
        choice_b: '衛生管理を徹底している',
        choice_c: '外で作っている',
        choice_d: '一人だけで作っている',
        correct_answer: 'B',
        explanation: '北陸製菓の工場ではとてもきれいにしています。清潔で安全なお菓子を作るために、働く人みんなで協力して美味しいお菓子作りをしています。'
      },
      {
        id: 6,
        question_number: 6,
        question_text: '北陸製菓が地域のために行っている活動はどれでしょうか？',
        choice_a: '地元の材料を使う',
        choice_b: '工場見学を受け入れる',
        choice_c: '地域のイベントに参加する',
        choice_d: '上記すべて',
        correct_answer: 'D',
        explanation: '北陸製菓は地域との繋がりを大切にしています。地元の材料を使ったり、工場見学を受け入れたり、地域のイベントに参加するなど、地域の皆さんと一緒に成長することを大切にしています。'
      },
      {
        id: 7,
        question_number: 7,
        question_text: '北陸製菓の商品づくりで大切にしている「伝統」とは何でしょうか？',
        choice_a: '昔からの美味しい作り方',
        choice_b: '古い機械だけを使う',
        choice_c: '同じ味だけを作る',
        choice_d: '昔の包装紙を使う',
        correct_answer: 'A',
        explanation: '北陸製菓では昔から受け継がれた美味しい作り方を大切にしています。新しい技術も取り入れながら、伝統的な美味しさを守り続けています。'
      },
      {
        id: 8,
        question_number: 8,
        question_text: '北陸製菓が環境のためにしていることで正しいのはどれでしょうか？',
        choice_a: '包装材料の工夫',
        choice_b: 'エネルギーの節約',
        choice_c: 'ゴミを減らす工夫',
        choice_d: '上記すべて',
        correct_answer: 'D',
        explanation: '北陸製菓は地球環境を大切にしています。包装材料を工夫したり、エネルギーを節約したり、ゴミを減らしたりして、美味しいお菓子作りと環境保護の両方を大切にしています。'
      },
      {
        id: 9,
        question_number: 9,
        question_text: '北陸製菓が新しい商品を作るときに一番大切にしていることは何でしょうか？',
        choice_a: '流行に合わせる',
        choice_b: 'お客様の声を聞く',
        choice_c: '値段を安くする',
        choice_d: '見た目をかっこよくする',
        correct_answer: 'B',
        explanation: '北陸製菓ではお客様の声をとても大切にしています。どんなお菓子が欲しいか、どうしたらもっと美味しくなるかを聞いて、みんなに喜んでもらえる商品作りをしています。'
      },
      {
        id: 10,
        question_number: 10,
        question_text: '北陸製菓の「これからの目標」で正しいのはどれでしょうか？',
        choice_a: 'もっとたくさんの人に美味しいお菓子を届ける',
        choice_b: '安全で安心なお菓子作りを続ける',
        choice_c: '地域の皆さんと一緒に成長する',
        choice_d: '上記すべて',
        correct_answer: 'D',
        explanation: '北陸製菓はこれからも、もっとたくさんの人に美味しいお菓子を届けたり、安全で安心なお菓子作りを続けたり、地域の皆さんと一緒に成長していくことを目標にしています。'
      }
    ];

    // 問題データを設定
    defaultQuestions.forEach(question => {
      this.questions.set(question.id, question);
    });

    // テストユーザー（デモ用）
    this.users.set(2, {
      id: 2,
      nickname: 'test',
      real_name: 'テストユーザー',
      age_group: 'elementary',
      gender: 'other',
      password_hash: this.hashPassword('test123'),
      is_admin: false,
      created_at: new Date()
    });

    this.users.set(3, {
      id: 3,
      nickname: 'aaa',
      real_name: 'テストユーザー2',
      age_group: 'junior_high',
      gender: 'other',
      password_hash: this.hashPassword('aaa123'),
      is_admin: false,
      created_at: new Date()
    });

    // テストユーザー用のデモデータ（マイページ表示確認用）
    // testユーザーのクイズ完了データを追加
    const testUserId = 2;
    
    // testユーザーの回答データ（3問正解、7問不正解）
    const testAnswers = [
      { questionId: 1, answer: 'A', isCorrect: true },   // 正解
      { questionId: 2, answer: 'B', isCorrect: true },   // 正解
      { questionId: 3, answer: 'A', isCorrect: false },  // 不正解
      { questionId: 4, answer: 'C', isCorrect: false },  // 不正解
      { questionId: 5, answer: 'B', isCorrect: true },   // 正解
      { questionId: 6, answer: 'A', isCorrect: false },  // 不正解
      { questionId: 7, answer: 'C', isCorrect: false },  // 不正解
      { questionId: 8, answer: 'B', isCorrect: false },  // 不正解
      { questionId: 9, answer: 'C', isCorrect: false },  // 不正解
      { questionId: 10, answer: 'A', isCorrect: false }  // 不正解
    ];
    
    // 回答データをuserAnswersに保存
    testAnswers.forEach(ans => {
      const key = `${testUserId}_${ans.questionId}`;
      this.userAnswers.set(key, {
        userId: testUserId,
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect: ans.isCorrect,
        answeredAt: new Date()
      });
    });
    
    // クイズ完了データを保存
    this.quizCompletions.set(testUserId, {
      userId: testUserId,
      score: 30,  // 3問正解 × 10点
      correctCount: 3,
      totalQuestions: 10,
      completedAt: new Date()
    });

    // データを保存
    this.saveToFile();
  },
  
  /**
   * 問題追加（管理者専用）
   */
  /**
   * 問題追加 - RDS統合版
   */
  async addQuestion(questionData) {
    try {
      // MySQLHelperでRDS作成（重複チェック含む）
      const question = await MySQLHelper.createQuestion(questionData);
      
      logger.info(`新規問題作成: 問題${question.question_number}`);
      
      // Mapからの保存を削除（RDSに一元化）
      // this.questions.set(questionId, question); // 削除
      // this.saveToFile(); // 削除
      
      return question;
    } catch (error) {
      logger.error(`問題作成エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * 全ユーザー情報取得 - RDS統合版
   */
  async getAllUsers() {
    try {
      const users = Array.from(this.users.values());
      logger.debug(`取得ユーザー数: ${users.length}`);
      return users;
    } catch (error) {
      logger.error(`全ユーザー取得エラー: ${error.message}`);
      return [];
    }
  },
  
  /**
   * 管理者チェック - RDS統合版
   */
  async isAdmin(user) {
    try {
      if (user && user.id) {
        const userData = this.users.get(user.id);
        if (userData && userData.is_admin) {
          return { ...userData, password_hash: undefined };
        }
      }
      return null;
    } catch (error) {
      logger.error(`管理者チェックエラー: ${error.message}`);
      return null;
    }
  },
  
  /**
   * ユーザー削除 - RDS統合版
   */
  async deleteUser(userId, adminUser) {
    try {
      // 管理者権限チェック
      const admin = await this.isAdmin(adminUser);
      if (!admin) {
        throw new Error('管理者権限が必要です');
      }
      
      // 自己削除防止
      if (userId === adminUser.id) {
        throw new Error('自分自身は削除できません');
      }
      
      // ユーザー存在チェック
      const userData = await MySQLHelper.getUserById(userId);
      if (!userData) {
        throw new Error('ユーザーが見つかりません');
      }
      
      // 管理者の削除防止（安全対策）
      if (userData.is_admin) {
        throw new Error('管理者ユーザーは削除できません');
      }
      
      // 関連データも削除（RDS版）
      await this.deleteUserRelatedData(userId);
      
      // ユーザー削除（RDS）
      const deleteResult = await MySQLHelper.deleteUser(userId);
      
      if (deleteResult.success) {
        logger.info(`ユーザー削除完了: ${userData.nickname}`);
        return { success: true, deletedUser: userData.nickname };
      } else {
        throw new Error('ユーザー削除に失敗しました');
      }
    } catch (error) {
      logger.error(`ユーザー削除エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * ユーザー関連データ削除 - RDS統合版
   * ユーザー削除前に関連データを削除
   */
  async deleteUserRelatedData(userId) {
    try {
      logger.debug(`ユーザー${userId}の関連データ削除開始`);
      
      // RDSの関連データ削除はSQLのFOREIGN KEY CASCADEで自動実行される
      // ここでは明示的なクリーンアップを実行
      
      // 1. ユーザー回答データ削除（user_answersテーブル）
      const userAnswers = await MySQLHelper.getUserAnswers(userId);
      logger.debug(`削除対象回答: ${userAnswers.length}件`);
      
      // 2. Mapからのデータ削除（一部はMap管理のまま）
      // quiz_sessions (違いはMap管理)
      for (const [key, session] of this.quizSessions) {
        if (session.userId === userId) {
          this.quizSessions.delete(key);
        }
      }
      
      logger.debug(`ユーザー${userId}の関連データ削除完了`);
    } catch (error) {
      logger.error(`関連データ削除エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * ユーザー情報更新 - RDS統合版
   */
  async updateUser(userId, updateData, adminUser) {
    try {
      // 管理者権限チェック
      const admin = await this.isAdmin(adminUser);
      if (!admin) {
        throw new Error('管理者権限が必要です');
      }
      
      // MySQLHelperでRDS更新（重複チェック含む）
      const result = await MySQLHelper.updateUser(userId, updateData);
      
      if (result.success) {
        logger.info(`ユーザー更新: ${userId}`);
        
        // 更新後のデータを取得
        const updatedUser = await MySQLHelper.getUserById(userId);
        
        return {
          success: true,
          user: updatedUser
        };
      } else {
        throw new Error('ユーザー更新に失敗しました');
      }
    } catch (error) {
      logger.error(`ユーザー更新エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * スコアCSV出力
   */
  async getScoresCSV() {
    const csvData = [
      ['順位', 'ニックネーム', '年齢層', 'スコア', '正解数', '完了日時']
    ];

    const rankings = await this.getRanking();
    rankings.forEach(ranking => {
      const completion = this.quizCompletions.get(ranking.userId);
      const completedAt = completion ? 
        new Date(completion.completedAt).toLocaleString('ja-JP') : '未完了';
      
      csvData.push([
        ranking.rank,
        ranking.nickname,
        ranking.age_group,
        `${ranking.score}%`,
        `${ranking.correctCount}/10`,
        completedAt
      ]);
    });

    return csvData.map(row => row.join(',')).join('\n');
  },
  
  /**
   * アンケートCSV出力
   */
  getSurveyCSV() {
    const csvData = [
      ['ユーザーID', 'ニックネーム', '感想', 'アンケート回答日時']
    ];

    for (const [userId, survey] of this.surveyAnswers) {
      const user = this.users.get(userId);
      const submittedAt = new Date(survey.submittedAt).toLocaleString('ja-JP');
      
      csvData.push([
        userId,
        user ? user.nickname : 'Unknown',
        survey.feedback || '',
        submittedAt
      ]);
    }

    return csvData.map(row => row.join(',')).join('\n');
  },
  
  /**
   * 問題CSV出力
   */
  getQuestionsCSV() {
    const csvData = [
      ['問題番号', '問題文', '正解率', '選択肢A', '選択肢B', '選択肢C', '選択肢D']
    ];

    const questions = Array.from(this.questions.values())
      .sort((a, b) => a.question_number - b.question_number);

    questions.forEach(question => {
      // この問題に対する正解率を計算
      const totalAnswers = Array.from(this.userAnswers.values())
        .filter(answer => answer.questionNumber === question.question_number).length;
      
      const correctAnswers = Array.from(this.userAnswers.values())
        .filter(answer => 
          answer.questionNumber === question.question_number && 
          answer.isCorrect
        ).length;

      const correctRate = totalAnswers > 0 ? 
        Math.round((correctAnswers / totalAnswers) * 100) : 0;

      csvData.push([
        question.question_number,
        question.question_text,
        `${correctRate}%`,
        question.choice_a,
        question.choice_b,
        question.choice_c,
        question.choice_d
      ]);
    });

    return csvData.map(row => row.join(',')).join('\n');
  },
  
  /**
   * 問題更新（管理者専用）
   */
  /**
   * 問題更新 - RDS統合版
   */
  async updateQuestion(questionId, updateData, adminUser) {
    try {
      // 管理者権限チェック
      const admin = await this.isAdmin(adminUser);
      if (!admin) {
        throw new Error('管理者権限が必要です');
      }
      
      // MySQLHelperでRDS更新
      const result = await MySQLHelper.updateQuestion(questionId, updateData);
      
      if (result.success) {
        logger.info(`問題更新: ${questionId}`);
        
        // 更新後のデータを取得
        const updatedQuestion = await MySQLHelper.getQuestionById(questionId);
        
        return {
          success: true,
          question: updatedQuestion
        };
      } else {
        throw new Error('問題更新に失敗しました');
      }
    } catch (error) {
      logger.error(`問題更新エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * 問題削除 - RDS統合版
   */
  async deleteQuestion(questionId, adminUser) {
    try {
      // 管理者権限チェック
      const admin = await this.isAdmin(adminUser);
      if (!admin) {
        throw new Error('管理者権限が必要です');
      }
      
      // 問題存在チェック
      const question = await MySQLHelper.getQuestionById(questionId);
      if (!question) {
        throw new Error('問題が見つかりません');
      }
      
      // 最低問題数チェック（1問は残す）
      const allQuestions = await MySQLHelper.getAllQuestions();
      if (allQuestions.length <= 1) {
        throw new Error('最低1問は必要です。削除できません');
      }
      
      // 関連回答データの確認（警告表示用）
      // 実際の削除はSQL CASCADEで自動実行
      const relatedAnswers = await MySQLHelper.getAllAnswers();
      const affectedAnswers = relatedAnswers.filter(answer => 
        answer.questionNumber === question.question_number
      );
      
      if (affectedAnswers.length > 0) {
        logger.info(`問題削除により${affectedAnswers.length}件の回答も削除されます`);
      }
      
      // 問題削除（RDS）
      const deleteResult = await MySQLHelper.deleteQuestion(questionId);
      
      if (deleteResult.success) {
        logger.info(`問題削除完了: ${question.question_text}`);
        return {
          success: true,
          deletedQuestion: question.question_text,
          affectedAnswers: affectedAnswers.length
        };
      } else {
        throw new Error('問題削除に失敗しました');
      }
    } catch (error) {
      logger.error(`問題削除エラー: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * 参加者詳細情報取得（管理者専用）
   */
  getParticipantsWithDetails() {
    const participants = [];
    
    for (const [userId, user] of this.users) {
      if (user.is_admin) continue; // 管理者は除外
      
      // ユーザーの回答数と正解数を計算
      const userAnswers = this.getUserAnswers(userId);
      const correctCount = userAnswers.filter(a => a.isCorrect).length;
      
      // クイズ完了状況
      const isQuizCompleted = this.quizCompletions.has(userId);
      const completion = this.quizCompletions.get(userId);
      
      // アンケート状況
      const isSurveyCompleted = this.surveyAnswers.has(userId);
      
      // ランキング情報
      const ranking = this.rankings.get(userId);
      
      participants.push({
        id: userId,
        nickname: user.nickname,
        real_name: user.real_name,
        age_group: user.age_group,
        gender: user.gender,
        created_at: user.created_at,
        quiz: {
          completed: isQuizCompleted,
          answeredCount: userAnswers.length,
          correctCount: correctCount,
          score: completion ? completion.score : 0,
          completedAt: completion ? completion.completedAt : null
        },
        survey: {
          completed: isSurveyCompleted
        },
        ranking: ranking ? {
          score: ranking.score,
          correctCount: ranking.correctCount
        } : null
      });
    }
    
    // 作成日時順でソート
    participants.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return participants;
  }
};

module.exports = Database;