// AudioPlatformAdapter.js
// プラットフォーム抽象化レイヤー - Web/Mobile対応
// 単一責任原則: プラットフォーム差異の吸収のみに特化

import { VADProcessor } from './VADProcessor';

/**
 * プラットフォーム抽象化インターフェース
 * 各プラットフォームで実装すべき統一API
 */
export class AudioPlatformInterface {
  /**
   * 音声ストリーム取得
   * @param {Object} constraints - 音声制約
   * @returns {Promise<MediaStream>}
   */
  async getAudioStream(constraints = {}) {
    throw new Error('getAudioStream must be implemented');
  }

  /**
   * VADプロセッサー作成
   * @param {Object} options - VAD設定
   * @returns {Object} VADプロセッサー
   */
  createVADProcessor(options = {}) {
    throw new Error('createVADProcessor must be implemented');
  }

  /**
   * MediaRecorder作成
   * @param {MediaStream} stream - 音声ストリーム
   * @param {Object} options - 録音設定
   * @returns {Object} MediaRecorder
   */
  createMediaRecorder(stream, options = {}) {
    throw new Error('createMediaRecorder must be implemented');
  }

  /**
   * プラットフォーム情報取得
   * @returns {Object} プラットフォーム情報
   */
  getPlatformInfo() {
    throw new Error('getPlatformInfo must be implemented');
  }

  /**
   * 権限チェック・要求
   * @returns {Promise<boolean>} 権限状態
   */
  async checkPermissions() {
    throw new Error('checkPermissions must be implemented');
  }
}

/**
 * Web プラットフォーム実装
 */
export class WebAudioPlatform extends AudioPlatformInterface {
  constructor() {
    super();
    this.platformName = 'web';
  }

  async getAudioStream(constraints = {}) {
    const defaultConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
        ...constraints.audio
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(defaultConstraints);
      console.log('[WebAudioPlatform] 音声ストリーム取得成功');
      return stream;
    } catch (error) {
      console.error('[WebAudioPlatform] 音声ストリーム取得失敗:', error);
      throw new Error(`マイクアクセス失敗: ${error.message}`);
    }
  }

  createVADProcessor(options = {}) {
    const defaultOptions = {
      volumeThreshold: 0.01,
      speechStartDelay: 150,
      speechEndDelay: 1000,
      minSpeechDuration: 800,
      maxSpeechDuration: 30000,
      debug: false,
      ...options
    };

    return new VADProcessor(defaultOptions);
  }

  createMediaRecorder(stream, options = {}) {
    const defaultOptions = {
      mimeType: 'audio/webm',
      ...options
    };

    try {
      const mediaRecorder = new MediaRecorder(stream, defaultOptions);
      console.log('[WebAudioPlatform] MediaRecorder作成成功');
      return mediaRecorder;
    } catch (error) {
      console.error('[WebAudioPlatform] MediaRecorder作成失敗:', error);
      throw new Error(`MediaRecorder作成失敗: ${error.message}`);
    }
  }

  getPlatformInfo() {
    return {
      platform: this.platformName,
      userAgent: navigator.userAgent,
      mediaDevices: !!navigator.mediaDevices,
      webAudio: !!(window.AudioContext || window.webkitAudioContext),
      mediaRecorder: !!window.MediaRecorder,
      webSocket: !!window.WebSocket,
      supportedMimeTypes: this.getSupportedMimeTypes()
    };
  }

  getSupportedMimeTypes() {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  async checkPermissions() {
    try {
      if (!navigator.permissions) {
        console.warn('[WebAudioPlatform] Permissions API未対応');
        return true; // フォールバック
      }

      const result = await navigator.permissions.query({ name: 'microphone' });
      console.log('[WebAudioPlatform] マイク権限状態:', result.state);
      
      return result.state === 'granted' || result.state === 'prompt';
    } catch (error) {
      console.warn('[WebAudioPlatform] 権限チェック失敗:', error);
      return true; // フォールバック
    }
  }
}

/**
 * Mobile プラットフォーム実装（将来実装）
 * React Native環境での音声処理
 */
export class MobileAudioPlatform extends AudioPlatformInterface {
  constructor() {
    super();
    this.platformName = 'mobile';
  }

  async getAudioStream(constraints = {}) {
    // 将来実装: React Native Audio Recorder
    throw new Error('Mobile audio stream not implemented yet');
  }

