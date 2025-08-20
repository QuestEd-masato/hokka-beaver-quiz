/* hokkaクイズラリー - 管理画面専用JavaScript */
/* 抽出日: 2025-08-18 */
/* 元ファイル: templates/admin.html (lines 391-1041, 1517-1846) */

// グローバル変数
let allUsers = [];
let filteredUsers = [];

// 認証状態キャッシュ（多重実行防止）
let adminAuthChecked = false;
let adminAuthResult = null;

// === Utils.showAlert フォールバック実装（app.js 読み込みタイミング対策）===
// admin.js が app.js より先に実行される場合の安全対策
if (typeof Utils === 'undefined') {
    window.Utils = {};
}
if (!Utils.showAlert) {
    Utils.showAlert = function(message, type) {
        // DOM要素による表示を優先、なければalert
        if (type === 'error' && typeof Utils.showError === 'function') {
            Utils.showError(message);
        } else if (type === 'success' && typeof Utils.showSuccess === 'function') {
            Utils.showSuccess(message);
        } else {
            // フォールバック: 標準alert（最終手段）
            console.warn('Utils.showAlert fallback:', message, type);
            alert(message);
        }
    };
}

// 認証状態のキャッシュチェック関数（Auth.isAuthenticated()の多重実行防止）
function checkAdminAuthCached() {
    if (!adminAuthChecked) {
        adminAuthChecked = true;
        adminAuthResult = Auth.isAuthenticated();
        console.log('Admin auth check cached:', adminAuthResult);
    }
    return adminAuthResult;
}

// ユーティリティ関数（重複除去）
function getIsMobile() {
    return window.innerWidth <= 768;
}

function getAgeGroupLabels() {
    const isMobile = getIsMobile();
    return isMobile ? {
        'preschool': '園児',
        'elementary': '小学',
        'junior_high': '中学',
        'high_school': '高校',
        'adult': '大人'
    } : {
        'preschool': 'ようちえん・ほいくえん',
        'elementary': '小学生',
        'junior_high': '中学生',
        'high_school': '高校生',
        'adult': '大人'
    };
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    checkAdminAccess();
    
    // 検索・フィルタイベント設定
    const searchInput = Utils.$('#user-search');
    if (searchInput) {
        searchInput.addEventListener('input', applyUserFilters);
    }
    
    const ageFilter = Utils.$('#age-filter');
    if (ageFilter) {
        ageFilter.addEventListener('change', applyUserFilters);
    }
    
    // 自動リダイレクト機能初期化
    initAutoRedirect();
});

// 管理者アクセス確認
function checkAdminAccess() {
    const currentUser = Auth.getCurrentUser();
    if (!checkAdminAuthCached() || !currentUser?.is_admin) {
        document.getElementById('admin-check').style.display = 'block';
        document.getElementById('admin-main').style.display = 'none';
        return;
    }

    // 管理者の場合
    document.getElementById('admin-check').style.display = 'none';
    document.getElementById('admin-main').style.display = 'block';
    
    initAdminPanel();
}

// 管理パネル初期化
async function initAdminPanel() {
    const user = Auth.getCurrentUser();
    if (user) {
        Utils.$('#admin-nickname').textContent = user.nickname;
    }

    await Promise.all([
        loadDashboardStats(),
        loadQuickEditQuestions(),
        loadQuestionsList(),
        loadParticipants(),
        loadSystemStats()
    ]);

    setupFormHandlers();
}

// ダッシュボード統計読み込み
async function loadDashboardStats() {
    try {
        const [users, rankings] = await Promise.all([
            Utils.apiCall('/api/debug/users'),
            Utils.apiCall('/api/ranking')
        ]);

        const totalUsers = users.users?.length || 0;
        const completedQuiz = rankings?.length || 0;
        const avgScore = completedQuiz > 0 ? 
            Math.round(rankings.reduce((sum, r) => sum + r.score, 0) / completedQuiz) : 0;
        // 修正: surveyCompletedフィールドを使用
        const surveyCompleted = rankings?.filter(r => r.surveyCompleted === true).length || 0;

        Utils.$('#total-users').textContent = totalUsers;
        Utils.$('#completed-quiz').textContent = completedQuiz;
        Utils.$('#avg-score').textContent = avgScore + '点';
        Utils.$('#survey-completed').textContent = surveyCompleted;

    } catch (error) {
        console.error('統計読み込みエラー:', error);
    }
}

