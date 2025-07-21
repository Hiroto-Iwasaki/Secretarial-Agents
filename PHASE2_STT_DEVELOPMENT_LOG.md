# Phase2-2.5 STT多プロバイダー・VAD対応開発ログ

## 🎯 プロジェクト概要

**目標**: 「ジャーニー」ウェイクワードで起動する常時オン・リアルタイム音声アシスタント基盤の構築  
**現在フェーズ**: Phase2.5完了 - VAD対応発話区間ベース音声認識基盤の完成  
**設計原則**: シンプル・モダン・拡張性・単一責任原則・可読性重視  
**開発指向**: 段階的実装・クロスプラットフォーム対応・世界最高品質  

---

## 📋 開発経緯・実装内容

### **Phase2開始時の状況**
- WebSocket経由リアルタイムSTTの基本PoC完成
- OpenAI Whisper-1との連携動作確認済み
- 3秒録音チャンク方式でWebSocketストリーミングの技術的課題を解決
- AudioStreamTest.jsxで継続的音声認識が動作

### **Phase2完了時の課題認識**
- OpenAI Whisper-1のみの単一プロバイダー依存
- 拡張性・選択肢の不足
- 将来的な多プロバイダー対応の必要性

### **Phase2.5での新たな課題認識**
- 固定3秒チャンクによる発話途中切断問題
- 無音時の不要なAPI呼び出し（1日2万回のコスト問題）
- 自然な発話区間での処理の必要性
- クロスプラットフォーム（Web/Mobile）対応の準備

---

## 🚀 実装した機能

## **Phase2: STT多プロバイダー基盤**

### **1. STT多プロバイダー抽象化基盤**

#### **統一インターフェース設計**
**ファイル**: `backend/sttProviders/sttInterface.js`

```javascript
class STTProviderInterface {
  async transcribe(audioStream, onResult, onError, options = {}) {
    // 音声認識実行
  }
  getProviderName() {
    // プロバイダー名取得
  }
  getSupportedFormats() {
    // サポート形式一覧
  }
  isAvailable() {
    // 利用可能性チェック
  }
}
```

**設計思想**: 全STTプロバイダーが従うべき統一API、単一責任原則の徹底

#### **STTファクトリー（プロバイダー管理）**
**ファイル**: `backend/sttProviders/sttFactory.js`

**機能**:
- プロバイダー動的選択（`openai:whisper-1`, `gemini:gemini-2.5-flash`）
- 設定文字列の自動パース
- 利用可能プロバイダー一覧取得
- エラーハンドリング

**使用例**:
```javascript
const { provider, model, options } = sttFactory.createFromSettings('openai:whisper-1');
provider.transcribe(audioStream, onResult, onError, options);
```

### **2. OpenAI STTプロバイダー**
**ファイル**: `backend/sttProviders/openaiSTT.js`

**機能**:
- 既存のopenaiRealtimeSTT.jsを統一インターフェースに準拠
- WebM→WAV変換（ffmpeg使用）
- OpenAI Whisper-1 API連携
- エラーハンドリング・フォールバック処理

**技術仕様**:
- サポート形式: webm, wav, mp3, m4a, flac, ogg
- 音声変換: 16kHz, mono, PCM
- API: OpenAI Whisper-1

### **3. Gemini STTプロバイダー**
**ファイル**: `backend/sttProviders/geminiSTT.js`

**機能**:
- Google AI Studio API（Gemini 2.5 Flash / 2.0 Flash）連携
- GoogleAIFileManager使用
- WebM→WAV変換後アップロード
- 日本語音声認識対応

**技術仕様**:
- 依存パッケージ: `@google/generative-ai`
- サポートモデル: gemini-2.5-flash, gemini-2.0-flash
- 音声形式: WebM → WAV変換
- プロンプト: "Generate a transcript of the speech in Japanese."

