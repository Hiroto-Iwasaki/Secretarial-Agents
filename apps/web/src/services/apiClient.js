// API通信専用モジュール - 単一責任原則
// 全てのAPI通信を一元管理し、エラーハンドリングと再試行ロジックを提供

import config from '../config/environment.js';

/**
 * APIクライアントクラス
 * 統一されたAPI通信インターフェースを提供
 */
class ApiClient {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
    this.retryAttempts = config.api.retryAttempts;
    this.retryDelay = config.api.retryDelay;
  }

  /**
   * HTTPリクエストの基本実装
   * @param {string} endpoint - APIエンドポイント
   * @param {Object} options - fetch options
   * @param {number} attempt - 現在の試行回数
   * @returns {Promise<Response>}
   */
  async request(endpoint, options = {}, attempt = 1) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // リトライロジック
      if (attempt < this.retryAttempts && this.shouldRetry(error)) {
        if (config.development.enableDebugLogs) {
          console.warn(`API request failed (attempt ${attempt}/${this.retryAttempts}):`, error.message);
        }
        
        await this.delay(this.retryDelay * attempt);
        return this.request(endpoint, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * エラーがリトライ可能かどうかを判定
   * @param {Error} error - エラーオブジェクト
   * @returns {boolean}
   */
  shouldRetry(error) {
    // ネットワークエラーやタイムアウトはリトライ
    return error.name === 'AbortError' || 
           error.message.includes('fetch') ||
           error.message.includes('network');
  }

  /**
   * 指定時間待機
   * @param {number} ms - 待機時間（ミリ秒）
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GETリクエスト
   * @param {string} endpoint - APIエンドポイント
   * @returns {Promise<Object>}
   */
  async get(endpoint) {
    const response = await this.request(endpoint, { method: 'GET' });
    return response.json();
  }

  /**
   * POSTリクエスト
   * @param {string} endpoint - APIエンドポイント
   * @param {Object} data - 送信データ
   * @returns {Promise<Object>}
   */
  async post(endpoint, data) {
    const response = await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * FormDataを使用したPOSTリクエスト（ファイルアップロード用）
   * @param {string} endpoint - APIエンドポイント
   * @param {FormData} formData - フォームデータ
   * @returns {Promise<Object>}
   */
  async postFormData(endpoint, formData) {
    const response = await this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Content-Typeを自動設定させるため空にする
    });
    return response.json();
  }
}

// シングルトンインスタンスを作成・エクスポート
const apiClient = new ApiClient();

/**
 * 各API機能の専用関数群
 * 単一責任原則に基づき、各機能を独立した関数として提供
 */

/**
 * 利用可能なAIモデル一覧を取得
 * @returns {Promise<Object>}
 */
export async function getAvailableAIs() {
  return apiClient.get('/api/available-ais');
}

/**
 * チャットメッセージを送信
 * @param {string} message - メッセージ内容
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>}
 */
export async function sendChatMessage(message, userId) {
  return apiClient.post('/api/chat', { message, userId });
}

/**
 * 音声認識（STT）を実行
 * @param {File} audioFile - 音声ファイル
 * @param {string} userId - ユーザーID
 * @returns {Promise<Object>}
 */
export async function transcribeAudio(audioFile, userId) {
  const formData = new FormData();
  formData.append('audio', audioFile);
  formData.append('userId', userId);
  
  return apiClient.postFormData('/api/stt', formData);
}

/**
 * 音声合成（TTS）を実行
 * @param {string} text - 合成するテキスト
 * @param {string} userId - ユーザーID
 * @param {string} voice - 音声の種類
 * @returns {Promise<Object>}
 */
export async function synthesizeSpeech(text, userId, voice = 'alloy') {
  return apiClient.post('/api/tts', { text, userId, voice });
}

export default apiClient;