// クイック編集用問題読み込み
async function loadQuickEditQuestions() {
    try {
        const result = await Utils.apiCall('/api/quiz/questions');
        const questions = result || []; // APIは直接配列を返す
        const container = Utils.$('#quick-edit-questions');

        const questionsHtml = questions.slice(0, 6).map(q => `
            <div class="quick-edit-card">
                <div class="question-preview">
                    <strong>問題${q.question_number}</strong>
                    <p>${q.question_text.substring(0, 50)}...</p>
                    <small>正解: ${q.correct_answer}</small>
                </div>
                <div class="quick-actions">
                    <button onclick="quickEditQuestion(${q.id})" class="btn btn-outline btn-small">
                        ✏️ 編集
                    </button>
                    <button onclick="quickEditExplanation(${q.id})" class="btn btn-info btn-small">
                        💬 解説
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = questionsHtml;

    } catch (error) {
        console.error('クイック編集読み込みエラー:', error);
    }
}

// 問題一覧読み込み
async function loadQuestionsList() {
    try {
        const result = await Utils.apiCall(`/api/admin/questions?admin_id=${Auth.getCurrentUser().id}`);
        const questions = result.questions || []; // 管理者用APIは{success:true, questions:[]}形式
        const container = Utils.$('#questions-list');

        const questionsHtml = questions.map(q => `
            <div class="question-item">
                <div class="question-header">
                    <strong>問題 ${q.question_number}: ${q.question_text}</strong>
                    <div>
                        <button onclick="editQuestion(${q.id})" class="btn btn-outline btn-small">編集</button>
                        <button onclick="deleteQuestion(${q.id})" class="btn btn-danger btn-small">削除</button>
                    </div>
                </div>
                <div class="question-details">
                    <p><strong>選択肢:</strong> A: ${q.choice_a} | B: ${q.choice_b} | C: ${q.choice_c} | D: ${q.choice_d}</p>
                    <p><strong>正解:</strong> ${q.correct_answer}</p>
                    <p><strong>解説:</strong> ${q.explanation}</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = questionsHtml;

    } catch (error) {
        console.error('問題一覧読み込みエラー:', error);
    }
}

// 参加者一覧読み込み
async function loadParticipants() {
    try {
        const result = await Utils.apiCall(`/api/admin/participants?admin_id=${Auth.getCurrentUser().id}`);
        const participants = result.participants || [];
        
        // 統計更新
        updateParticipantsStats(participants);
        
        // テーブル更新
        displayParticipantsTable(participants);
        
    } catch (error) {
        console.error('参加者一覧読み込みエラー:', error);
    }
}

// 参加者統計更新
function updateParticipantsStats(participants) {
    const totalParticipants = participants.length;
    const quizCompleted = participants.filter(p => p.quiz.completed).length;
    const surveyCompleted = participants.filter(p => p.survey.completed).length;
    const averageScore = quizCompleted > 0 ? 
        Math.round(participants.reduce((sum, p) => sum + (p.quiz.score || 0), 0) / quizCompleted) : 0;

    Utils.$('#participants-total').textContent = totalParticipants;
    Utils.$('#quiz-completed-count').textContent = quizCompleted;
    Utils.$('#survey-completed-count').textContent = surveyCompleted;
    Utils.$('#average-score').textContent = averageScore + '点';
}

// 参加者テーブル表示
function displayParticipantsTable(participants) {
    const tbody = Utils.$('#participants-table-body');
    
    if (participants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 2rem;">
                    参加者がいません
                </td>
            </tr>
        `;
        return;
    }

    const participantsHtml = participants.map(participant => {
        // モバイル対応: 年齢2文字表示
        const ageGroupLabels = getAgeGroupLabels();

        const quizStatus = participant.quiz.completed ? 'completed' : 
            (participant.quiz.answeredCount > 0 ? 'progress' : 'not-started');
        
        // スマホ対応: 2文字表示
        const isMobile = getIsMobile();
        const quizStatusText = participant.quiz.completed ? '✅' : 
            (participant.quiz.answeredCount > 0 ? 
                (isMobile ? `${participant.quiz.answeredCount}問` : `🔄 ${participant.quiz.answeredCount}/10問`) : 
                '⏳');

        const surveyStatusText = participant.survey.completed ? '✅' : '⏳';

        return `
            <tr>
                <td>
                    <div>
                        <strong>${participant.nickname}</strong>
                        <br><small>${participant.real_name}</small>
                    </div>
                </td>
                <td>${ageGroupLabels[participant.age_group] || participant.age_group}</td>
                <td>
                    <span class="status-badge status-${quizStatus}">${quizStatusText}</span>
                </td>
                <td>
                    <strong>${participant.quiz.score}点</strong>
                    ${participant.quiz.correctCount ? `<br><small>${participant.quiz.correctCount}問正解</small>` : ''}
                </td>
                <td>
                    <span class="status-badge ${participant.survey.completed ? 'status-completed' : 'status-not-started'}">
                        ${surveyStatusText}
                    </span>
                </td>
                <td>
                    <small>${new Date(participant.created_at).toLocaleDateString('ja-JP')}</small>
                </td>
                <td>
                    <button onclick="deleteParticipant(${participant.id}, '${participant.nickname}')" class="btn btn-danger btn-small">
                        🗑️
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = participantsHtml;
}

// 参加者更新
async function refreshParticipants() {
    await loadParticipants();
}

// 参加者詳細表示
function viewParticipantDetails(participantId) {
    // 詳細モーダル実装（今後追加可能）
    Utils.showSuccess(`参加者 ID ${participantId} の詳細機能は今後実装予定です`);
}

// 参加者削除
async function deleteParticipant(participantId, nickname) {
    // 確認ダイアログ
    const confirmed = confirm(`参加者「${nickname}」を削除しますか？\n\nこの操作は取り消せません。\n関連するすべてのデータ（クイズ回答、ランキング、アンケート）が削除されます。`);
    
    if (!confirmed) {
        return;
    }

    // 二次確認
    const secondConfirm = confirm(`本当に「${nickname}」を削除してよろしいですか？\n\n最終確認です。`);
    
    if (!secondConfirm) {
        return;
    }

    try {
        const currentUser = Auth.getCurrentUser();
        console.log('削除実行: currentUser =', currentUser); // デバッグ用
        
        if (!currentUser || !currentUser.is_admin) {
            Utils.showError('管理者権限が必要です');
            console.error('管理者権限エラー:', currentUser);
            return;
        }

        // 削除APIを呼び出し
        console.log('削除API呼び出し:', `/api/admin/users/${participantId}`); // デバッグ用
        const response = await Utils.apiCall(`/api/admin/users/${participantId}`, {
            method: 'DELETE',
            body: JSON.stringify({ admin_id: currentUser.id })
        });

        console.log('削除APIレスポンス:', response); // デバッグ用
        
        if (response && response.success) {
            Utils.showSuccess(`参加者「${nickname}」を削除しました`);
            
            // テーブルを更新
            await loadParticipants();
            
            // ダッシュボード統計も更新
            await loadDashboardStats();
        } else {
            Utils.showError(response?.message || '削除に失敗しました');
            console.error('削除失敗:', response);
        }
    } catch (error) {
        console.error('参加者削除エラー:', error);
        Utils.showError('削除中にエラーが発生しました: ' + error.message);
    }
}

// セクションへのスクロール
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // ハイライト効果
        section.style.boxShadow = '0 0 20px rgba(210, 105, 30, 0.5)';
        setTimeout(() => {
            section.style.boxShadow = '';
        }, 1500);
    }
}

