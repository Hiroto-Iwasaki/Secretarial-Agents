// sttProviders/sttFactory.js
// STTプロバイダーファクトリー（統一管理・単一責任原則）

const { OpenAISTTProvider } = require('./openaiSTT');
const { GeminiSTTProvider } = require('./geminiSTT');

class STTFactory {
  constructor() {
    // 利用可能なプロバイダーを登録
    this.providers = new Map();
    this.providers.set('openai', OpenAISTTProvider);
    this.providers.set('gemini', GeminiSTTProvider);
  }

  /**
   * STTプロバイダーを作成
   * @param {string} providerName - プロバイダー名（例: 'openai', 'gemini'）
   * @returns {STTProviderInterface} STTプロバイダーインスタンス
   */
  createProvider(providerName) {
    const ProviderClass = this.providers.get(providerName.toLowerCase());
    
    if (!ProviderClass) {
      throw new Error(`Unknown STT provider: ${providerName}`);
    }

    const provider = new ProviderClass();
    
    if (!provider.isAvailable()) {
      throw new Error(`STT provider ${providerName} is not available (missing API key?)`);
    }

    return provider;
  }

  /**
   * 設定文字列からプロバイダーを作成
   * @param {string} sttModel - 設定文字列（例: 'openai:whisper-1', 'gemini:default'）
   * @returns {Object} { provider, model, options }
   */
  createFromSettings(sttModel) {
    if (!sttModel || typeof sttModel !== 'string') {
      throw new Error('Invalid STT model setting');
    }

    // 設定文字列をパース（例: 'openai:whisper-1' → provider='openai', model='whisper-1'）
    const [providerName, model = 'default'] = sttModel.split(':');
    
    if (!providerName) {
      throw new Error('Provider name is required in STT model setting');
    }

    const provider = this.createProvider(providerName);
    
    return {
      provider,
      model,
      options: {
        model: model === 'default' ? undefined : model
      }
    };
  }

  /**
   * 利用可能なプロバイダー一覧を取得
   * @returns {Array<Object>} プロバイダー情報一覧
   */
  getAvailableProviders() {
    const available = [];
    
    for (const [name, ProviderClass] of this.providers) {
      try {
        const provider = new ProviderClass();
        if (provider.isAvailable()) {
          available.push({
            name,
            displayName: provider.getProviderName(),
            supportedFormats: provider.getSupportedFormats()
          });
        }
      } catch (err) {
        console.warn(`STT Provider ${name} initialization failed:`, err.message);
      }
    }
    
    return available;
  }
}

// シングルトンインスタンス
const sttFactory = new STTFactory();

module.exports = { STTFactory, sttFactory };
