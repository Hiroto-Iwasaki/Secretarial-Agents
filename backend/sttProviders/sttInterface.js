// sttProviders/sttInterface.js
// STTプロバイダー統一インターフェース（単一責任原則・拡張性重視）

/**
 * STTプロバイダー統一インターフェース
 * 全てのSTTプロバイダーはこのインターフェースに従う
 */
class STTProviderInterface {
  /**
   * 音声認識を実行
   * @param {Buffer} audioStream - 音声データ（webm/wav/mp3等）
   * @param {Function} onResult - 認識結果コールバック function(text)
   * @param {Function} onError - エラーコールバック function(error)
   * @param {Object} options - プロバイダー固有オプション
   */
  async transcribe(audioStream, onResult, onError, options = {}) {
    throw new Error('transcribe method must be implemented by STT provider');
  }

  /**
   * プロバイダー名を取得
   * @returns {string} プロバイダー名
   */
  getProviderName() {
    throw new Error('getProviderName method must be implemented by STT provider');
  }

  /**
   * サポートする音声フォーマットを取得
   * @returns {Array<string>} サポートフォーマット一覧
   */
  getSupportedFormats() {
    throw new Error('getSupportedFormats method must be implemented by STT provider');
  }

  /**
   * プロバイダーが利用可能かチェック
   * @returns {boolean} 利用可能かどうか
   */
  isAvailable() {
    throw new Error('isAvailable method must be implemented by STT provider');
  }
}

module.exports = { STTProviderInterface };