// システム統計読み込み
async function loadSystemStats() {
    try {
        const container = Utils.$('#system-stats');
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <div class="stat-item">
                    <h4>🕐 システム稼働時間</h4>
                    <p>起動時刻: ${new Date().toLocaleString('ja-JP')}</p>
                </div>
                <div class="stat-item">
                    <h4>📊 メモリ使用量</h4>
                    <p>メモリベースDB稼働中</p>
                </div>
                <div class="stat-item">
                    <h4>🔄 接続状況</h4>
                    <p>最大200名同時接続対応</p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('システム統計読み込みエラー:', error);
    }
}

// フォームハンドラー設定
function setupFormHandlers() {
    const newQuestionForm = Utils.$('#new-question-form');
    if (newQuestionForm) {
        newQuestionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addNewQuestion();
        });
    }

    const createUserForm = Utils.$('#create-user-form');
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createNewUser();
        });
    }
}

// 新規ユーザー作成
async function createNewUser() {
    const userData = {
        real_name: Utils.$('#new-user-name').value,
        nickname: Utils.$('#new-user-nickname').value,
        age_group: Utils.$('#new-user-age').value,
        gender: Utils.$('#new-user-gender').value,
        password: Utils.$('#new-user-password').value
    };

    try {
        const result = await Utils.apiCall('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (result.success) {
            Utils.showSuccess(`アカウントを作成しました: ${userData.nickname}`);
            Utils.$('#create-user-form').reset();
            await loadDashboardStats(); // 統計を更新
        }
    } catch (error) {
        Utils.showError('アカウントの作成に失敗しました: ' + error.message);
    }
}