**実装詳細**:
```javascript
// GoogleAIFileManagerを使用したファイルアップロード
const uploadResult = await this.fileManager.uploadFile(tmpWav, {
  mimeType: 'audio/wav',
});

// 動的モデル選択
const modelName = options.model || 'gemini-2.5-flash';
const model = this.genAI.getGenerativeModel({ model: modelName });
```

### **4. WebSocketサーバー統合**
**ファイル**: `backend/websocketServer.js`

**修正内容**:
- 古い`openaiRealtimeSTT`インポートをSTTファクトリーに置換
- プロバイダー選択ロジックの統合
- 任意の`provider:model`形式対応
- 適切な`stt_ack`メッセージ送信

**修正前の問題**:
```javascript
// 古い固定条件
if (sttMode === 'openai:realtime-stt') {
  // 存在しないモデルをチェック
}
```

**修正後**:
```javascript
// 新しい動的プロバイダー選択
const { provider, model, options } = sttFactory.createFromSettings(sttMode);
provider.transcribe(audioStream, onResult, onError, options);
```

### **5. 設定ファイル拡張**
**ファイル**: `backend/config/models.json`

**追加内容**:
```json
{
  "gemini": {
    "default": "gemini-2.5-flash",
    "candidates": [
      { "name": "gemini-2.5-flash", "tags": ["stt"] },
      { "name": "gemini-2.0-flash", "tags": ["stt"] },
      { "name": "gemini-pro", "tags": ["dialog", "research"] }
    ]
  }
}
```

**設計方針**: Azure関連は除外、OpenAI・Gemini・Googleに集中

---

## 🔧 技術的解決事項

### **問題1: WebSocketサーバーのSTT開始ロジック**
**症状**: `stt_ack`が送信されず、フロントエンドが次に進めない  
**原因**: 古い`openai:realtime-stt`形式の条件分岐  
**解決**: STTファクトリーによる動的プロバイダー検証・適切なACK送信  

### **問題2: Gemini API連携エラー**
**症状**: `this.genAI.uploadFile is not a function`  
**原因**: `GoogleAIFileManager`の不適切なインポート  
**解決**: `@google/generative-ai/server`から正しくインポート  

### **問題3: 後方互換性の複雑化**
**ユーザー方針**: 後方互換性禁止、クリーンな設計優先  
**対応**: 自動変換ロジックを削除、純粋な`provider:model`形式のみサポート  

---

## 📊 動作確認結果

### **OpenAI STTプロバイダー**
✅ **正常動作確認済み**  
- 設定: `openai:whisper-1`
- WebM→WAV変換: 成功
- 音声認識: 日本語認識正常
- エラーハンドリング: 適切

### **Gemini STTプロバイダー**
✅ **正常動作確認済み**  
- 設定: `gemini:gemini-2.0-flash`, `gemini:gemini-2.5-flash`
- ファイルアップロード: 成功
- 音声認識: 日本語認識正常
- モデル切替: 動的選択機能

### **プロバイダー切替**
✅ **設定画面からの動的切替確認済み**  
- OpenAI ⇔ Gemini間の切替
- WebSocketサーバーでの適切な処理分岐
- エラーハンドリング

---

## 🏗️ アーキテクチャ設計

### **ディレクトリ構造**
```
backend/
├── sttProviders/
│   ├── sttInterface.js      # 統一インターフェース
│   ├── openaiSTT.js        # OpenAI Whisper-1プロバイダー
│   ├── geminiSTT.js        # Gemini STTプロバイダー
│   └── sttFactory.js       # プロバイダー管理・選択
├── websocketServer.js       # WebSocket統合
└── config/models.json       # モデル設定
```

### **データフロー**
```
AudioStreamTest.jsx
  ↓ WebSocket
websocketServer.js
  ↓ STTFactory
sttProviders/[provider].js
  ↓ API呼び出し
OpenAI/Gemini API
  ↓ 認識結果
フロントエンド表示
```

