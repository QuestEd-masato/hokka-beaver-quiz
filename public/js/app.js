/**
 * hokkaクイズラリー - メインアプリケーション
 * 作成日: 2025-07-14
 * 
 * シンプルな仕組みでモダンUIを実現
 */

console.log('app.js が読み込まれました');

// === グローバル状態管理 ===
const AppState = {
  currentUser: null,
  authChecked: false,  // 認証状態キャッシュフラグ（多重実行防止）
  currentQuestion: 1,
  answers: {},
  totalQuestions: 10,
  score: 0,
  isQuizCompleted: false,
  startTime: null,
  endTime: null
};

// === ユーティリティ関数 ===
const Utils = {
  // 要素取得
  $(selector) {
    return document.querySelector(selector);
  },
  
  $$(selector) {
    return document.querySelectorAll(selector);
  },
  
  // ローカルストレージ（スマホ対応強化）
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      // 保存確認（スマホブラウザ対応）
      const verification = localStorage.getItem(key);
      if (!verification) {
        console.warn(`LocalStorage保存失敗: ${key}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error(`LocalStorage保存エラー (${key}):`, error);
      return false;
    }
  },
  
  loadFromStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`LocalStorage読み込みエラー (${key}):`, error);
      this.removeFromStorage(key); // 破損データを削除
      return null;
    }
  },
  
  removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`LocalStorage削除エラー (${key}):`, error);
    }
  },
  
  // API通信（スマホキャッシュ対策）
  async apiCall(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...options.headers
        },
        cache: 'no-store', // スマホブラウザのキャッシュ無効化
        ...options
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Response Error:', response.status, errorData);
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response Success:', url, data);
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  // フォームデータ取得
  getFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  },
  
  // エラー表示
  showError(message) {
    const errorDiv = Utils.$('#error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    } else {
      alert(message);
    }
  },
  
  // 成功メッセージ表示
  showSuccess(message) {
    const successDiv = Utils.$('#success-message');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.style.display = 'block';
      setTimeout(() => {
        successDiv.style.display = 'none';
      }, 3000);
    }
  },
  
  // 情報メッセージ表示（ボタン無効化時などに使用）
  showInfo(message) {
    // アラートで表示（シンプルな実装）
    alert(message);
  },
  
  // アラート表示（admin.js互換性対応）
  showAlert(message) {
    // showInfo と同様の動作（admin.js での Utils.showAlert 呼び出し対応）
    alert(message);
  },
  
  // ページ遷移（削除予定 - 直接window.location.hrefを使用）
  
  // 進捗バー更新
  updateProgressBar(current, total) {
    const progressBar = Utils.$('.progress-bar');
    if (progressBar) {
      const percentage = (current / total) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }
};

// === 認証機能 ===
const Auth = {
  // ログイン（シンプル化）
  async login(credentials) {
    // 完全なログイン状態リセット（混乱防止）
    this.clearAuthData();
    
    try {
      const result = await Utils.apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      
      if (result.success) {
        // ユーザーデータの整合性確認
        if (result.user && result.user.id && result.user.nickname) {
          AppState.currentUser = result.user;
          Utils.saveToStorage('currentUser', result.user);
          Utils.saveToStorage('auth_token', Date.now()); // 認証トークン代替
          
          // スマホ対応: LocalStorage保存確認
          const saved = Utils.loadFromStorage('currentUser');
          if (saved && saved.id === result.user.id) {
            console.log('ログイン成功 - データ保存確認済み:', result.user.nickname);
          } else {
            console.warn('LocalStorage保存に問題があります');
          }
          
          return result.user;
        } else {
          throw new Error('サーバーからの応答データが不正です');
        }
      } else {
        throw new Error(result.error || 'ログインに失敗しました');
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  },
  
  // 完全なデータクリア（認証混乱防止・キャッシュクリア対応）
  clearAuthData() {
    Utils.removeFromStorage('currentUser');
    Utils.removeFromStorage('auth_token');
    Utils.removeFromStorage('quizAnswers');
    Utils.removeFromStorage('quizResult');
    AppState.currentUser = null;
    AppState.authChecked = false;  // 認証キャッシュもクリア
  },
  
  // ログアウト（完全化・キャッシュクリア対応）
  logout() {
    this.clearAuthData();
    AppState.authChecked = false;  // 認証キャッシュをクリア
    window.location.href = '/';
  },
  
  // 認証状態確認（多重実行防止・キャッシュ機能付き）
  isAuthenticated() {
    // キャッシュされた認証状態がある場合は即座に返答（多重実行防止）
    if (AppState.authChecked && AppState.currentUser) {
      return true;
    }
    
    // キャッシュされた認証状態が「認証なし」の場合も即座に返答
    if (AppState.authChecked && !AppState.currentUser) {
      return false;
    }
    
    // 初回のみ認証復元処理を実行
    const savedUser = Utils.loadFromStorage('currentUser');
    const authToken = Utils.loadFromStorage('auth_token');
    
    // より厳密な検証（スマホ対応）
    if (savedUser && authToken && savedUser.id && savedUser.nickname) {
      // データ整合性確認
      if (typeof savedUser.id === 'number' && savedUser.nickname.length > 0) {
        AppState.currentUser = savedUser;
        AppState.authChecked = true;  // キャッシュフラグ設定
        console.log('認証復元成功:', savedUser.nickname, 'ID:', savedUser.id);
        return true;
      }
    }
    
    // 不整合データのクリア（詳細ログ付き）
    console.log('認証データ不整合 - savedUser:', savedUser, 'authToken:', authToken);
    this.clearAuthData();
    AppState.authChecked = true;  // 認証失敗もキャッシュ
    return false;
  },
  
  // 現在のユーザー取得（シンプル化）
  getCurrentUser() {
    if (!this.isAuthenticated()) {
      return null;
    }
    return AppState.currentUser;
  }
};

// === クイズ機能 ===
const Quiz = {
  questions: [],
  
  // 問題データ読み込み
  async loadQuestions() {
    try {
      const result = await Utils.apiCall('/api/quiz/questions');
      // サーバーは配列を直接返すので、result.questionsではなくresultを使用
      let questions = Array.isArray(result) ? result : (result.questions || []);
      
      // 重複問題の除去（question_numberが同じ場合、IDが小さい方を採用）
      const questionMap = new Map();
      questions.forEach(q => {
        const existing = questionMap.get(q.question_number);
        if (!existing || q.id < existing.id) {
          questionMap.set(q.question_number, q);
        }
      });
      
      // 問題番号順にソート
      this.questions = Array.from(questionMap.values()).sort((a, b) => a.question_number - b.question_number);
      
      console.log(`✅ 問題データ読み込み完了: ${this.questions.length}問`);
      return this.questions;
    } catch (error) {
      console.error('問題読み込みエラー:', error);
      Utils.showError('問題の読み込みに失敗しました。');
      return [];
    }
  },
  
  // 保存された解答読み込み（削除予定 - 現在は使用されていない）
  
  // 解答保存
  async saveAnswer(questionNumber, answer) {
    if (!Auth.isAuthenticated()) return false;
    
    try {
      const result = await Utils.apiCall('/api/quiz/answer', {
        method: 'POST',
        body: JSON.stringify({
          userId: AppState.currentUser.id,
          questionNumber,
          answer
        })
      });
      
      if (result.success) {
        AppState.answers[questionNumber] = answer;
        Utils.saveToStorage('quizAnswers', AppState.answers);
        return true;
      }
    } catch (error) {
      console.error('解答保存エラー:', error);
      Utils.showError(error.message || '解答の保存に失敗しました');
      return false;
    }
  },
  
  // 既存の回答をサーバーから読み込み
  async loadExistingAnswers() {
    if (!AppState.currentUser?.id) {
      console.log('ユーザー情報が不足しています');
      AppState.answers = Utils.loadFromStorage('quizAnswers') || {};
      return;
    }
    
    try {
      console.log('サーバーから既存回答を読み込み中...', AppState.currentUser.id);
      const resultsResponse = await Utils.apiCall(`/api/quiz/results/${AppState.currentUser.id}`);
      
      // サーバーから取得したデータを AppState.answers に変換
      const serverAnswers = {};
      if (resultsResponse && resultsResponse.results && Array.isArray(resultsResponse.results)) {
        resultsResponse.results.forEach(result => {
          if (result.userAnswer && result.questionNumber) {
            serverAnswers[result.questionNumber] = result.userAnswer;
          }
        });
      }
      
      console.log(`✅ サーバーから${Object.keys(serverAnswers).length}問の回答を復元:`, serverAnswers);
      
      // LocalStorageとの比較・統合
      const localAnswers = Utils.loadFromStorage('quizAnswers') || {};
      const localCount = Object.keys(localAnswers).length;
      const serverCount = Object.keys(serverAnswers).length;
      
      // サーバーデータを優先、LocalStorageをバックアップとして使用
      if (serverCount >= localCount) {
        AppState.answers = { ...localAnswers, ...serverAnswers }; // サーバーデータで上書き
        console.log(`📊 サーバーデータ優先: Server(${serverCount}) >= Local(${localCount})`);
      } else {
        AppState.answers = { ...serverAnswers, ...localAnswers }; // LocalStorageで補完
        console.log(`📊 LocalStorage優先: Server(${serverCount}) < Local(${localCount})`);
      }
      
      // LocalStorageを最新状態に同期
      Utils.saveToStorage('quizAnswers', AppState.answers);
      
      console.log(`🔄 最終的な回答データ(${Object.keys(AppState.answers).length}問):`, AppState.answers);
      
    } catch (error) {
      console.log('サーバーデータ読み込みエラー:', error);
      // フォールバック: LocalStorageから読み込み
      AppState.answers = Utils.loadFromStorage('quizAnswers') || {};
      console.log('LocalStorageから復旧:', AppState.answers);
      throw error; // 上位でハンドルするためにエラーを再throw
    }
  },
  
  // 問題表示（問題文なし、解答欄のみ）
  displayQuestion(questionNumber) {
    console.log(`🔍 displayQuestion called: questionNumber=${questionNumber}, totalQuestions=${this.questions.length}`);
    console.log('Available questions:', this.questions.map(q => `Q${q.question_number}(ID:${q.id})`));
    
    const question = this.questions.find(q => q.question_number === questionNumber);
    if (!question) {
      console.error(`❌ Question ${questionNumber} not found!`);
      const questionContainer = Utils.$('#question-container');
      if (questionContainer) {
        questionContainer.innerHTML = `<p style="text-align: center; color: var(--error);">問題${questionNumber}が見つかりません。ページを再読み込みしてください。</p>`;
      }
      return;
    }
    
    console.log(`✅ Question ${questionNumber} found:`, question.question_text.substring(0, 50) + '...');
    
    const questionContainer = Utils.$('#question-container');
    const savedAnswer = AppState.answers[questionNumber];
    const isAnswered = savedAnswer !== undefined;
    const isCorrect = isAnswered ? savedAnswer === question.correct_answer : false;
    
    questionContainer.innerHTML = `
      <div class="question-card fade-in">
        <div class="question-header" style="text-align: center; margin-bottom: 2rem;">
          <div class="question-number">${questionNumber}</div>
          <h3 style="color: var(--primary); margin: 1rem 0;">問題 ${questionNumber} の解答を選択してください</h3>
          <p style="color: var(--gray); font-size: var(--font-size-sm);">
            💡 会場内の紙に印刷された問題 ${questionNumber} を読んで、正しい答えを選んでください
          </p>
        </div>
        
        ${isAnswered ? `
          <div class="answer-result" style="
            text-align: center; 
            padding: 1.5rem; 
            margin-bottom: 2rem; 
            border-radius: var(--border-radius);
            background: rgba(210, 105, 30, 0.1);
            border: 2px solid var(--primary);
          ">
            <div style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--primary);">
              📝 解答済み（変更可能）
            </div>
            <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 1rem;">
              現在の選択: ${savedAnswer}
            </div>
            <div style="font-size: 1rem; color: var(--gray);">
              クイズ提出前なら、別の選択肢を選んで変更できます
            </div>
          </div>
        ` : ''}
        
        <div class="choices">
          ${['A', 'B', 'C', 'D'].map(choice => {
            let choiceClass = '';
            if (isAnswered) {
              if (choice === question.correct_answer) {
                choiceClass = 'correct';
              } else if (choice === savedAnswer && choice !== question.correct_answer) {
                choiceClass = 'incorrect';
              }
            } else if (savedAnswer === choice) {
              choiceClass = 'selected';
            }
            
            return `
              <div class="choice-item ${choiceClass}" 
                   data-choice="${choice}" 
                   onclick="Quiz.selectAnswer(${questionNumber}, '${choice}')">
                <span class="choice-label">${choice}.</span>
                <span class="choice-text">${question[`choice_${choice.toLowerCase()}`]}</span>
                ${choice === savedAnswer ? '<span style="margin-left: auto; color: var(--success); font-weight: 600;">✓ 選択中</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    Utils.updateProgressBar(questionNumber, AppState.totalQuestions);
  },
  
  // 解答選択（完了前は編集可能）
  async selectAnswer(questionNumber, choice) {
    try {
      // 解答保存（既存解答があれば更新）
      const success = await this.saveAnswer(questionNumber, choice);
      if (!success) {
        return; // 保存失敗時は処理を終了
      }
      
      // UI更新（保存成功後）
      const choices = Utils.$$('.choice-item');
      choices.forEach(item => {
        item.classList.remove('selected');
        // ホバー効果も一時的に無効化して色の混在を防ぐ
        item.style.pointerEvents = 'none';
      });
      const selectedItem = Utils.$(`[data-choice="${choice}"]`);
      selectedItem.classList.add('selected');
      
      // 少し遅れてホバー効果を再有効化
      setTimeout(() => {
        choices.forEach(item => {
          item.style.pointerEvents = 'auto';
        });
      }, 300);
      
      // 既存の確認メッセージを削除
      const questionContainer = Utils.$('#question-container');
      const existingConfirm = questionContainer.querySelector('.answer-confirm');
      if (existingConfirm) {
        existingConfirm.remove();
      }
      
      // 選択済みマーク（編集可能メッセージ）
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'answer-confirm';
      confirmDiv.innerHTML = `
        <div style="
          background: rgba(34, 139, 34, 0.1); 
          border: 2px solid var(--success); 
          padding: 1rem; 
          border-radius: var(--border-radius); 
          margin-top: 1rem; 
          text-align: center;
          color: var(--success);
          font-weight: 600;
        ">
          ✅ 解答を保存しました（${choice}）<br>
          <small style="color: var(--gray);">※クイズ提出前なら別の選択肢を選んで変更できます</small>
        </div>
      `;
      questionContainer.appendChild(confirmDiv);
      
      // ナビゲーション更新
      this.updateNavigation();
      
    } catch (error) {
      Utils.showError(error.message || '解答の保存に失敗しました');
    }
  },
  
  // ナビゲーション更新
  updateNavigation() {
    const prevBtn = Utils.$('#prev-btn');
    const nextBtn = Utils.$('#next-btn');
    const submitBtn = Utils.$('#submit-btn');
    
    if (prevBtn) {
      prevBtn.style.display = AppState.currentQuestion > 1 ? 'inline-block' : 'none';
    }
    
    if (nextBtn) {
      nextBtn.style.display = AppState.currentQuestion < AppState.totalQuestions ? 'inline-block' : 'none';
    }
    
    if (submitBtn) {
      const answeredCount = Object.keys(AppState.answers).length;
      submitBtn.style.display = answeredCount === AppState.totalQuestions ? 'inline-block' : 'none';
    }
  },
  
  // 前の問題
  prevQuestion() {
    if (AppState.currentQuestion > 1) {
      AppState.currentQuestion--;
      this.displayQuestion(AppState.currentQuestion);
      this.updateNavigation();
    }
  },
  
  // 次の問題
  nextQuestion() {
    if (AppState.currentQuestion < AppState.totalQuestions) {
      AppState.currentQuestion++;
      this.displayQuestion(AppState.currentQuestion);
      this.updateNavigation();
    }
  },
  
  // クイズ提出
  async submitQuiz() {
    if (Object.keys(AppState.answers).length < AppState.totalQuestions) {
      Utils.showError('すべての問題に解答してください。');
      return;
    }
    
    AppState.endTime = new Date();
    
    try {
      const result = await Utils.apiCall('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({
          userId: AppState.currentUser?.id,
          answers: AppState.answers,
          startTime: AppState.startTime,
          endTime: AppState.endTime
        })
      });
      
      if (result.success) {
        AppState.score = result.score;
        AppState.isQuizCompleted = true;
        
        // 結果をローカルストレージに保存
        Utils.saveToStorage('quizResult', {
          score: result.score,
          correctCount: result.correctCount,
          totalQuestions: result.totalQuestions
        });
        
        Utils.showSuccess('クイズが完了しました！結果を表示します。');
        setTimeout(() => {
          window.location.href = '/result';
        }, 1500);
      }
    } catch (error) {
      Utils.showError('クイズの提出に失敗しました。');
    }
  },
  
  // クイズ初期化（完了後はアクセス不可）
  async initQuiz() {
    AppState.startTime = new Date();
    
    // 認証確認
    if (!Auth.isAuthenticated() || !AppState.currentUser) {
      console.error('認証情報が不足しています');
      const questionContainer = Utils.$('#question-container');
      if (questionContainer) {
        questionContainer.innerHTML = '<p style="text-align: center; color: var(--error);">認証情報の読み込みに失敗しました。</p>';
      }
      return;
    }
    
    // クイズ完了状態をチェック - 完了後は再アクセス禁止
    try {
      const statusResult = await Utils.apiCall(`/api/quiz/status/${AppState.currentUser.id}`);
      if (statusResult.isCompleted) {
        // 完了時の特別メッセージを表示
        this.displayCompletionMessage();
        return;
      }
      
      // 既存の解答をサーバーから読み込み（完了前のみ）
      await this.loadExistingAnswers();
      AppState.currentQuestion = Object.keys(AppState.answers).length + 1 || 1;
      if (AppState.currentQuestion > 10) AppState.currentQuestion = 10;
    } catch (error) {
      console.log('クイズ状態チェックエラー:', error);
      // エラー時はサーバーデータ取得を試行、失敗時はローカルストレージから復旧
      try {
        await this.loadExistingAnswers();
      } catch (serverError) {
        console.log('サーバーデータ取得失敗、LocalStorageから復旧:', serverError);
        AppState.answers = Utils.loadFromStorage('quizAnswers') || {};
      }
      AppState.currentQuestion = Object.keys(AppState.answers).length + 1 || 1;
      if (AppState.currentQuestion > 10) AppState.currentQuestion = 10;
    }
    
    await this.loadQuestions();
    
    if (Quiz.questions && Quiz.questions.length > 0) {
      this.displayQuestion(AppState.currentQuestion);
      this.updateNavigation();
    } else {
      const questionContainer = Utils.$('#question-container');
      if (questionContainer) {
        questionContainer.innerHTML = '<p style="text-align: center; color: var(--error);">問題の読み込みに失敗しました。ページを再読み込みしてください。</p>';
      }
    }
  },
  
  // 完了メッセージ表示
  displayCompletionMessage() {
    const questionContainer = Utils.$('#question-container');
    if (!questionContainer) return;
    
    questionContainer.innerHTML = `
      <div class="completion-message text-center fade-in" style="padding: 3rem 1rem;">
        <div style="margin-bottom: 2rem;">
          <img src="/images/beaver.png" alt="ビーバーキャラクター" style="height: 120px; margin-bottom: 1rem;">
        </div>
        <div style="background: linear-gradient(135deg, var(--success) 0%, var(--secondary) 100%); 
                    color: white; padding: 2rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
          <h2 style="margin: 0 0 1rem 0; color: white;">🎉 クイズ完了済み！</h2>
          <p style="margin: 0; font-size: 1.1rem; color: white;">
            あなたはすでにクイズを完了しています。<br>
            素晴らしい挑戦でした！
          </p>
        </div>
        
        <div style="display: grid; gap: 1rem; max-width: 400px; margin: 0 auto;">
          <a href="/result" class="btn btn-primary btn-large">
            📊 結果を確認する
          </a>
          <a href="/review" class="btn btn-info btn-large">
            📋 解答と解説を見る
          </a>
          <a href="/survey" class="btn btn-success btn-large">
            📝 アンケートに回答（+10pt）
          </a>
          <a href="/mypage" class="btn btn-secondary btn-large">
            🏠 マイページに戻る
          </a>
        </div>
        
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(210, 105, 30, 0.1); 
                    border-radius: var(--border-radius); color: var(--gray);">
          <small>
            💡 ランキングやアンケート回答で更なるポイントアップを目指しましょう！
          </small>
        </div>
      </div>
    `;
    
    // 進捗バー全体を完全に隠す
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
    
    // 進捗テキスト（問題番号表示）を完全に隠す
    const progressText = Utils.$('#progress-text');
    if (progressText) {
      progressText.parentElement.style.display = 'none'; // 親のdivごと隠す
    }
    
    // ナビゲーションボタンを隠す
    const navigation = document.querySelector('.quiz-navigation');
    if (navigation) {
      navigation.style.display = 'none';
    }
    
    // 問題一覧カードも隠す（完了時は不要）
    const questionSummaryCard = document.querySelector('.card.mt-4');
    if (questionSummaryCard && questionSummaryCard.querySelector('#question-summary')) {
      questionSummaryCard.style.display = 'none';
    }
  }
};

// === ランキング機能 ===
const Ranking = {
  // ランキング取得
  async getRanking() {
    try {
      const result = await Utils.apiCall('/api/ranking');
      return Array.isArray(result) ? result : (result.rankings || []);
    } catch (error) {
      Utils.showError('ランキングの取得に失敗しました。');
      return [];
    }
  },
  
  // ランキング表示
  async displayRanking() {
    const rankings = await this.getRanking();
    const container = Utils.$('#ranking-container');
    
    if (!container) return;
    
    container.innerHTML = rankings.map((rank, index) => `
      <div class="ranking-item slide-in" style="animation-delay: ${index * 0.1}s">
        <div class="rank-position ${this.getRankClass(index + 1)}">${index + 1}</div>
        <div class="rank-info">
          <div class="rank-nickname">${rank.nickname}</div>
          <div class="rank-score">${rank.score}点 (${rank.correctCount}/${AppState.totalQuestions}問正解)</div>
        </div>
      </div>
    `).join('');
  },
  
  // ランク表示クラス取得
  getRankClass(position) {
    switch (position) {
      case 1: return 'gold';
      case 2: return 'silver';
      case 3: return 'bronze';
      default: return '';
    }
  }
};

// === アンケート機能 ===
const Survey = {
  questions: [],
  
  // アンケート質問取得
  async getSurveyQuestions() {
    try {
      const result = await Utils.apiCall('/api/survey/questions');
      this.questions = result.questions;
      return this.questions;
    } catch (error) {
      Utils.showError('アンケートの読み込みに失敗しました。');
      return [];
    }
  },
  
  // アンケート回答送信（シンプル化）
  async submitSurvey(answers) {
    try {
      const result = await Utils.apiCall('/api/survey/submit', {
        method: 'POST',
        body: JSON.stringify({
          userId: AppState.currentUser.id,
          answers
        })
      });
      
      if (result.success) {
        Utils.showSuccess('アンケートを送信しました！ボーナスポイントを獲得！');
        setTimeout(() => {
          window.location.href = '/ranking';
        }, 2000);
      }
    } catch (error) {
      Utils.showError('アンケートの送信に失敗しました。');
    }
  },
  
  // アンケート初期化（完了状態チェック付き）
  async initSurvey() {
    try {
      // クイズ完了状態をチェック
      const quizStatusResult = await Utils.apiCall(`/api/quiz/status/${AppState.currentUser.id}`);
      if (!quizStatusResult.isCompleted) {
        // クイズ未完了の場合
        this.displayQuizRequiredMessage();
        return;
      }
      
      // アンケート完了状態をチェック
      const surveyStatusResult = await Utils.apiCall(`/api/survey/status/${AppState.currentUser.id}`);
      if (surveyStatusResult.completed) {
        // アンケート完了済みの場合
        this.displayCompletionMessage();
        return;
      }
      
      // 通常のアンケート表示（未完了の場合）
      return true; // 通常の処理を続行
      
    } catch (error) {
      console.error('アンケート状態チェックエラー:', error);
      return true; // エラー時は通常の処理を続行
    }
  },
  
  // クイズ未完了メッセージ表示
  displayQuizRequiredMessage() {
    const surveyForm = Utils.$('#survey-form');
    if (!surveyForm) return;
    
    surveyForm.innerHTML = `
      <div class="quiz-required-message text-center fade-in" style="padding: 3rem 1rem;">
        <div style="margin-bottom: 2rem;">
          <img src="/images/beaver.png" alt="ビーバーキャラクター" style="height: 120px; margin-bottom: 1rem;">
        </div>
        <div style="background: linear-gradient(135deg, var(--info) 0%, var(--secondary) 100%); 
                    color: white; padding: 2rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
          <h2 style="margin: 0 0 1rem 0; color: white;">📝 クイズ完了が必要です</h2>
          <p style="margin: 0; font-size: 1.1rem; color: white;">
            アンケートに回答するには、先にクイズを完了してください。<br>
            クイズを完了すると、ボーナスポイント獲得のチャンスが待っています！
          </p>
        </div>
        
        <div style="display: grid; gap: 1rem; max-width: 400px; margin: 0 auto;">
          <a href="/quiz" class="btn btn-primary btn-large">
            📝 クイズに挑戦する
          </a>
          <a href="/mypage" class="btn btn-secondary btn-large">
            🏠 マイページに戻る
          </a>
        </div>
        
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(210, 105, 30, 0.1); 
                    border-radius: var(--border-radius); color: var(--gray);">
          <small>
            💡 クイズは全10問で、紙の問題文を読んでアプリで回答する形式です
          </small>
        </div>
      </div>
    `;
    
    // 提出ボタンを隠す
    const submitButton = document.querySelector('#submit-survey-btn, .btn[onclick="submitSurvey()"]');
    if (submitButton) {
      submitButton.style.display = 'none';
    }
  },
  
  // アンケート完了メッセージ表示
  displayCompletionMessage() {
    const surveyForm = Utils.$('#survey-form');
    if (!surveyForm) return;
    
    surveyForm.innerHTML = `
      <div class="completion-message text-center fade-in" style="padding: 3rem 1rem;">
        <div style="margin-bottom: 2rem;">
          <img src="/images/beaver.png" alt="ビーバーキャラクター" style="height: 120px; margin-bottom: 1rem;">
        </div>
        <div style="background: linear-gradient(135deg, var(--success) 0%, var(--secondary) 100%); 
                    color: white; padding: 2rem; border-radius: var(--border-radius); margin-bottom: 2rem;">
          <h2 style="margin: 0 0 1rem 0; color: white;">🎉 アンケート回答済み！</h2>
          <p style="margin: 0; font-size: 1.1rem; color: white;">
            アンケートの回答ありがとうございました！<br>
            ボーナスポイントを獲得しました！
          </p>
        </div>
        
        <div style="display: grid; gap: 1rem; max-width: 400px; margin: 0 auto;">
          <a href="/ranking" class="btn btn-primary btn-large">
            🏆 ランキングを確認
          </a>
          <a href="/result" class="btn btn-info btn-large">
            📊 クイズ結果を確認
          </a>
          <a href="/mypage" class="btn btn-secondary btn-large">
            🏠 マイページに戻る
          </a>
        </div>
        
        <div style="margin-top: 2rem; padding: 1rem; background: rgba(210, 105, 30, 0.1); 
                    border-radius: var(--border-radius); color: var(--gray);">
          <small>
            💡 ご協力ありがとうございました。ランキングでの順位をお楽しみください！
          </small>
        </div>
      </div>
    `;
    
    // すべての送信ボタンを無効化
    const submitButtons = document.querySelectorAll('#submit-survey-btn, .btn[onclick="submitSurvey()"], button[type="submit"]');
    submitButtons.forEach(button => {
      button.style.display = 'none';
    });
  }
};

// === イベントリスナー設定（スマホ対応強化） ===
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOMContentLoaded - app.js');
  
  // スマホ対応: 認証状態の詳細ログ
  console.log('LocalStorage状況確認:');
  console.log('- currentUser:', Utils.loadFromStorage('currentUser'));
  console.log('- auth_token:', Utils.loadFromStorage('auth_token'));
  console.log('- AppState.currentUser:', AppState.currentUser);
  
  const path = window.location.pathname;
  console.log('現在のパス:', path);
  
  // トップページのみ特別処理（他のページは各HTMLで独立して処理）
  if (path === '/' || path === '/index.html') {
    await initHomePage();
    return;
  }
  
  // 全ページ共通でランキングページのみここで初期化
  if (path === '/ranking' || path === '/ranking.html') {
    Ranking.displayRanking();
  }
});

// === ページ固有の初期化関数 ===
async function initHomePage() {
  console.log('initHomePage 実行');
  
  // URLパラメータチェック（最優先）
  const urlParams = new URLSearchParams(window.location.search);
  const nickname = urlParams.get('nickname');
  const password = urlParams.get('password');
  const error = urlParams.get('error');
  
  // URLパラメータでログイン情報が渡されている場合
  if (nickname && password) {
    console.log('URLパラメータでのログインを試行:', nickname);
    
    // ページに一時的にメッセージを表示
    document.body.innerHTML = `
      <div style="text-align: center; padding: 50px; font-family: Arial;">
        <h1>🦫 hokkaクイズラリー</h1>
        <h2>自動ログイン中...</h2>
        <p>ユーザー名: ${nickname}</p>
        <div style="margin: 20px;">
          <div style="border: 3px solid #d2691e; border-top: 3px solid transparent; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
        <style>
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </div>
    `;
    
    try {
      await Auth.login({ nickname, password });
      // ログイン成功後、マイページへリダイレクト
      console.log('ログイン成功:', nickname);
      // showSuccessはDOM要素が必要なので、直接リダイレクト
      window.location.href = '/mypage';
      return;
    } catch (error) {
      console.error('URLパラメータログインエラー:', error);
      window.location.href = '/?error=login_failed';
      return;
    }
  }
  
  // エラーメッセージ表示
  if (error === 'login_failed') {
    Utils.showError('ログインに失敗しました。ニックネームとパスワードを確認してください。');
  }
  
  // 既にログイン済みの場合はリダイレクト先またはマイページへ
  if (Auth.isAuthenticated()) {
    // リダイレクト先を取得（デフォルトは /mypage）
    const redirectUrl = urlParams.get('redirect') || '/mypage';
    
    Utils.showSuccess('既にログイン済みです。');
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000);
    return;
  }
  
  // ログインフォーム設定
  const loginForm = Utils.$('#login-form');
  console.log('ログインフォーム要素:', loginForm);
  
  if (loginForm) {
    console.log('ログインフォームイベントリスナー設定');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('ログインフォーム送信');
      const formData = Utils.getFormData(loginForm);
      console.log('フォームデータ:', formData);
      
      // ログインボタン無効化
      const loginBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = loginBtn ? loginBtn.textContent : '';
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'ログイン中...';
      }
      
      try {
        await Auth.login(formData);
        Utils.showSuccess('ログインしました！');
        
        // リダイレクト先を決定（シンプルに）
        const redirectUrl = urlParams.get('redirect') || '/mypage';
        
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 1000);
        
      } catch (error) {
        console.error('ログインエラーキャッチ:', error);
        Utils.showError(error.message || 'ログインに失敗しました');
        
        // ボタンを再有効化
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = originalText;
        }
      }
    });
  } else {
    console.error('ログインフォームが見つかりません');
  }
  
  // ランキングプレビュー読み込み
  try {
    const rankings = await Ranking.getRanking();
    const previewContainer = Utils.$('#ranking-preview');
    
    if (previewContainer && rankings.length > 0) {
      const top3 = rankings.slice(0, 3);
      previewContainer.innerHTML = top3.map((rank, index) => `
        <div class="ranking-item" style="margin-bottom: 0.5rem;">
          <div class="rank-position ${Ranking.getRankClass(index + 1)}">${index + 1}</div>
          <div class="rank-info">
            <div class="rank-nickname">${rank.nickname}</div>
            <div class="rank-score">${rank.score}点 (${rank.correctCount}/10問正解)</div>
          </div>
        </div>
      `).join('') + `
        <div class="text-center mt-3">
          <a href="/ranking" class="btn btn-outline">📊 ランキング全体を見る</a>
        </div>
      `;
    }
  } catch (error) {
    console.log('ランキングプレビューの読み込みをスキップ');
  }
}

function initResultPage() {
  // 結果表示
  const scoreElement = Utils.$('#final-score');
  if (scoreElement) {
    scoreElement.textContent = `${AppState.score}点`;
  }
  
  const correctElement = Utils.$('#correct-count');
  if (correctElement) {
    const correctCount = Object.values(AppState.answers).filter(answer => {
      const question = Quiz.questions.find(q => q.question_number === parseInt(Object.keys(AppState.answers).find(key => AppState.answers[key] === answer)));
      return question && question.correct_answer === answer;
    }).length;
    correctElement.textContent = `${correctCount}/${AppState.totalQuestions}問`;
  }
}

// === グローバル関数（HTML から呼び出し用） ===
window.Quiz = Quiz;
window.Auth = Auth;
window.Ranking = Ranking;
window.Survey = Survey;
window.Utils = Utils;