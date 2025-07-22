// AudioStateManager.js
// 音声状態管理・VAD統合・WebSocket通信（単一責任原則）
import { VADProcessor } from '../audio/VADProcessor';
import WakeWordDetector from './WakeWordDetector';

export default class AudioStateManager {
  constructor() {
    // 状態管理
    this.isActive = false;
    this.currentMode = 'idle';
    this.vadProcessor = null;
    this.audioStream = null;
    this.wsConnection = null;
    
    // ウェイクワード検出器
    this.wakeWordDetector = new WakeWordDetector();
    
    // コールバック
    this.onWakeWordDetected = null;
    this.onAudioDataUpdate = null;
    this.onModeChange = null;
    
    // 設定
    this.settings = null;
    this.user = null;
    
    // 音声データ
    this.currentAudioData = {
      volume: 0,
      frequency: 0,
      waveform: []
    };
    
    // WebSocket接続状態
    this.wsConnected = false;
    this.sttReady = false;
  }

  // 初期化・開始
  async start(settings, user) {
    this.settings = settings;
    this.user = user;
    
    try {
      // ウェイクワード検出器初期化
      this.wakeWordDetector.onWakeWordDetected = this.handleWakeWordDetection.bind(this);
      await this.wakeWordDetector.initialize(user);
      
      // WebSocket接続
      await this.connectWebSocket();
      
      // 音声ストリーム開始
      await this.startAudioStream();
      
      // VAD開始
      this.startVAD();
      
      this.isActive = true;
      this.setMode('listening');
      
      console.log('[AudioStateManager] 起動完了');
      
    } catch (error) {
      console.error('[AudioStateManager] 起動失敗:', error);
      throw error;
    }
  }

  // 停止
  stop() {
    this.isActive = false;
    
    // ウェイクワード検出器停止
    if (this.wakeWordDetector) {
      this.wakeWordDetector.stop();
    }
    
    // VAD停止
    if (this.vadProcessor) {
      this.vadProcessor.stop();
      this.vadProcessor = null;
    }
    
    // 音声ストリーム停止
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    // WebSocket切断
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    
    this.setMode('idle');
    console.log('[AudioStateManager] 停止完了');
  }



  // WebSocket接続
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('ws://localhost:3001');
      ws.binaryType = 'arraybuffer';
      
      ws.onopen = () => {
        this.wsConnected = true;
        console.log('[AudioStateManager] WebSocket接続成功');
        
        // STTモード開始
        ws.send(JSON.stringify({
          type: 'stt_start',
          stt_model: this.settings.stt_model
        }));
      };
      
      ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
      
      ws.onclose = () => {
        this.wsConnected = false;
        this.sttReady = false;
        console.log('[AudioStateManager] WebSocket切断');
      };
      
      ws.onerror = (error) => {
        console.error('[AudioStateManager] WebSocketエラー:', error);
        reject(error);
      };
      
      this.wsConnection = ws;
      