---

## 🎯 次期開発方針

### **Phase 2.5: 文脈理解・キャンバスシステム**

#### **新しいアーキテクチャ設計**
**コンセプト**: 常時STT録音 + 非同期処理 + キャンバス出力

**利用フロー**:
```
👤 ユーザー: "今日の天気なんだっけ"
🎤 [3秒音声] → STT → "今日の天気なんだっけ"
🧠 文脈蓄積: ["今日の天気を知りたい"]
⚡ 非同期処理開始 → 天気API呼び出し
👤 ユーザー: "明日の予定何かあったっけな"
🎤 [3秒音声] → STT → "明日の予定なんだ？"  
🧠 文脈更新: ["今日の天気を教えて", "それと明日の予定も"]
⚡ 非同期処理: 天気 + カレンダーAPI並行実行
📋 キャンバスに天気と予定表示
```

#### **キーポイント**:
- **音声出力不要**: 全て「キャンバス」UIに表示
- **常時録音**: STTで継続的に音声認識
- **非同期処理**: 複数API並行実行
- **文脈蓄積**: 分割音声から意図抽出

#### **実装予定コンポーネント**:
1. **VoiceCanvas UI** - 情報集約表示画面
2. **ContinuousVoiceProcessor** - 常時文脈管理
3. **IntentProcessor** - 自然言語→API呼び出し
4. **CanvasManager** - WebSocket経由リアルタイム更新

### **Phase 3: VAD・ウェイクワード検出**
- **「ジャーニー」ウェイクワード** → 同期処理モード
- **Voice Activity Detection** → 自然な発話区間検出
- **処理モード切替** → 非同期⇔同期の適切な制御

---

## 🛠️ 開発環境・依存関係

### **バックエンド依存パッケージ**
```json
{
  "openai": "^4.x.x",
  "@google/generative-ai": "^0.x.x",
  "ws": "^8.x.x"
}
```

### **環境変数**
```bash
# backend/.env
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIzaSy...
```

### **外部ツール**
- **ffmpeg**: 音声形式変換（WebM→WAV）
- **Node.js**: v18+推奨

---

## 📝 開発ベストプラクティス

### **設計原則の実践**
1. **シンプル**: 統一インターフェースで複雑さを隠蔽
2. **モダン**: 最新API・SDK使用
3. **拡張性**: 新プロバイダー追加が容易
4. **単一責任**: 各プロバイダーが独立
5. **可読性**: クリーンなコード構造

### **エラーハンドリング**
- 各段階での適切なtry-catch
- ユーザーフレンドリーなエラーメッセージ
- フォールバック処理（ffmpeg失敗時等）

### **テスト方法**
1. 設定画面でプロバイダー選択
2. AudioStreamTestで音声認識テスト
3. WebSocketログでデバッグ確認
4. 複数プロバイダー間の切替テスト

---

## 🎉 達成した成果

### **技術的成果**
✅ **STT多プロバイダー基盤** - 完全実装・動作確認済み  
✅ **統一インターフェース** - 拡張性・保守性向上  
✅ **OpenAI・Gemini両対応** - 選択肢の多様化  
✅ **WebSocket統合** - リアルタイム切替機能  
✅ **設定画面連携** - ユーザーフレンドリーな操作  

### **設計品質**
✅ **単一責任原則** - 各コンポーネントが独立  
✅ **拡張性** - 新プロバイダー追加が容易  
✅ **エラーハンドリング** - 堅牢な例外処理  
✅ **ドキュメント化** - 第三者引継ぎ可能  

---

## 🚀 次のアクションアイテム

### **即座に着手可能**
1. **VoiceCanvas UI実装** - 基本的な情報表示画面
2. **文脈蓄積システム** - STT結果の継続管理
3. **簡単な意図解析** - 天気・予定などの基本機能