  createVADProcessor(options = {}) {
    // 将来実装: Native VAD or JS fallback
    throw new Error('Mobile VAD processor not implemented yet');
  }

  createMediaRecorder(stream, options = {}) {
    // 将来実装: React Native Audio Recorder
    throw new Error('Mobile media recorder not implemented yet');
  }

  getPlatformInfo() {
    return {
      platform: this.platformName,
      // 将来実装: React Native device info
      implementation: 'placeholder'
    };
  }

  async checkPermissions() {
    // 将来実装: React Native permissions
    throw new Error('Mobile permissions check not implemented yet');
  }
}

/**
 * プラットフォーム自動検出・ファクトリー
 */
export class AudioPlatformFactory {
  static detectPlatform() {
    // React Native環境検出
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return 'mobile';
    }
    
    // Web環境検出
    if (typeof window !== 'undefined' && window.navigator) {
      return 'web';
    }
    
    // Node.js環境（テスト等）
    return 'node';
  }

  static create(platform = null) {
    const detectedPlatform = platform || this.detectPlatform();
    
    switch (detectedPlatform) {
      case 'web':
        return new WebAudioPlatform();
      case 'mobile':
        return new MobileAudioPlatform();
      default:
        throw new Error(`Unsupported platform: ${detectedPlatform}`);
    }
  }
}

/**
 * 統合音声処理マネージャー
 * プラットフォーム抽象化を活用した高レベルAPI
 */
export class UnifiedAudioManager {
  constructor(platform = null) {
    this.platform = AudioPlatformFactory.create(platform);
    this.vadProcessor = null;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.isActive = false;
    
    // イベントハンドラー
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onVolumeChange = null;
    this.onError = null;
  }

  /**
   * 音声処理開始
   */
  async start(vadOptions = {}, streamConstraints = {}) {
    if (this.isActive) {
      throw new Error('Audio manager already active');
    }

    try {
      // 権限チェック
      const hasPermission = await this.platform.checkPermissions();
      if (!hasPermission) {
        throw new Error('マイク権限が必要です');
      }

      // 音声ストリーム取得
      this.audioStream = await this.platform.getAudioStream(streamConstraints);
      
      // VADプロセッサー作成・設定
      this.vadProcessor = this.platform.createVADProcessor(vadOptions);
      this.vadProcessor.onSpeechStart = () => {
        if (this.onSpeechStart) this.onSpeechStart();
      };
      this.vadProcessor.onSpeechEnd = (duration) => {
        if (this.onSpeechEnd) this.onSpeechEnd(duration);
      };
      this.vadProcessor.onVolumeChange = (volume) => {
        if (this.onVolumeChange) this.onVolumeChange(volume);
      };

      // VAD開始
      await this.vadProcessor.start(this.audioStream);
      
      this.isActive = true;
      console.log('[UnifiedAudioManager] 音声処理開始成功');
      
    } catch (error) {
      console.error('[UnifiedAudioManager] 開始失敗:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * 音声録音開始
   */
  startRecording(options = {}) {
    if (!this.isActive || !this.audioStream) {
      throw new Error('Audio manager not active');
    }

    try {
      this.mediaRecorder = this.platform.createMediaRecorder(this.audioStream, options);
      return this.mediaRecorder;
    } catch (error) {
      console.error('[UnifiedAudioManager] 録音開始失敗:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }

  /**
   * 音声処理停止
   */
  stop() {
    if (!this.isActive) return;

    try {
      // VAD停止
      if (this.vadProcessor) {
        this.vadProcessor.stop();
        this.vadProcessor = null;
      }

      // 録音停止
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;

      // 音声ストリーム停止
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }

      this.isActive = false;
      console.log('[UnifiedAudioManager] 音声処理停止完了');
      
    } catch (error) {
      console.error('[UnifiedAudioManager] 停止エラー:', error);
      if (this.onError) this.onError(error);
    }
  }

  /**
   * 現在の状態取得
   */
  getState() {
    return {
      isActive: this.isActive,
      platform: this.platform.getPlatformInfo(),
      vadState: this.vadProcessor ? this.vadProcessor.getState() : null
    };
  }
}

export default {
  AudioPlatformInterface,
  WebAudioPlatform,
  MobileAudioPlatform,
  AudioPlatformFactory,
  UnifiedAudioManager
};