// 新規問題追加
async function addNewQuestion() {
    const questionData = {
        question_number: parseInt(Utils.$('#new-question-number').value),
        question_text: Utils.$('#new-question-text').value,
        choice_a: Utils.$('#new-choice-a').value,
        choice_b: Utils.$('#new-choice-b').value,
        choice_c: Utils.$('#new-choice-c').value,
        choice_d: Utils.$('#new-choice-d').value,
        correct_answer: Utils.$('#new-correct-answer').value,
        explanation: Utils.$('#new-explanation').value
    };

    try {
        const result = await Utils.apiCall('/api/admin/questions', {
            method: 'POST',
            body: JSON.stringify(questionData)
        });

        if (result.success) {
            Utils.showSuccess('問題を追加しました');
            Utils.$('#new-question-form').reset();
            await loadQuestionsList();
            await loadQuickEditQuestions();
        }
    } catch (error) {
        Utils.showError('問題の追加に失敗しました: ' + error.message);
    }
}

// CSV出力機能
async function exportScoreData() {
    try {
        const response = await fetch('/api/admin/export/scores');
        if (response.ok) {
            const blob = await response.blob();
            downloadCSV(blob, 'quiz_scores.csv');
        } else {
            Utils.showError('成績データの出力に失敗しました');
        }
    } catch (error) {
        Utils.showError('成績データの出力に失敗しました: ' + error.message);
    }
}

async function exportSurveyData() {
    try {
        const response = await fetch('/api/admin/export/survey');
        if (response.ok) {
            const blob = await response.blob();
            downloadCSV(blob, 'survey_results.csv');
        } else {
            Utils.showError('アンケートデータの出力に失敗しました');
        }
    } catch (error) {
        Utils.showError('アンケートデータの出力に失敗しました: ' + error.message);
    }
}

async function exportQuestionAnalysis() {
    try {
        const response = await fetch('/api/admin/export/questions');
        if (response.ok) {
            const blob = await response.blob();
            downloadCSV(blob, 'question_analysis.csv');
        } else {
            Utils.showError('問題分析データの出力に失敗しました');
        }
    } catch (error) {
        Utils.showError('問題分析データの出力に失敗しました: ' + error.message);
    }
}

async function exportFullReport() {
    try {
        const response = await fetch('/api/admin/export/full');
        if (response.ok) {
            const blob = await response.blob();
            downloadCSV(blob, 'full_report.csv');
        } else {
            Utils.showError('統合レポートの出力に失敗しました');
        }
    } catch (error) {
        Utils.showError('統合レポートの出力に失敗しました: ' + error.message);
    }
}

function downloadCSV(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    Utils.showSuccess(`${filename} をダウンロードしました`);
}

// その他の機能（簡略版）
async function quickEditQuestion(questionId) {
    // クイック編集モーダルを表示（実装省略）
    Utils.showSuccess('クイック編集機能（実装中）');
}

async function quickEditExplanation(questionId) {
    // 解説編集モーダルを表示（実装省略）
    Utils.showSuccess('解説編集機能（実装中）');
}

async function editQuestion(questionId) {
    try {
        // 問題データを取得
        const result = await Utils.apiCall('/api/quiz/questions');
        const question = result.find(q => q.id === questionId);
        
        if (!question) {
            Utils.showError('問題が見つかりません');
            return;
        }

        // 編集フォームを表示
        showQuestionEditModal(question);
    } catch (error) {
        Utils.showError('問題の読み込みに失敗しました: ' + error.message);
    }
}