      // 接続完了を待つ
      const checkConnection = () => {
        if (this.wsConnected && this.sttReady) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      setTimeout(checkConnection, 100);
    });
  }

  // WebSocketメッセージ処理
  handleWebSocketMessage(event) {
    if (typeof event.data === 'string') {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'stt_ack':
            this.sttReady = true;
            console.log('[AudioStateManager] STT準備完了');
            break;
            
          case 'stt_result':
            this.handleSTTResult(message.text);
            break;
            
          case 'error':
            console.error('[AudioStateManager] STTエラー:', message.message);
            break;
        }
      } catch (error) {
        console.error('[AudioStateManager] メッセージパースエラー:', error);
      }
    }
  }

  // STT結果処理
  handleSTTResult(text) {
    console.log('[AudioStateManager] STT結果:', text);
    
    // ウェイクワード検出（WakeWordDetectorクラス使用）
    const isWakeWord = this.wakeWordDetector.checkWakeWordFromText(text);
    
    if (!isWakeWord) {
      // 非同期音声処理
      this.processAsyncSpeech(text);
    }
    // ウェイクワード検出時の処理はWakeWordDetectorクラス内で実行
  }

  // ウェイクワード検出時の処理（WakeWordDetectorからのコールバック）
  handleWakeWordDetection() {
    console.log('[AudioStateManager] ウェイクワード検出 - 同期モード起動');
    
    this.setMode('thinking');
    
    // コールバック実行
    if (this.onWakeWordDetected) {
      this.onWakeWordDetected();
    }
    
    // 同期処理パイプ起動（将来実装）
    setTimeout(() => {
      this.setMode('responding');
      
      // デモ応答
      setTimeout(() => {
        this.setMode('listening');
      }, 3000);
    }, 1000);
  }

  // 音声ストリーム開始
  async startAudioStream() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      console.log('[AudioStateManager] 音声ストリーム開始');
      
    } catch (error) {
      console.error('[AudioStateManager] 音声ストリーム開始エラー:', error);
      throw error;
    }
  }

  // VAD開始
  startVAD() {
    if (!this.audioStream) return;
    
    this.vadProcessor = new VADProcessor({
      volumeThreshold: 0.08,
      speechStartDelay: 150,
      speechEndDelay: 1000,
      minSpeechDuration: 800,
      maxSpeechDuration: 30000,
      debug: false
    });
    
    // VADイベントハンドラー
    this.vadProcessor.onSpeechStart = () => {
      console.log('[AudioStateManager] 発話開始検出');
      this.startSpeechRecording();
    };
    
    this.vadProcessor.onSpeechEnd = (duration) => {
      console.log('[AudioStateManager] 発話終了検出:', duration + 'ms');
      this.stopSpeechRecording();
    };
    
    this.vadProcessor.onVolumeChange = (volume) => {
      this.updateAudioData({ volume });
    };
    
    // VAD開始
    this.vadProcessor.start(this.audioStream);
  }

  // 発話録音開始
  startSpeechRecording() {
    if (!this.wsConnected || !this.sttReady) return;
    
    try {
      const mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        this.sendAudioToSTT(audioBlob);
      };
      
      mediaRecorder.start();
      this.currentMediaRecorder = mediaRecorder;
      
    } catch (error) {
      console.error('[AudioStateManager] 録音開始エラー:', error);
    }
  }

  // 発話録音停止
  stopSpeechRecording() {
    if (this.currentMediaRecorder && this.currentMediaRecorder.state === 'recording') {
      this.currentMediaRecorder.stop();
      this.currentMediaRecorder = null;
    }
  }

  // 音声データをSTTに送信
  sendAudioToSTT(audioBlob) {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) return;
    
    audioBlob.arrayBuffer().then(buffer => {
      console.log('[AudioStateManager] 音声データ送信:', buffer.byteLength, 'bytes');
      this.wsConnection.send(buffer);
    });
  }

  // 非同期音声処理（将来実装）
  processAsyncSpeech(text) {
    // ツール呼び出し検出
    // バックグラウンド処理
    // キャンバス更新
    console.log('[AudioStateManager] 非同期処理:', text);
  }

  // モード変更
  setMode(newMode) {
    if (this.currentMode !== newMode) {
      console.log('[AudioStateManager] モード変更:', this.currentMode, '->', newMode);
      this.currentMode = newMode;
      
      if (this.onModeChange) {
        this.onModeChange(newMode);
      }
    }
  }

  // 音声データ更新
  updateAudioData(newData) {
    this.currentAudioData = { ...this.currentAudioData, ...newData };
    
    if (this.onAudioDataUpdate) {
      this.onAudioDataUpdate(this.currentAudioData);
    }
  }

  // 現在の状態取得
  getState() {
    return {
      isActive: this.isActive,
      currentMode: this.currentMode,
      wsConnected: this.wsConnected,
      sttReady: this.sttReady,
      audioData: this.currentAudioData,
      wakeWordDetector: this.wakeWordDetector.getState()
    };
  }
}
