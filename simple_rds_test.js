#!/usr/bin/env node
/**
 * シンプルなRDS接続テスト - hokka-beaver-quiz用
 * EC2環境での実行用（依存関係最小）
 */

const mysql = require('mysql2/promise');

// RDS接続設定（ハードコード版）
const dbConfig = {
  host: 'hokka-db.cdk0iio0s90g.ap-northeast-1.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'hokka-beaver-quiz-20250810',
  connectTimeout: 10000,
  acquireTimeout: 10000
};

console.log('🔍 RDS接続テスト（シンプル版）');
console.log('=' .repeat(40));
console.log(`📍 Host: ${dbConfig.host}`);
console.log(`📍 User: ${dbConfig.user}`);
console.log('=' .repeat(40));

async function simpleConnectionTest() {
  let connection;
  
  try {
    console.log('\n1️⃣ RDS接続試行中...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 接続成功！');
    
    console.log('\n2️⃣ 基本クエリテスト...');
    const [result] = await connection.query('SELECT 1 as test_value, NOW() as current_time');
    console.log('✅ クエリ実行成功:', result[0]);
    
    console.log('\n3️⃣ データベース一覧取得...');
    const [databases] = await connection.query('SHOW DATABASES');
    console.log('📋 利用可能なデータベース:');
    databases.forEach(db => {
      console.log(`  - ${Object.values(db)[0]}`);
    });
    
    console.log('\n4️⃣ hokka_quiz データベース作成...');
    await connection.query('CREATE DATABASE IF NOT EXISTS hokka_quiz');
    await connection.query('USE hokka_quiz');
    console.log('✅ データベース準備完了');
    
    console.log('\n' + '=' .repeat(40));
    console.log('🎉 RDS接続テスト完了！正常に動作しています。');
    console.log('=' .repeat(40));
    
  } catch (error) {
    console.error('\n❌ エラー発生:');
    console.error(`エラーコード: ${error.code}`);
    console.error(`エラーメッセージ: ${error.message}`);
    
    // エラー別ヒント
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 ヒント: RDSエンドポイント名を確認してください');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 ヒント: ユーザー名・パスワードを確認してください');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 ヒント: セキュリティグループ設定を確認してください');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n💡 ヒント: VPCネットワーク設定を確認してください');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📝 接続クローズ完了');
    }
  }
}

// メイン実行
simpleConnectionTest().catch(error => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});