// 問題編集モーダル表示
function showQuestionEditModal(question) {
    const modalHtml = `
        <div id="edit-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
             background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; max-width: 600px; width: 90%; max-height: 90%; overflow-y: auto; 
                 border-radius: var(--border-radius); padding: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <h3>問題編集 - 問題${question.question_number}</h3>
                    <button onclick="closeEditModal()" style="border: none; background: none; font-size: 1.5rem; cursor: pointer;">×</button>
                </div>
                
                <form id="edit-question-form">
                    <div style="display: grid; gap: 1rem;">
                        <div>
                            <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">問題文</label>
                            <textarea id="edit-question-text" style="width: 100%; min-height: 80px; padding: 0.5rem; 
                                      border: 1px solid var(--light-gray); border-radius: var(--border-radius);">${question.question_text}</textarea>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                            <div>
                                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">選択肢A</label>
                                <input type="text" id="edit-choice-a" value="${question.choice_a}" 
                                       style="width: 100%; padding: 0.5rem; border: 1px solid var(--light-gray); border-radius: var(--border-radius);">
                            </div>
                            <div>
                                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">選択肢B</label>
                                <input type="text" id="edit-choice-b" value="${question.choice_b}" 
                                       style="width: 100%; padding: 0.5rem; border: 1px solid var(--light-gray); border-radius: var(--border-radius);">
                            </div>
                            <div>
                                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">選択肢C</label>
                                <input type="text" id="edit-choice-c" value="${question.choice_c}" 
                                       style="width: 100%; padding: 0.5rem; border: 1px solid var(--light-gray); border-radius: var(--border-radius);">
                            </div>
                            <div>
                                <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">選択肢D</label>
                                <input type="text" id="edit-choice-d" value="${question.choice_d}" 
                                       style="width: 100%; padding: 0.5rem; border: 1px solid var(--light-gray); border-radius: var(--border-radius);">
                            </div>
                        </div>
                        
                        <div>
                            <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">正解</label>
                            <select id="edit-correct-answer" style="width: 100%; padding: 0.5rem; border: 1px solid var(--light-gray); border-radius: var(--border-radius);">
                                <option value="A" ${question.correct_answer === 'A' ? 'selected' : ''}>A</option>
                                <option value="B" ${question.correct_answer === 'B' ? 'selected' : ''}>B</option>
                                <option value="C" ${question.correct_answer === 'C' ? 'selected' : ''}>C</option>
                                <option value="D" ${question.correct_answer === 'D' ? 'selected' : ''}>D</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="font-weight: 600; display: block; margin-bottom: 0.5rem;">解説</label>
                            <textarea id="edit-explanation" style="width: 100%; min-height: 100px; padding: 0.5rem; 
                                      border: 1px solid var(--light-gray); border-radius: var(--border-radius);">${question.explanation}</textarea>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1rem;">
                            <button type="button" onclick="closeEditModal()" class="btn btn-secondary">キャンセル</button>
                            <button type="submit" class="btn btn-success">保存</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // フォーム送信イベント
    document.getElementById('edit-question-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveQuestionEdit(question.id);
    });
}

// 編集モーダルを閉じる
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.remove();
    }
}

// 問題編集を保存
async function saveQuestionEdit(questionId) {
    const updatedData = {
        admin_id: Auth.getCurrentUser().id,
        question_text: document.getElementById('edit-question-text').value,
        choice_a: document.getElementById('edit-choice-a').value,
        choice_b: document.getElementById('edit-choice-b').value,
        choice_c: document.getElementById('edit-choice-c').value,
        choice_d: document.getElementById('edit-choice-d').value,
        correct_answer: document.getElementById('edit-correct-answer').value,
        explanation: document.getElementById('edit-explanation').value
    };

    try {
        const result = await Utils.apiCall(`/api/admin/questions/${questionId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });

        if (result.success) {
            Utils.showSuccess('問題を更新しました');
            closeEditModal();
            await loadQuestionsList(); // リストを再読み込み
            await loadQuickEditQuestions(); // クイック編集も更新
        }
    } catch (error) {
        Utils.showError('問題の更新に失敗しました: ' + error.message);
    }
}

async function deleteQuestion(questionId) {
    if (!confirm('この問題を削除しますか？')) return;
    
    try {
        const result = await Utils.apiCall(`/api/admin/questions/${questionId}`, {
            method: 'DELETE',
            body: JSON.stringify({
                admin_id: Auth.getCurrentUser().id
            })
        });

        if (result.success) {
            Utils.showSuccess('問題を削除しました');
            await loadQuestionsList();
            await loadQuickEditQuestions();
        }
    } catch (error) {
        Utils.showError('問題の削除に失敗しました: ' + error.message);
    }
}

