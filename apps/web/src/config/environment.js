// 環境設定専用モジュール - 単一責任原則
// 全ての環境変数を一元管理し、型安全性とデフォルト値を提供

/**
 * 環境変数の設定値を管理
 * 本番・開発・ステージング環境の切り替えに対応
 */
const config = {
  // API設定
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY) || 1000,
  },

  // 開発設定
  development: {
    enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || import.meta.env.DEV,
    enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
  },

  // アプリケーション設定
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Secretarial Agents',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
  }
};

/**
 * 環境設定の検証
 * 必要な環境変数が設定されているかチェック
 */
function validateConfig() {
  const requiredVars = [];
  const missingVars = [];

  // 本番環境では必須の環境変数をチェック
  if (config.app.environment === 'production') {
    requiredVars.push('VITE_API_BASE_URL');
  }

  requiredVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    if (config.app.environment === 'production') {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  if (config.development.enableDebugLogs) {
    console.log('Environment configuration:', {
      environment: config.app.environment,
      apiBaseUrl: config.api.baseUrl,
      debugMode: config.development.enableDebugLogs
    });
  }
}

// 初期化時に設定を検証
validateConfig();

export default config;
export { validateConfig };
