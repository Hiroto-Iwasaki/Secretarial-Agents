// OpenAI APIクライアント
const OpenAI = require('openai');

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.warn('Warning: OPENAI_API_KEY環境変数が設定されていません');
}

// OpenAIクライアントを作成（APIキーが設定されている場合のみ）
const openai = openaiApiKey 
  ? new OpenAI({
      apiKey: openaiApiKey,
    })
  : null;

module.exports = { openai };