### **中期目標**
1. **非同期API処理基盤** - 複数サービス並行実行
2. **キャンバス管理システム** - WebSocket経由更新
3. **ウェイクワード検出準備** - VAD基盤設計

### **長期ビジョン**
1. **「ジャーニー」ウェイクワード** - 同期処理モード
2. **完全な音声アシスタント** - 自然な対話フロー
3. **世界最高のプロダクト** - 実用性・拡張性の両立

---

## 📞 引継ぎ情報

### **重要ファイル**
- `backend/sttProviders/` - STT多プロバイダー基盤
- `backend/websocketServer.js` - WebSocket統合
- `backend/config/models.json` - モデル設定
- `apps/web/src/AudioStreamTest.jsx` - フロントエンドテスト

### **テスト手順**
1. 環境変数設定（OpenAI・Gemini APIキー）
2. バックエンドサーバー起動
3. フロントエンド起動
4. AudioStreamTestでプロバイダー切替テスト

### **デバッグポイント**
- WebSocketサーバーログ確認
- STTファクトリーのプロバイダー選択
- 音声ファイル変換（ffmpeg）
- API呼び出し結果

---

## **Phase2.5: VAD対応発話区間ベース音声処理**

### **🎯 Phase2.5の目標**
- 固定3秒チャンクから自然な発話区間ベース処理への移行
- Voice Activity Detection (VAD) による効率的な音声処理
- クロスプラットフォーム対応設計（Web/Mobile統一）
- API呼び出し削減とコスト最適化

### **🔧 新規実装コンポーネント**

#### **1. VADProcessor - 音量ベース発話区間検出**
**ファイル**: `apps/web/src/audio/VADProcessor.js`

**機能**:
- **音量ベースVAD**: Web Audio APIを活用したリアルタイム音量分析
- **調整可能パラメータ**: 音量閾値、発話開始/終了遅延、最小/最大発話時間
- **イベント駆動**: 発話開始/終了の自動検出とコールバック
- **デバッグ機能**: 詳細ログ出力とリアルタイム状態監視

**技術仕様**:
```javascript
class VADProcessor {
  constructor(options = {
    volumeThreshold: 0.08,      // 音量閾値（0-1）
    speechStartDelay: 150,      // 発話開始判定時間（ms）
    speechEndDelay: 1000,       // 発話終了判定時間（ms）
    minSpeechDuration: 800,     // 最小発話時間（ms）
    maxSpeechDuration: 30000,   // 最大発話時間（ms）
    debug: true                 // デバッグモード
  })
}
```

**設計思想**: 単一責任原則（VAD検出のみ）、モダン技術活用、拡張性重視

#### **2. AudioStreamTest改良 - VAD制御対応**
**ファイル**: `apps/web/src/AudioStreamTest.jsx`

**改良内容**:
- **固定タイマー廃止**: 3秒固定 → VAD制御による自然な発話区間
- **リアルタイム状態表示**: 音量レベル、発話状態の可視化
- **発話区間ベース送信**: 完全な発話のみをWebSocketで送信
- **ユーザビリティ向上**: 視覚的フィードバックと直感的操作

**技術的改善**:
```javascript
// 旧: 固定3秒タイマー
setTimeout(() => mediaRecorder.stop(), 3000);

// 新: VAD制御
vadProcessor.onSpeechStart = () => startSpeechRecording();
vadProcessor.onSpeechEnd = () => stopSpeechRecording();
```

#### **3. WebSocketサーバー拡張 - 発話区間ベース処理**
**ファイル**: `backend/websocketServer.js`

**拡張内容**:
- **即座処理**: VADで区切られた完全な発話を即座にSTT処理
- **バッファ管理**: 発話区間ごとの効率的なデータ管理
- **詳細ログ**: セグメントサイズ、タイムスタンプ付きレスポンス
- **エラーハンドリング**: 堅牢な例外処理とクリーンアップ

