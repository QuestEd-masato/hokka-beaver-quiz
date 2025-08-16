// 既存のsurveyAnswersデータにanswersフィールドを追加するスクリプト
const fs = require('fs');

try {
  const dbPath = './data/database.json';
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  // surveyAnswersデータの移行
  if (data.surveyAnswers && Array.isArray(data.surveyAnswers)) {
    data.surveyAnswers.forEach(([userId, surveyData]) => {
      if (surveyData && !surveyData.answers) {
        // answersフィールドが存在しない場合、空のオブジェクトを追加
        surveyData.answers = {};
        
        // feedbackがJSON形式の場合、パースを試みる
        if (surveyData.feedback && surveyData.feedback.startsWith('{')) {
          try {
            surveyData.answers = JSON.parse(surveyData.feedback);
          } catch (e) {
            // パース失敗時は空のまま
            console.log(`Failed to parse feedback for user ${userId}`);
          }
        }
      }
    });
    
    // 更新されたデータを保存
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    console.log('✅ Survey data migration completed');
  }
} catch (error) {
  console.error('Migration error:', error);
}
