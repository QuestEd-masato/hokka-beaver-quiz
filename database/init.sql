-- ビーバーほっかクイズ データベース初期化スクリプト
-- 作成日: 2025-07-14

-- データベース作成
CREATE DATABASE IF NOT EXISTS beaver_hokka_quiz 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE beaver_hokka_quiz;

-- ユーザーテーブル
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    age_group ENUM('elementary', 'junior_high', 'high_school', 'adult') NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 問題テーブル
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_number INT NOT NULL UNIQUE,
    question_text TEXT NOT NULL,
    choice_a VARCHAR(255) NOT NULL,
    choice_b VARCHAR(255) NOT NULL,
    choice_c VARCHAR(255) NOT NULL,
    choice_d VARCHAR(255) NOT NULL,
    correct_answer ENUM('A', 'B', 'C', 'D') NOT NULL,
    explanation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー解答テーブル
CREATE TABLE user_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_answer ENUM('A', 'B', 'C', 'D') NOT NULL,
    is_correct BOOLEAN,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_question (user_id, question_id)
);

-- クイズセッションテーブル
CREATE TABLE quiz_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_questions INT DEFAULT 10,
    answered_questions INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    score DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- アンケートテーブル
CREATE TABLE surveys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_type ENUM('rating', 'choice', 'text') NOT NULL,
    options JSON NULL, -- 選択肢がある場合
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーアンケート回答テーブル
CREATE TABLE user_survey_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    survey_id INT NOT NULL,
    answer_text TEXT,
    answer_rating INT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_survey (user_id, survey_id)
);

-- ランキングテーブル
CREATE TABLE rankings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    correct_answers INT NOT NULL,
    total_time_seconds INT,
    bonus_points DECIMAL(5,2) DEFAULT 0.00,
    final_score DECIMAL(5,2) NOT NULL,
    rank_position INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 初期データ投入: アドミンユーザー
INSERT INTO users (nickname, age_group, gender, password_hash, is_admin) VALUES
('admin', 'adult', 'other', '$2b$10$dummyhash', TRUE);

-- 初期データ投入: サンプル問題（10問）
INSERT INTO questions (question_number, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation) VALUES
(1, 'ビーバーの特徴として正しいものはどれでしょうか？', '魚を食べる', '木をかじる', '空を飛ぶ', '砂漠に住む', 'B', 'ビーバーは木をかじってダムを作る動物として有名です。'),
(2, 'おかきの主な原料は何でしょうか？', '小麦粉', 'とうもろこし', 'もち米', 'そば粉', 'C', 'おかきはもち米を原料として作られるお菓子です。'),
(3, '北陸地方に含まれる県はどれでしょうか？', '静岡県', '岐阜県', '石川県', '山梨県', 'C', '北陸地方は新潟県、富山県、石川県、福井県の4県で構成されています。'),
(4, 'ビーバーが作る構造物は何と呼ばれるでしょうか？', 'ダム', '巣', '穴', '橋', 'A', 'ビーバーは川に木や石を積み上げてダムを作ります。'),
(5, 'おかきとせんべいの主な違いは何でしょうか？', '大きさ', '色', '原料', '形', 'C', 'おかきはもち米、せんべいはうるち米が主な原料の違いです。'),
(6, '石川県の県庁所在地はどこでしょうか？', '小松市', '金沢市', '白山市', '能美市', 'B', '石川県の県庁所在地は金沢市です。'),
(7, 'ビーバーの歯の特徴として正しいものはどれでしょうか？', '一生伸び続ける', '毒がある', '透明である', '夜光る', 'A', 'ビーバーの前歯は一生伸び続けるため、木をかじって削る必要があります。'),
(8, '「ほっか」という言葉の意味で正しいものはどれでしょうか？', '温かい', '冷たい', '甘い', '辛い', 'A', '「ほっか」は「温かい」という意味の方言です。'),
(9, 'ビーバーの尻尾の形はどれに似ているでしょうか？', '扇子', 'しゃもじ', '箸', 'スプーン', 'B', 'ビーバーの尻尾は平たくてしゃもじのような形をしています。'),
(10, '米菓子の保存方法として最も適切なものはどれでしょうか？', '冷蔵庫', '冷凍庫', '直射日光の当たる場所', '湿気の少ない涼しい場所', 'D', '米菓子は湿気を避けて涼しい場所で保存するのが最適です。');

-- 初期データ投入: アンケート質問
INSERT INTO surveys (question_text, question_type, options, display_order) VALUES
('このクイズの難易度はいかがでしたか？', 'rating', '{"min": 1, "max": 5, "labels": ["とても簡単", "簡単", "普通", "難しい", "とても難しい"]}', 1),
('このクイズは楽しかったですか？', 'rating', '{"min": 1, "max": 5, "labels": ["全然楽しくない", "楽しくない", "普通", "楽しい", "とても楽しい"]}', 2),
('ビーバーやおかきについて新しいことを学べましたか？', 'choice', '{"options": ["はい、たくさん学べた", "少し学べた", "あまり学べなかった", "全く学べなかった"]}', 3),
('今回の文化祭の感想を自由にお書きください', 'text', null, 4);

-- インデックス作成
CREATE INDEX idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_rankings_score ON rankings(final_score DESC);
CREATE INDEX idx_rankings_user_id ON rankings(user_id);