// モダン/拡張性重視の最小Expressサーバ
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { supabase } = require('./supabaseClient');
const { openai } = require('./openaiClient');
const modelsConfig = require('./config/models.json');
const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB制限
  abortOnLimit: true,
  responseOnLimit: '音声ファイルサイズが大きすぎます（最大50MB）'
}));

const fs = require('fs');
const path = require('path');

// モックAIリスト
const availableAIs = {
  dialog: ["GPT-4", "Claude", "Gemini", "独自LLM"],
  stt: ["Whisper", "Google STT", "Azure Speech"],
  tts: ["Google TTS", "Azure TTS", "OpenJTalk"],
  slide: ["Copilot", "Gemini", "独自LLM"],
  research: ["Perplexity", "WebPilot", "独自LLM"],
  tool: ["Code Interpreter", "Wolfram", "独自ツール"]
};

// モデル情報をconfig/models.jsonから取得
function getModelsConfig() {
  try {
    const filePath = path.join(__dirname, 'config', 'models.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

app.get('/api/available-ais', (req, res) => {
  const models = getModelsConfig();
  res.json({
    ais: availableAIs,
    models
  });
});

// ユーザーの対話モデル設定を取得
async function getUserDialogModel(userId) {
  if (!supabase || !userId) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('dialog_model')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('設定取得エラー:', error);
      return null;
    }
    
    return data?.dialog_model || null;
  } catch (error) {
    console.error('Supabase接続エラー:', error);
    return null;
  }
}

// OpenAI APIを使用してAI応答を生成
async function generateAIResponse(message, modelName) {
  if (!openai) {
    throw new Error('OpenAI APIが設定されていません');
  }
  
  // モデル名から実際のOpenAIモデル名を抽出
  // 例: "openai:gpt-4.1-mini" -> "gpt-4.1-mini"
  const actualModelName = modelName.includes(':') 
    ? modelName.split(':')[1] 
    : modelName;
  
  try {
    const completion = await openai.chat.completions.create({
      model: actualModelName,
      messages: [
        {
          role: "system",
          content: "あなたは親切で知識豊富なAIアシスタントです。日本語で自然に会話してください。"
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API呼び出しエラー:', error);
    throw error;
  }
}

// ユーザーのSTTモデル設定を取得
async function getUserSTTModel(userId) {
  if (!supabase || !userId) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('stt_model')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('STT設定取得エラー:', error);
      return null;
    }
    
    return data?.stt_model || null;
  } catch (error) {
    console.error('Supabase接続エラー:', error);
    return null;
  }
}

// ユーザーのTTSモデル設定を取得
async function getUserTTSModel(userId) {
  if (!supabase || !userId) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('tts_model')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('TTS設定取得エラー:', error);
      return null;
    }
    
    return data?.tts_model || null;
  } catch (error) {
    console.error('Supabase接続エラー:', error);
    return null;
  }
}

// OpenAI Whisper APIを使用して音声認識
async function transcribeAudio(audioFile, modelName) {
  if (!openai) {
    throw new Error('OpenAI APIが設定されていません');
  }
  
  // モデル名から実際のOpenAIモデル名を抽出
  const actualModelName = modelName.includes(':') 
    ? modelName.split(':')[1] 
    : modelName;
  
  try {
    // express-fileuploadのファイルオブジェクトを適切な形式に変換
    const fileBuffer = audioFile.data;
    const fileName = audioFile.name || 'audio.webm';
    const mimeType = audioFile.mimetype || 'audio/webm';
    
    console.log('STT処理開始:', {
      fileName: fileName,
      fileSize: fileBuffer.length,
      mimeType: mimeType,
      model: actualModelName
    });
    
    // Node.js環境でOpenAI APIにファイルを渡すためのReadableStreamを作成
    const { Readable } = require('stream');
    const fileStream = Readable.from(fileBuffer);
    fileStream.path = fileName;
    
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: actualModelName,
      language: 'ja', // 日本語を優先
    });
    
    console.log('STT処理完了:', transcription.text);
    return transcription.text;
  } catch (error) {
    console.error('OpenAI Whisper API呼び出しエラー:', error);
    console.error('エラー詳細:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    throw error;
  }
}