**処理フロー**:
```javascript
// 発話区間データ受信 → 即座にSTT処理
speechSegmentBuffer.push(Buffer.from(data));
const speechSegment = Buffer.concat(speechSegmentBuffer);
provider.transcribe(speechSegment, onResult, onError, options);
```

#### **4. プラットフォーム抽象化 - Web/Mobile対応設計**
**ファイル**: `apps/web/src/audio/AudioPlatformAdapter.js`

**機能**:
- **統一インターフェース**: 全プラットフォーム共通API
- **WebAudioPlatform**: 現在のWeb環境完全対応
- **MobileAudioPlatform**: 将来のReact Native対応準備
- **UnifiedAudioManager**: 高レベル統合API

**設計パターン**:
```javascript
// プラットフォーム自動検出
const platform = AudioPlatformFactory.create();

// 統一API使用
const audioManager = new UnifiedAudioManager();
await audioManager.start(vadOptions, streamConstraints);
```

### **📊 Phase2.5の成果**

#### **効率化**
✅ **API呼び出し削減**: 無音時は送信停止（1日2万回 → 実際の発話回数のみ）  
✅ **自然な区切り**: 発話途中で切断されない完全な音声認識  
✅ **リアルタイム処理**: 発話終了と同時にSTT開始  

#### **拡張性**
✅ **クロスプラットフォーム**: Web/Mobile統一設計  
✅ **パラメータ調整**: 環境に応じたVAD最適化  
✅ **プロバイダー対応**: 既存STT多プロバイダー基盤活用  

#### **ユーザビリティ**
✅ **視覚的フィードバック**: 音量レベル、発話状態表示  
✅ **自然な操作**: 話すだけで自動録音・認識  
✅ **エラーハンドリング**: 堅牢な例外処理  

### **🔄 開発プロセス・指向**

#### **段階的実装アプローチ**
1. **既存コード調査** → 現状把握と最適統合ポイント特定
2. **VADProcessor作成** → 音量ベース + 調整可能パラメータ
3. **AudioStreamTest改良** → 固定タイマー → VAD制御
4. **WebSocketサーバー拡張** → 発話区間ベース処理
5. **プラットフォーム抽象化** → Web/Mobile対応インターフェース

#### **設計原則の実践**
- **シンプル**: 統一インターフェースで複雑さを隠蔽
- **モダン**: Web Audio API、最新JavaScript機能活用
- **拡張性**: 新プラットフォーム・プロバイダー追加が容易
- **単一責任**: 各コンポーネントが独立した明確な責任
- **可読性**: クリーンなコード構造とドキュメント化

#### **世界最高品質への取り組み**
- **ユーザー中心設計**: 実際の使用感を重視した調整（音量閾値0.08等）
- **パフォーマンス最適化**: 不要な処理削減とリソース効率化
- **堅牢性**: 包括的なエラーハンドリングとフォールバック
- **将来性**: モバイル展開を見据えた設計

---

## 🚀 次のアクションアイテム（Phase3準備）

### **即座に着手可能**
1. **非同期処理パイプ実装** - バックグラウンドでのツール呼び出し検出
2. **同期処理パイプ実装** - ウェイクワード「ジャーニー」検出準備
3. **VoiceCanvas UI設計** - 情報集約表示システム

### **中期目標（Phase3）**
1. **ウェイクワード検出** - 「ジャーニー」による同期モード起動
2. **出力パイプ分離** - 非同期・同期処理の適切な制御
3. **キャンバス管理システム** - WebSocket経由リアルタイム更新

### **長期ビジョン（Phase4）**
1. **完全な音声アシスタント** - 常時オン・自然な対話フロー
2. **モバイルアプリ展開** - React Native実装
3. **世界最高のプロダクト** - 実用性・拡張性・品質の完全な両立

**Phase2.5の堅実な基盤を活用して、Phase3のウェイクワード検出・出力パイプ分離システム実装に進むことを推奨します。**
