// Journey Room API Routes
// 単一責任原則：ウェイクワード学習・幾何学模様制御のみを担当

const express = require('express');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../supabaseClient');

const router = express.Router();

// ウェイクワード学習データ保存ディレクトリ
const WAKE_WORD_DIR = path.join(__dirname, '..', 'wake-word-models');
const GEOMETRIC_CONFIG_FILE = path.join(__dirname, '..', 'config', 'geometric-config.json');

// ディレクトリ作成（存在しない場合）
if (!fs.existsSync(WAKE_WORD_DIR)) {
  fs.mkdirSync(WAKE_WORD_DIR, { recursive: true });
}

// デフォルト幾何学模様設定
const DEFAULT_GEOMETRIC_CONFIG = {
  idle: {
    formula: "sin(t * 0.5) * cos(r * 0.3)",
    colors: ["#0066cc", "#004499", "#0088ff"],
    speed: 0.02,
    amplitude: 1.0,
    frequency: 1.0
  },
  listening: {
    formula: "sin(t * 2 + r) * audioLevel * 2",
    colors: ["#00ff88", "#00cc66", "#00ffaa"],
    speed: 0.1,
    amplitude: 2.0,
    frequency: 2.0
  },
  processing: {
    formula: "cos(t * 3) * sin(r * 2) * 1.5",
    colors: ["#ff8800", "#cc6600", "#ffaa00"],
    speed: 0.15,
    amplitude: 1.5,
    frequency: 3.0
  },
  responding: {
    formula: "sin(t + r * 0.5) * cos(t * 0.8)",
    colors: ["#ff0066", "#cc0044", "#ff0088"],
    speed: 0.08,
    amplitude: 1.2,
    frequency: 1.5
  }
};

// 幾何学模様設定を読み込み
function loadGeometricConfig() {
  try {
    if (fs.existsSync(GEOMETRIC_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(GEOMETRIC_CONFIG_FILE, 'utf-8'));
    }
  } catch (error) {
    console.error('幾何学模様設定読み込みエラー:', error);
  }
  return DEFAULT_GEOMETRIC_CONFIG;
}

// 幾何学模様設定を保存
function saveGeometricConfig(config) {
  try {
    const configDir = path.dirname(GEOMETRIC_CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(GEOMETRIC_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('幾何学模様設定保存エラー:', error);
    return false;
  }
}

// ユーザーのウェイクワード学習状態を取得
async function getWakeWordStatus(userId) {
  if (!supabase || !userId) {
    return { trained: false, trainingCount: 0 };
  }
  
  try {
    const { data, error } = await supabase
      .from('wake_word_training')
      .select('training_count, is_trained, created_at')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('ウェイクワード状態取得エラー:', error);
      return { trained: false, trainingCount: 0 };
    }
    
    return {
      trained: data?.is_trained || false,
      trainingCount: data?.training_count || 0,
      lastTraining: data?.created_at || null
    };
  } catch (error) {
    console.error('Supabase接続エラー:', error);
    return { trained: false, trainingCount: 0 };
  }
}

// ウェイクワード学習データを保存
async function saveWakeWordTraining(userId, audioFeatures, trainingCount) {
  if (!supabase || !userId) {
    return false;
  }
  
  try {
    const { data, error } = await supabase
      .from('wake_word_training')
      .upsert({
        user_id: userId,
        audio_features: audioFeatures,
        training_count: trainingCount,
        is_trained: trainingCount >= 3,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('ウェイクワード学習データ保存エラー:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase接続エラー:', error);
    return false;
  }
}

// 音声特徴量抽出（簡易版）
function extractAudioFeatures(audioBuffer) {
  // 実際の実装では、MFCC、スペクトログラム等を使用
  // ここでは簡易的な特徴量を計算
  const samples = new Float32Array(audioBuffer);
  const features = {
    duration: samples.length / 16000, // 16kHzサンプリングレート想定
    energy: 0,
    zeroCrossings: 0,
    spectralCentroid: 0,
    timestamp: Date.now()
  };
  
  // エネルギー計算
  for (let i = 0; i < samples.length; i++) {
    features.energy += samples[i] * samples[i];
  }
  features.energy = Math.sqrt(features.energy / samples.length);
  
  // ゼロクロッシング計算
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0) !== (samples[i-1] >= 0)) {
      features.zeroCrossings++;
    }
  }
  features.zeroCrossings = features.zeroCrossings / samples.length;
  
  return features;
}

// === API エンドポイント ===

// ウェイクワード学習状態取得
router.get('/wake-word-status', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDが必要です' });
  }
  
  try {
    const status = await getWakeWordStatus(userId);
    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ウェイクワード状態取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ウェイクワード状態の取得に失敗しました'
    });
  }
});