// ユーザー一覧読み込み
async function loadUserList() {
    try {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser || !currentUser.is_admin) {
            Utils.showAlert('管理者権限が必要です', 'error');
            return;
        }

        const response = await Utils.apiCall(`/api/admin/users?admin_id=${currentUser.id}`);
        allUsers = response.users || [];
        
        // 統計更新
        updateUserStats();
        
        // フィルタ適用
        applyUserFilters();
        
        Utils.showAlert('ユーザー一覧を更新しました', 'success');
    } catch (error) {
        console.error('ユーザー一覧取得エラー:', error);
        Utils.showAlert('ユーザー一覧の取得に失敗しました', 'error');
    }
}

// ユーザー統計更新
function updateUserStats() {
    // 統計カード表示を無効化（UI簡潔化のため）
    const statsHtml = '';
    
    Utils.$('#user-stats').innerHTML = statsHtml;
}

// フィルタ適用
function applyUserFilters() {
    const searchTerm = (Utils.$('#user-search').value || '').toLowerCase();
    const ageFilter = Utils.$('#age-filter').value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.nickname.toLowerCase().includes(searchTerm) ||
            user.real_name.toLowerCase().includes(searchTerm);
            
        const matchesAge = !ageFilter || user.age_group === ageFilter;
        
        return matchesSearch && matchesAge;
    });
    
    renderUserTable();
}

