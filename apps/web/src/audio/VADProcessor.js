// VADProcessor.js
// Voice Activity Detection - 音量ベース発話区間検出
// クロスプラットフォーム対応（Web/Mobile抽象化）

/**
 * VADProcessor - 音量ベースの発話区間検出
 * 
 * 設計原則:
 * - シンプル: 音量ベースの軽量実装
 * - モダン: Web Audio API活用
 * - 拡張性: パラメータ調整可能
 * - 単一責任: VAD検出のみに特化
 */
export class VADProcessor {
  constructor(options = {}) {
    // 調整可能パラメータ
    this.config = {
      // 音量閾値（0-1）
      volumeThreshold: options.volumeThreshold || 0.01,
      
      // 発話開始判定時間（ms）
      speechStartDelay: options.speechStartDelay || 100,
      
      // 発話終了判定時間（ms）
      speechEndDelay: options.speechEndDelay || 800,
      
      // 分析フレームサイズ
      fftSize: options.fftSize || 2048,
      
      // 最小発話時間（ms）
      minSpeechDuration: options.minSpeechDuration || 500,
      
      // 最大発話時間（ms）
      maxSpeechDuration: options.maxSpeechDuration || 30000,
      
      // デバッグモード
      debug: options.debug || false
    };

    // 内部状態
    this.isListening = false;
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.lastVolumeTime = 0;
    this.speechStartTimer = null;
    this.speechEndTimer = null;
    
    // Web Audio API
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    
    // コールバック
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onVolumeChange = null;
    
    this.log('VADProcessor初期化完了', this.config);
  }

  /**
   * VAD開始
   * @param {MediaStream} stream - 音声ストリーム
   */
  async start(stream) {
    if (this.isListening) {
      this.log('VAD既に開始済み');
      return;
    }

    try {
      // Web Audio Context初期化
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // 音声ストリーム接続
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      
      // 分析用バッファ
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.isListening = true;
      this.log('VAD開始');
      
      // 音量分析ループ開始
      this.analyzeVolume();
      
    } catch (error) {
      this.log('VAD開始エラー:', error);
      throw error;
    }
  }

  /**
   * VAD停止
   */
  stop() {
    if (!this.isListening) return;

    this.isListening = false;
    
    // タイマークリア
    if (this.speechStartTimer) {
      clearTimeout(this.speechStartTimer);
      this.speechStartTimer = null;
    }
    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }
    
    // 発話中の場合は終了イベント発火
    if (this.isSpeaking) {
      this.handleSpeechEnd();
    }
    
    // Web Audio リソース解放
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.log('VAD停止');
  }

  /**
   * 音量分析ループ
   */
  analyzeVolume() {
    if (!this.isListening) return;

    // 音量データ取得
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // RMS音量計算
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    const volume = rms / 255; // 0-1に正規化
    
    // 音量変化コールバック
    if (this.onVolumeChange) {
      this.onVolumeChange(volume);
    }
    
    // 発話判定
    const now = Date.now();
    if (volume > this.config.volumeThreshold) {
      this.lastVolumeTime = now;
      this.handleVolumeDetected();
    } else {
      this.handleSilence(now);
    }
    
    // 次フレーム
    requestAnimationFrame(() => this.analyzeVolume());
  }

  /**
   * 音量検出時の処理
   */
  handleVolumeDetected() {
    if (this.isSpeaking) {
      // 既に発話中 - 終了タイマーをクリア
      if (this.speechEndTimer) {
        clearTimeout(this.speechEndTimer);
        this.speechEndTimer = null;
      }
    } else {
      // 発話開始候補 - 開始タイマー設定
      if (!this.speechStartTimer) {
        this.speechStartTimer = setTimeout(() => {
          this.handleSpeechStart();
        }, this.config.speechStartDelay);
      }
    }
  }

  /**
   * 無音検出時の処理
   */
  handleSilence(now) {
    if (this.speechStartTimer) {
      // 発話開始前の無音 - 開始タイマークリア
      clearTimeout(this.speechStartTimer);
      this.speechStartTimer = null;
    } else if (this.isSpeaking) {
      // 発話中の無音 - 終了タイマー設定
      if (!this.speechEndTimer) {
        this.speechEndTimer = setTimeout(() => {
          this.handleSpeechEnd();
        }, this.config.speechEndDelay);
      }
    }
  }

  /**
   * 発話開始処理
   */
  handleSpeechStart() {
    if (this.isSpeaking) return;

    this.isSpeaking = true;
    this.speechStartTime = Date.now();
    this.speechStartTimer = null;
    
    this.log('発話開始検出');
    
    if (this.onSpeechStart) {
      this.onSpeechStart();
    }

    // 最大発話時間でのタイムアウト設定
    setTimeout(() => {
      if (this.isSpeaking) {
        this.log('最大発話時間到達 - 強制終了');
        this.handleSpeechEnd();
      }
    }, this.config.maxSpeechDuration);
  }

  /**
   * 発話終了処理
   */
  handleSpeechEnd() {
    if (!this.isSpeaking) return;

    const speechDuration = Date.now() - this.speechStartTime;
    
    // 最小発話時間チェック
    if (speechDuration < this.config.minSpeechDuration) {
      this.log(`発話時間不足 (${speechDuration}ms) - 無視`);
      this.isSpeaking = false;
      this.speechEndTimer = null;
      return;
    }

    this.isSpeaking = false;
    this.speechEndTimer = null;
    
    this.log(`発話終了検出 (${speechDuration}ms)`);
    
    if (this.onSpeechEnd) {
      this.onSpeechEnd(speechDuration);
    }
  }

  /**
   * 現在の音量レベル取得
   */
  getCurrentVolume() {
    if (!this.isListening || !this.dataArray) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    return rms / 255;
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log('設定更新:', this.config);
  }

  /**
   * デバッグログ
   */
  log(...args) {
    if (this.config.debug) {
      console.log('[VADProcessor]', ...args);
    }
  }

  /**
   * 状態取得
   */
  getState() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      currentVolume: this.getCurrentVolume(),
      config: this.config
    };
  }
}

/**
 * プラットフォーム抽象化インターフェース
 * 将来のMobile対応時に実装
 */
export class VADProcessorInterface {
  async start(stream) {
    throw new Error('Not implemented');
  }
  
  stop() {
    throw new Error('Not implemented');
  }
  
  updateConfig(config) {
    throw new Error('Not implemented');
  }
  
  getState() {
    throw new Error('Not implemented');
  }
}

/**
 * ファクトリー関数 - プラットフォーム別VAD作成
 */
export function createVADProcessor(platform = 'web', options = {}) {
  switch (platform) {
    case 'web':
      return new VADProcessor(options);
    case 'mobile':
      // 将来実装: MobileVADProcessor
      throw new Error('Mobile VAD not implemented yet');
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export default VADProcessor;