// ウェイクワード学習
router.post('/train-wake-word', async (req, res) => {
  const { userId } = req.body;
  
  // 入力検証
  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDが必要です' });
  }
  
  if (!req.files || !req.files.audio) {
    return res.status(400).json({ error: '音声ファイルが必要です' });
  }
  
  try {
    const audioFile = req.files.audio;
    
    // 音声ファイル検証
    if (audioFile.size > 10 * 1024 * 1024) { // 10MB制限
      return res.status(400).json({ error: '音声ファイルが大きすぎます（最大10MB）' });
    }
    
    // 現在の学習状態を取得
    const currentStatus = await getWakeWordStatus(userId);
    const newTrainingCount = currentStatus.trainingCount + 1;
    
    if (newTrainingCount > 3) {
      return res.status(400).json({ 
        error: '学習は最大3回までです',
        trainingCount: currentStatus.trainingCount
      });
    }
    
    // 音声特徴量抽出
    const audioFeatures = extractAudioFeatures(audioFile.data);
    
    // 学習データ保存
    const saved = await saveWakeWordTraining(userId, audioFeatures, newTrainingCount);
    
    if (!saved) {
      return res.status(500).json({ error: '学習データの保存に失敗しました' });
    }
    
    // 音声ファイルをローカルに保存（デバッグ用）
    const fileName = `${userId}_wake_word_${newTrainingCount}.wav`;
    const filePath = path.join(WAKE_WORD_DIR, fileName);
    await audioFile.mv(filePath);
    
    res.json({
      success: true,
      trainingCount: newTrainingCount,
      isCompleted: newTrainingCount >= 3,
      features: audioFeatures,
      message: newTrainingCount >= 3 
        ? 'ウェイクワード学習が完了しました！' 
        : `学習 ${newTrainingCount}/3 が完了しました`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('ウェイクワード学習エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ウェイクワード学習に失敗しました'
    });
  }
});

// ウェイクワードモデル取得
router.get('/wake-word-model', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDが必要です' });
  }
  
  try {
    // 現在の学習状態を取得
    const status = await getWakeWordStatus(userId);
    
    if (!status.trained) {
      return res.json({
        success: true,
        trained: false,
        message: 'ウェイクワードが未学習です',
        timestamp: new Date().toISOString()
      });
    }
    
    // 学習済みの場合、モデルデータを返す
    const { data, error } = await supabase
      .from('wake_word_training')
      .select('audio_features, training_count, updated_at')
      .eq('user_id', userId)
      .eq('is_trained', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('ウェイクワードモデル取得エラー:', error);
      return res.status(500).json({
        success: false,
        error: 'ウェイクワードモデルの取得に失敗しました'
      });
    }
    
    res.json({
      success: true,
      trained: true,
      model: {
        features: data.audio_features,
        trainingCount: data.training_count,
        lastUpdated: data.updated_at
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('ウェイクワードモデル取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ウェイクワードモデルの取得に失敗しました'
    });
  }
});

// 幾何学模様設定取得
router.get('/geometric-config', (req, res) => {
  try {
    const config = loadGeometricConfig();
    res.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('幾何学模様設定取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '設定の取得に失敗しました'
    });
  }
});

// 幾何学模様設定更新
router.post('/geometric-config', (req, res) => {
  const { config } = req.body;
  
  if (!config || typeof config !== 'object') {
    return res.status(400).json({ error: '設定データが必要です' });
  }
  
  try {
    // 設定検証
    const validModes = ['idle', 'listening', 'processing', 'responding'];
    const validatedConfig = {};
    
    for (const mode of validModes) {
      if (config[mode]) {
        validatedConfig[mode] = {
          formula: config[mode].formula || DEFAULT_GEOMETRIC_CONFIG[mode].formula,
          colors: Array.isArray(config[mode].colors) ? config[mode].colors : DEFAULT_GEOMETRIC_CONFIG[mode].colors,
          speed: typeof config[mode].speed === 'number' ? config[mode].speed : DEFAULT_GEOMETRIC_CONFIG[mode].speed,
          amplitude: typeof config[mode].amplitude === 'number' ? config[mode].amplitude : DEFAULT_GEOMETRIC_CONFIG[mode].amplitude,
          frequency: typeof config[mode].frequency === 'number' ? config[mode].frequency : DEFAULT_GEOMETRIC_CONFIG[mode].frequency
        };
      } else {
        validatedConfig[mode] = DEFAULT_GEOMETRIC_CONFIG[mode];
      }
    }
    
    const saved = saveGeometricConfig(validatedConfig);
    
    if (!saved) {
      return res.status(500).json({ error: '設定の保存に失敗しました' });
    }
    
    res.json({
      success: true,
      config: validatedConfig,
      message: '幾何学模様設定を更新しました',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('幾何学模様設定更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '設定の更新に失敗しました'
    });
  }
});

module.exports = router;
