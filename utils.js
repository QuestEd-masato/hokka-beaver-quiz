/**
 * hokkaクイズラリー - ユーティリティ機能
 * 分離日: 2025-08-10
 * 
 * 機能:
 * - MIMEタイプ判定
 * - ファイル拡張子処理
 * - 共通ユーティリティ関数
 */

/**
 * MIMEタイプマッピング
 * ファイルの拡張子から適切なContent-Typeを決める
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

/**
 * ファイル拡張子からMIMEタイプを取得
 * 
 * @param {string} filePath - ファイルパス
 * @returns {string} MIMEタイプ文字列
 */
function getMimeType(filePath) {
  const path = require('path');
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'text/plain';
}

/**
 * レスポンスヘッダーの共通設定
 * CORS対応とセキュリティヘッダーを設定
 * 
 * @param {http.ServerResponse} res - レスポンスオブジェクト
 */
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * エラーレスポンスを送信
 * 
 * @param {http.ServerResponse} res - レスポンスオブジェクト
 * @param {number} statusCode - ステータスコード
 * @param {string} message - エラーメッセージ
 */
function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

/**
 * JSONレスポンスを送信
 * 
 * @param {http.ServerResponse} res - レスポンスオブジェクト
 * @param {Object} data - 送信するデータ
 * @param {number} statusCode - ステータスコード（デフォルト: 200）
 */
function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

/**
 * CSVレスポンスを送信（BOM付きUTF-8）
 * 
 * @param {http.ServerResponse} res - レスポンスオブジェクト
 * @param {string} csvData - CSVデータ
 * @param {string} filename - ダウンロードファイル名
 */
function sendCSV(res, csvData, filename) {
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`
  });
  res.end('\ufeff' + csvData); // BOM付きUTF-8
}

/**
 * 静的ファイルかどうかを判定
 * 
 * @param {string} pathname - リクエストパス
 * @returns {boolean} 静的ファイルの場合true
 */
function isStaticFile(pathname) {
  return pathname.startsWith('/css/') || 
         pathname.startsWith('/js/') || 
         pathname.startsWith('/images/');
}

/**
 * HTMLページかどうかを判定
 * 
 * @param {string} pathname - リクエストパス
 * @returns {boolean} HTMLページの場合true
 */
function isHTMLPage(pathname) {
  const htmlPages = ['login', 'register', 'mypage', 'quiz', 'ranking', 'survey', 'admin', 'result', 'review'];
  const pageName = pathname.replace('/', '');
  return htmlPages.includes(pageName);
}

/**
 * リクエストボディを取得（JSON形式）
 * 
 * @param {http.IncomingMessage} req - リクエストオブジェクト
 * @returns {Promise<Object>} パースされたJSONデータ
 */
function getRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        resolve({});
      }
    });
  });
}

// モジュールとしてエクスポート
module.exports = {
  MIME_TYPES,
  getMimeType,
  setCORSHeaders,
  sendError,
  sendJSON,
  sendCSV,
  isStaticFile,
  isHTMLPage,
  getRequestBody
};