# MODULES

このファイルには、プロジェクト内で使用する各モジュール（機能単位）と、それに対応するファイル名を記載していきます。
単一責任原則（Single Responsibility Principle）に基づき、各モジュールは明確な単一の責任を持ちます。

---

## バックエンドモジュール

| モジュール名 | ファイル名 | 責任 |
|:------------|:-----------|:-----|
| **メインサーバー** | `backend/server.js` | Express サーバー起動・ルーティング管理 |
| **Supabase クライアント** | `backend/supabaseClient.js` | データベース接続・認証管理 |
| **OpenAI クライアント** | `backend/openaiClient.js` | AI API 通信・認証管理 |
| **モデル設定** | `backend/config/models.json` | AI モデル設定データ管理 |

## フロントエンドモジュール

### 🔧 基盤・設定モジュール
| モジュール名 | ファイル名 | 責任 |
|:------------|:-----------|:-----|
| **環境設定管理** | `apps/web/src/config/environment.js` | 環境変数・設定値の一元管理 |
| **API 通信クライアント** | `apps/web/src/services/apiClient.js` | HTTP 通信・エラーハンドリング・リトライ |
| **認証コンテキスト** | `apps/web/src/AuthContext.jsx` | ユーザー認証状態管理 |

### 🎨 UI コンポーネントモジュール
| モジュール名 | ファイル名 | 責任 |
|:------------|:-----------|:-----|
| **メインアプリ** | `apps/web/src/App.jsx` | アプリケーション全体の状態管理・ルーティング |
| **ログイン画面** | `apps/web/src/Login.jsx` | ユーザー認証 UI |
| **チャット画面** | `apps/web/src/Chat.jsx` | テキストチャット UI・メッセージ管理 |
| **設定画面** | `apps/web/src/Settings.jsx` | AI モデル設定 UI |

### 🎤 音声機能モジュール
| モジュール名 | ファイル名 | 責任 |
|:------------|:-----------|:-----|
| **音声録音** | `apps/web/src/VoiceRecorder.jsx` | 音声キャプチャ・STT 処理 |
| **音声合成** | `apps/web/src/TextToSpeech.jsx` | TTS 処理・音声再生 |

### 🎨 スタイリングモジュール
| モジュール名 | ファイル名 | 責任 |
|:------------|:-----------|:-----|
| **メインスタイル** | `apps/web/src/App.css` | アプリケーション全体のスタイル |
| **音声コンポーネントスタイル** | `apps/web/src/VoiceComponents.css` | 音声機能 UI のスタイル |

---

## 🚀 Phase 2 実装予定モジュール

### リアルタイム音声処理モジュール
| モジュール名 | 予定ファイル名 | 責任 |
|:------------|:-----------|:-----|
| **WebSocket 管理** | `apps/web/src/services/websocketClient.js` | リアルタイム通信管理 |
| **音声ストリーミング** | `apps/web/src/services/audioStreamer.js` | 連続音声キャプチャ・送信 |
| **リアルタイム STT** | `apps/web/src/services/realtimeSTT.js` | ストリーミング音声認識 |
| **リアルタイム TTS** | `apps/web/src/services/realtimeTTS.js` | ストリーミング音声合成 |
| **音声アクティビティ検出** | `apps/web/src/services/voiceActivityDetector.js` | VAD・無音検出 |

### バックエンド拡張モジュール
| モジュール名 | 予定ファイル名 | 責任 |
|:------------|:-----------|:-----|
| **WebSocket サーバー** | `backend/websocketServer.js` | リアルタイム通信サーバー |
| **音声ストリーム処理** | `backend/audioStreamProcessor.js` | 音声データ処理・バッファ管理 |

---

## 📋 設計原則

### ✅ 単一責任原則の実現
- 各モジュールは **1つの明確な責任** のみを持つ
- 機能追加時は **新しいモジュールを作成** し、既存モジュールは変更しない
- **依存関係を最小化** し、疎結合な設計を維持

### ✅ 拡張性の確保
- Phase 2 のリアルタイム音声機能に対応可能な設計
- 新しい AI プロバイダー追加時の影響を最小化
- モジュール間のインターフェースを明確に定義

### ✅ 保守性の向上
- 各モジュールの責任範囲が明確
- テスト・デバッグが容易
- コードの可読性・理解しやすさを重視