// OpenAI TTS APIを使用して音声合成
async function synthesizeSpeech(text, modelName, voice = 'alloy') {
  if (!openai) {
    throw new Error('OpenAI APIが設定されていません');
  }
  
  // モデル名から実際のOpenAIモデル名を抽出
  const actualModelName = modelName.includes(':') 
    ? modelName.split(':')[1] 
    : modelName;
  
  try {
    const mp3 = await openai.audio.speech.create({
      model: actualModelName,
      voice: voice,
      input: text,
    });
    
    return mp3;
  } catch (error) {
    console.error('OpenAI TTS API呼び出しエラー:', error);
    throw error;
  }
}

// チャットAPI（段階的実装：設定連携追加）
app.post('/api/chat', async (req, res) => {
  const { message, userId } = req.body;
  
  // 入力検証
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'メッセージが必要です' });
  }
  
  // ユーザーの対話モデル設定を取得
  const selectedModel = await getUserDialogModel(userId);
  
  try {
    let aiResponse;
    
    if (selectedModel && openai) {
      // 設定されたモデルで実際のAI応答を生成
      aiResponse = await generateAIResponse(message, selectedModel);
    } else {
      // フォールバック: エコー応答
      aiResponse = selectedModel 
        ? `設定モデル「${selectedModel}」でのエコー応答: ${message}`
        : `デフォルトエコー応答（設定未選択）: ${message}`;
    }
    
    const response = {
      message: aiResponse,
      model: selectedModel || 'echo-default',
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('AI応答生成エラー:', error);
    
    // エラー時はエコー応答にフォールバック
    const fallbackResponse = {
      message: `エラーが発生しました。エコー応答: ${message}`,
      model: selectedModel || 'error-fallback',
      timestamp: new Date().toISOString(),
      error: 'AI応答生成に失敗しました'
    };
    
    res.json(fallbackResponse);
  }
});

// STT API（音声認識）
app.post('/api/stt', async (req, res) => {
  const { userId } = req.body;
  
  // ファイルアップロードの検証
  if (!req.files || !req.files.audio) {
    return res.status(400).json({ error: '音声ファイルが必要です' });
  }
  
  try {
    // ユーザーのSTTモデル設定を取得
    const selectedModel = await getUserSTTModel(userId);
    
    if (selectedModel && openai) {
      // 実際のSTT処理
      const audioFile = req.files.audio;
      const transcription = await transcribeAudio(audioFile, selectedModel);
      
      const response = {
        text: transcription,
        model: selectedModel,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } else {
      // フォールバック
      const fallbackResponse = {
        text: 'STTモデルが設定されていません',
        model: selectedModel || 'stt-not-configured',
        timestamp: new Date().toISOString()
      };
      
      res.json(fallbackResponse);
    }
  } catch (error) {
    console.error('STT処理エラー:', error);
    
    const errorResponse = {
      text: '音声認識に失敗しました',
      model: 'error-fallback',
      timestamp: new Date().toISOString(),
      error: error.message
    };
    
    res.status(500).json(errorResponse);
  }
});

// TTS API（音声合成）
app.post('/api/tts', async (req, res) => {
  const { text, userId, voice } = req.body;
  
  // 入力検証
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'テキストが必要です' });
  }
  
  try {
    // ユーザーのTTSモデル設定を取得
    const selectedModel = await getUserTTSModel(userId);
    
    if (selectedModel && openai) {
      // 実際のTTS処理
      const audioStream = await synthesizeSpeech(text, selectedModel, voice || 'alloy');
      
      // 音声データをBase64エンコードして返す
      const buffer = Buffer.from(await audioStream.arrayBuffer());
      const base64Audio = buffer.toString('base64');
      
      const response = {
        audio: base64Audio,
        model: selectedModel,
        voice: voice || 'alloy',
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
    } else {
      // フォールバック
      const fallbackResponse = {
        audio: null,
        model: selectedModel || 'tts-not-configured',
        timestamp: new Date().toISOString(),
        message: 'TTSモデルが設定されていません'
      };
      
      res.json(fallbackResponse);
    }
  } catch (error) {
    console.error('TTS処理エラー:', error);
    
    const errorResponse = {
      audio: null,
      model: 'error-fallback',
      timestamp: new Date().toISOString(),
      error: error.message
    };
    
    res.status(500).json(errorResponse);
  }
});

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});
