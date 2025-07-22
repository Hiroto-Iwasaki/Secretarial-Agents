// WakeWordDetector.js
// ウェイクワード検出専用クラス（単一責任原則）
export default class WakeWordDetector {
  constructor() {
    // ウェイクワード検出状態
    this.wakeWordModel = null;
    this.wakeWordBuffer = [];
    this.lastWakeWordCheck = 0;
    this.wakeWordThreshold = 0.8; // 類似度閾値
    
    // 設定
    this.user = null;
    this.isEnabled = false;
    
    // コールバック
    this.onWakeWordDetected = null;
    
    console.log('[WakeWordDetector] 初期化完了');
  }

  // 初期化
  async initialize(user) {
    this.user = user;
    
    try {
      await this.loadWakeWordModel();
      this.isEnabled = true;
      console.log('[WakeWordDetector] 初期化・有効化完了');
      return true;
    } catch (error) {
      console.error('[WakeWordDetector] 初期化失敗:', error);
      this.isEnabled = false;
      return false;
    }
  }

  // ウェイクワードモデル読み込み
  async loadWakeWordModel() {
    if (!this.user?.id) {
      throw new Error('ユーザー情報が未設定');
    }

    try {
      const response = await fetch(`http://localhost:3001/api/journey-room/wake-word-model?userId=${this.user.id}`, {
        headers: { 'Authorization': `Bearer ${this.user.access_token}` }
      });
      
      if (!response.ok) {
        throw new Error('ウェイクワードモデル読み込み失敗');
      }
      
      this.wakeWordModel = await response.json();
      console.log('[WakeWordDetector] ウェイクワードモデル読み込み完了');
      
    } catch (error) {
      console.error('[WakeWordDetector] ウェイクワードモデル読み込みエラー:', error);
      throw error;
    }
  }

  // ウェイクワード検出（テキストベース）
  checkWakeWordFromText(text) {
    if (!this.isEnabled) return false;
    
    const normalizedText = text.toLowerCase().trim();
    
    // 簡易的な文字列マッチング（実際は音声特徴量比較）
    const wakeWords = ['ジャーニー', 'journey', 'じゃーにー'];
    
    for (const wakeWord of wakeWords) {
      if (normalizedText.includes(wakeWord.toLowerCase())) {
        console.log('[WakeWordDetector] ウェイクワード検出:', wakeWord);
        this.handleWakeWordDetection();
        return true;
      }
    }
    
    return false;
  }

  // ウェイクワード検出（音声特徴量ベース - Phase3.1で実装）
  checkWakeWordFromAudio(audioFeatures) {
    if (!this.isEnabled || !this.wakeWordModel) return false;
    
    // TODO: Phase3.1で実装
    // - 音声特徴量抽出
    // - 学習済みモデルとの類似度計算
    // - 閾値判定
    
    console.log('[WakeWordDetector] 音声特徴量ベース検出（未実装）');
    return false;
  }

  // リアルタイム音声バッファ処理（Phase3.1で実装）
  processAudioBuffer(audioBuffer) {
    if (!this.isEnabled) return false;
    
    // TODO: Phase3.1で実装
    // - 音声バッファの蓄積
    // - リアルタイム特徴量抽出
    // - 継続的ウェイクワード検出
    
    this.wakeWordBuffer.push(audioBuffer);
    
    // バッファサイズ制限（メモリ効率化）
    if (this.wakeWordBuffer.length > 100) {
      this.wakeWordBuffer.shift();
    }
    
    return false;
  }

  // ウェイクワード検出時の処理
  handleWakeWordDetection() {
    console.log('[WakeWordDetector] ウェイクワード検出 - コールバック実行');
    
    // 検出時刻記録
    this.lastWakeWordCheck = Date.now();
    
    // コールバック実行
    if (this.onWakeWordDetected) {
      this.onWakeWordDetected();
    }
  }

  // 設定更新
  updateSettings(newSettings) {
    if (newSettings.wakeWordThreshold !== undefined) {
      this.wakeWordThreshold = newSettings.wakeWordThreshold;
    }
    
    console.log('[WakeWordDetector] 設定更新:', newSettings);
  }

  // 有効化/無効化
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log('[WakeWordDetector] 状態変更:', enabled ? '有効' : '無効');
  }

  // 状態取得
  getState() {
    return {
      isEnabled: this.isEnabled,
      hasModel: !!this.wakeWordModel,
      bufferSize: this.wakeWordBuffer.length,
      lastCheck: this.lastWakeWordCheck,
      threshold: this.wakeWordThreshold
    };
  }

  // 学習データリセット
  async resetTrainingData() {
    if (!this.user?.id) {
      throw new Error('ユーザー情報が未設定');
    }

    try {
      const response = await fetch(`http://localhost:3001/api/journey-room/wake-word-training?userId=${this.user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.user.access_token}` }
      });
      
      if (!response.ok) {
        throw new Error('学習データリセット失敗');
      }
      
      const result = await response.json();
      
      // ローカル状態もリセット
      this.wakeWordModel = null;
      this.wakeWordBuffer = [];
      this.lastWakeWordCheck = 0;
      
      console.log('[WakeWordDetector] 学習データリセット完了:', result.message);
      return result;
      
    } catch (error) {
      console.error('[WakeWordDetector] 学習データリセットエラー:', error);
      throw error;
    }
  }

  // モデルリセット（学習データリセットのエイリアス）
  async resetModel() {
    return await this.resetTrainingData();
  }

  // 停止・クリーンアップ
  stop() {
    this.isEnabled = false;
    this.wakeWordBuffer = [];
    this.wakeWordModel = null;
    
    console.log('[WakeWordDetector] 停止・クリーンアップ完了');
  }
}