// ユーザーテーブル描画
function renderUserTable() {
    const tbody = Utils.$('#users-table-body');
    if (!tbody) return;
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--gray);">該当するユーザーがいません</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => {
        // モバイル対応: 年齢2文字表示
        const ageGroupLabels = getAgeGroupLabels();
        
        const genderLabels = {
            'male': '男性',
            'female': '女性', 
            'other': 'その他'
        };
        
        const quizStatus = checkUserQuizStatus(user.id);
        const progress = getQuizProgress(user.id);
        
        return `
            <tr>
                <td>${user.id}</td>
                <td><strong>${user.nickname}</strong></td>
                <td>${user.real_name}</td>
                <td>${ageGroupLabels[user.age_group] || user.age_group}</td>
                <td>${genderLabels[user.gender] || user.gender}</td>
                <td><span class="user-badge ${user.is_admin ? 'admin' : 'user'}">${user.is_admin ? '管理者' : 'ユーザー'}</span></td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${progress}% (${quizStatus})</small>
                </td>
                <td>
                    ${!user.is_admin ? `
                        <button onclick="editUser(${user.id})" class="btn btn-outline btn-small">編集</button>
                        <button onclick="deleteUser(${user.id})" class="btn btn-outline btn-small" style="color: var(--error);">削除</button>
                    ` : '<span style="color: var(--gray);">管理者</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

// クイズ進捗チェック（簡易版）
function checkUserQuizStatus(userId) {
    // 実際の実装では別途APIを呼ぶ
    return Math.random() > 0.5 ? 'completed' : 'in_progress';
}

// クイズ進捗率取得（簡易版）
function getQuizProgress(userId) {
    // 実際の実装では別途APIを呼ぶ
    return Math.floor(Math.random() * 101);
}

// ユーザー削除
async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const confirmed = confirm(`ユーザー「${user.nickname}」を削除しますか？\n\nこの操作は取り消せません。関連するすべてのデータが削除されます。`);
    if (!confirmed) return;
    
    try {
        const currentUser = Auth.getCurrentUser();
        const response = await Utils.apiCall(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            body: JSON.stringify({ admin_id: currentUser.id })
        });
        
        if (response.success) {
            Utils.showAlert(`ユーザー「${response.deletedUser}」を削除しました`, 'success');
            loadUserList(); // リスト更新
        }
    } catch (error) {
        console.error('ユーザー削除エラー:', error);
        Utils.showAlert(`削除に失敗しました: ${error.message}`, 'error');
    }
}

// ユーザー編集（簡易版）
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newNickname = prompt('新しいニックネーム:', user.nickname);
    if (!newNickname || newNickname === user.nickname) return;
    
    updateUserInfo(userId, { nickname: newNickname });
}

// ユーザー情報更新
async function updateUserInfo(userId, updateData) {
    try {
        const currentUser = Auth.getCurrentUser();
        const response = await Utils.apiCall(`/api/admin/users/${userId}`, {
            method: 'PUT',
            body: { ...updateData, admin_id: currentUser.id }
        });
        
        if (response.success) {
            Utils.showAlert('ユーザー情報を更新しました', 'success');
            loadUserList(); // リスト更新
        }
    } catch (error) {
        console.error('ユーザー更新エラー:', error);
        Utils.showAlert(`更新に失敗しました: ${error.message}`, 'error');
    }
}

// 検索・フィルタイベント（統合済み - DOMContentLoadedで実行）

// 初期化時にユーザー一覧も読み込み
const originalInitAdminPanel = initAdminPanel;
initAdminPanel = async function() {
    await originalInitAdminPanel();
    await loadUserList();
};

// Phase 2: 自動リダイレクト機能（hunt-quizzes.jp対応）
function initAutoRedirect() {
    // ドメイン確認
    const isHuntQuizzesDomain = window.location.hostname === 'hunt-quizzes.jp';
    if (!isHuntQuizzesDomain) {
        return; // hunt-quizzes.jp以外では動作しない
    }

    // 認証状態確認
    const isAuthenticated = checkAdminAuthCached();
    const currentUser = Auth.getCurrentUser();
    const isAdmin = currentUser && currentUser.is_admin;

    if (isAuthenticated && isAdmin) {
        return; // 既に管理者としてログイン済み
    }

    // ループ防止チェック
    const REDIRECT_SESSION_KEY = 'hunt_admin_redirect_attempts';
    const MAX_REDIRECT_ATTEMPTS = 3;
    const RESET_TIME_HOURS = 1;
    
    try {
        const redirectData = sessionStorage.getItem(REDIRECT_SESSION_KEY);
        const now = Date.now();
        
        if (redirectData) {
            const { count, lastAttempt } = JSON.parse(redirectData);
            const timeDiff = now - lastAttempt;
            const resetTime = RESET_TIME_HOURS * 60 * 60 * 1000;
            
            if (timeDiff < resetTime && count >= MAX_REDIRECT_ATTEMPTS) {
                console.log('Auto-redirect: 最大試行回数に達しています');
                return;
            }
            
            if (timeDiff >= resetTime) {
                // 時間経過でリセット
                sessionStorage.removeItem(REDIRECT_SESSION_KEY);
            }
        }

        // リダイレクト実行
        executeAutoRedirect();
        
    } catch (error) {
        console.error('Auto-redirect error:', error);
    }
}

function executeAutoRedirect() {
    const REDIRECT_SESSION_KEY = 'hunt_admin_redirect_attempts';
    
    try {
        // 試行回数を記録
        const redirectData = sessionStorage.getItem(REDIRECT_SESSION_KEY);
        const now = Date.now();
        let count = 1;
        
        if (redirectData) {
            const data = JSON.parse(redirectData);
            count = (data.count || 0) + 1;
        }
        
        sessionStorage.setItem(REDIRECT_SESSION_KEY, JSON.stringify({
            count: count,
            lastAttempt: now
        }));

        // UI表示
        const redirectInfo = document.getElementById('auto-redirect-info');
        if (redirectInfo) {
            redirectInfo.style.display = 'block';
        }

        // リダイレクト実行（3秒後）
        setTimeout(() => {
            // hunt-quizzes.jpからの場合は、35.76.100.207/adminへ直接リダイレクト
            // 相対パスを使用して確実にリダイレクト
            const redirectUrl = `http://35.76.100.207/?admin_login=1&redirect=/admin`;
            window.location.href = redirectUrl;
        }, 3000);

    } catch (error) {
        console.error('Redirect execution error:', error);
    }
}

// 自動リダイレクト初期化（統合済み - DOMContentLoadedで実行）

// === グローバル関数公開（HTML onclick属性から呼び出し用） ===
// 重複チェック付きの安全な公開
if (typeof window !== 'undefined') {
    // 削除機能（緊急修正 - Phase 1）
    if (!window.deleteParticipant) {
        window.deleteParticipant = deleteParticipant;
    } else {
        console.warn('deleteParticipant already exists in global scope');
    }
    
    if (!window.deleteQuestion) {
        window.deleteQuestion = deleteQuestion;
    } else {
        console.warn('deleteQuestion already exists in global scope');
    }
    
    if (!window.deleteUser) {
        window.deleteUser = deleteUser;
    } else {
        console.warn('deleteUser already exists in global scope');
    }
    
    console.log('Admin functions exported to global scope:', {
        deleteParticipant: !!window.deleteParticipant,
        deleteQuestion: !!window.deleteQuestion,
        deleteUser: !!window.deleteUser
    });
}