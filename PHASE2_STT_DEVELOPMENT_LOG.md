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

---

### 【進捗サマリー・2025-07-21】

- Phase2.5（VADProcessor・AudioStreamTest改良・WebSocketサーバー拡張・プラットフォーム抽象化）は完全に完了。
- 固定3秒チャンクから自然な発話区間ベース処理へ移行し、API呼び出し回数・コスト・認識精度が大幅向上。
- クロスプラットフォーム（Web/Mobile）対応の設計と実装も完了し、今後のモバイル展開準備も整った。
- 音量閾値などパラメータ調整も柔軟に可能。
- 開発ログ・設計ドキュメントも最新化済み。

---

### 【次の選択肢・優先度】

1. **非同期・同期処理パイプライン設計（Phase3）**
   - 非同期（バックグラウンド処理）と同期（ウェイクワード「ジャーニー」検出時の専用対話）を分離するパイプ設計
   - 出力パイプの切替設計・実装
   - ウェイクワード検出アルゴリズムの具体化
2. **VoiceCanvas UIの設計・実装**
   - リアルタイム認識結果やシステム状態を可視化するUIコンポーネント
   - WebSocket出力との連携
3. **モバイルプラットフォーム対応強化**
   - MobileAudioPlatformの本格実装（React Native/Expo）
   - ネイティブAPIに最適化したVAD・録音処理
4. **文脈管理・自動クリーンアップ**
   - VoiceSessionManagerによる5分自動破棄・プライバシー保護
5. **その他：設計原則・品質向上**
   - シンプル・モダン・拡張性・単一責任原則の厳守

---

※優先順位や追加要件は随時見直し。ユーザー要望・実運用フィードバックをもとに最適化していく。

---


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

---

## **Phase2.5+ Journey Room UI統合・デバッグ完了（2025-01-22）**

### **🎯 実装概要**

**目標**: VoiceCanvasを「Journey Room」にリネームし、ウェイクワード学習・検出・幾何学模様表示を統合した完全なUI基盤を構築  
**成果**: 全エラー解消、完全動作確認済み、第三者引き継ぎ可能な状態  
**設計原則**: 単一責任原則・シンプル・モダン・拡張性重視  

### **🚀 実装した機能**

#### **1. Journey Room UI基盤**
**ファイル**: `apps/web/src/journey-room/JourneyRoom.jsx`

**機能**:
- **統合UI管理**: ウェイクワード学習・幾何学模様・音声状態の統合表示
- **動的インポート**: GeometricVisualizer・WakeWordTrainerの遅延読み込み
- **AudioStateManager統合**: リアルタイム音声処理との連携
- **バックエンドAPI連携**: 設定・状態・学習データの同期
- **デバッグ情報表示**: 開発・運用時の状態監視

**技術仕様**:
```javascript
// AudioStateManager初期化（ユーザー・設定情報を渡す）
if (audioStateManagerRef.current && user && settings) {
  await audioStateManagerRef.current.start(settings, user);
}

// API呼び出し（完全URL使用）
const response = await fetch(`http://localhost:3001/api/journey-room/wake-word-status?userId=${user.id}`);
```

#### **2. ウェイクワード学習システム**
**ファイル**: `apps/web/src/journey-room/WakeWordTrainer.jsx`

**機能**:
- **3回録音学習**: Siri方式の「ジャーニー」発声学習
- **プログレスバー**: 録音進捗の視覚的フィードバック
- **音声特徴量抽出**: 録音データの前処理・分析
- **バックエンド送信**: 個別録音データの順次送信
- **状態同期**: UI表示と実際の録音状態の完全一致

**修正内容**:
```javascript
// 修正前: 複数ファイル一括送信（400エラー）
allRecordings.forEach((recording, index) => {
  formData.append(`recording_${index}`, recording.blob);
});
formData.append('user_id', user.id);

// 修正後: 個別送信（正常動作）
for (let i = 0; i < allRecordings.length; i++) {
  const formData = new FormData();
  formData.append('audio', recording.blob, `journey_${i + 1}.webm`);
  formData.append('userId', user.id);
  // 個別API呼び出し
}
```

#### **3. 幾何学模様視覚表現**
**ファイル**: `apps/web/src/journey-room/GeometricVisualizer.jsx`

**機能**:
- **動的設定読み込み**: バックエンドから幾何学模様設定を取得
- **モード別表示**: idle・listening・processing・responding状態の視覚化
- **数式制御**: バックエンド調整可能な数学的パターン生成
- **リアルタイム更新**: AudioStateManagerからの音声データ連携

**設定例**:
```json
{
  "idle": {
    "formula": "sin(t * 2) * cos(t * 3)",
    "color": "#4A90E2",
    "speed": 1.0,
    "amplitude": 0.3
  }
}
```

#### **4. AudioStateManager音声処理基盤**
**ファイル**: `apps/web/src/journey-room/AudioStateManager.js`

**機能**:
- **ウェイクワード検出**: 学習済みモデルとの音声マッチング
- **VAD統合**: Phase2.5のVADProcessorとの連携
- **WebSocket通信**: リアルタイムSTTとの接続
- **状態管理**: idle・listening・processing・respondingモードの制御
- **コールバック処理**: UI更新・幾何学模様制御のイベント配信

**初期化フロー**:
```javascript
// 1. ユーザー・設定情報を受け取る
async start(settings, user) {
  this.settings = settings;
  this.user = user;
  
  // 2. ウェイクワードモデル読み込み
  await this.loadWakeWordModel();
  
  // 3. WebSocket接続
  await this.connectWebSocket();
  
  // 4. 音声ストリーム開始
  await this.startAudioStream();
}
```

### **🛠️ バックエンドAPI実装**

#### **Journey Room専用APIルーター**
**ファイル**: `backend/routes/journeyRoom.js`

**実装エンドポイント**:

1. **ウェイクワード学習状態取得**
   ```
   GET /api/journey-room/wake-word-status?userId={userId}
   ```
   - 学習進捗・完了状態・最終学習日時を返却
   - Supabase `wake_word_training` テーブルとの連携

2. **ウェイクワード学習処理**
   ```
   POST /api/journey-room/train-wake-word
   ```
   - 音声ファイル受信・音声特徴量抽出・データベース保存
   - 個別録音対応（3回の録音を順次処理）

3. **ウェイクワードモデル取得**
   ```
   GET /api/journey-room/wake-word-model?userId={userId}
   ```
   - 学習済みモデルデータの取得
   - 未学習時は適切なメッセージを返却

4. **幾何学模様設定管理**
   ```
   GET/POST /api/journey-room/geometric-config
   ```
   - 数式・色・速度等の動的設定
   - JSON設定ファイルとの連携

#### **Supabaseデータベース統合**
**ファイル**: `backend/sql/wake_word_training.sql`

**テーブル設計**:
```sql
CREATE TABLE wake_word_training (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  audio_features JSONB NOT NULL,
  training_count INTEGER NOT NULL DEFAULT 0,
  is_trained BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**RLSポリシー**:
- ユーザー自身のデータのみアクセス可能
- 認証済みユーザーのみ操作許可

### **🐛 解決したバグ・エラー**

#### **1. API 404エラー**
**原因**: 相対パス使用によりフロントエンドサーバーにアクセス
```javascript
// 問題: /api/journey-room/train-wake-word → http://localhost:5173/api/...
// 解決: http://localhost:3001/api/journey-room/train-wake-word
```

#### **2. API 400 Bad Requestエラー**
**原因**: バックエンドAPIの期待する形式とフロントエンド送信形式の不一致
```javascript
// 問題: 複数ファイル一括送信 + フィールド名不一致
// 解決: 個別送信 + 正確なフィールド名（userId, audio）
```

#### **3. AudioStateManager起動失敗**
**原因**: ユーザー情報未渡し → `this.user.access_token` が undefined
```javascript
// 問題: audioStateManager.start() （パラメータなし）
// 解決: audioStateManager.start(settings, user)
```

#### **4. ウェイクワードモデル読み込みエラー**
**原因**: APIエンドポイント未実装 + 相対パス問題
```javascript
// 問題: 存在しないエンドポイント + HTMLページ受信 → JSON解析エラー
// 解決: バックエンドAPIエンドポイント実装 + 完全URL使用
```

#### **5. CSS・レイアウト競合**
**原因**: `height: 100vh` + `overflow: hidden` による固定レイアウト
```css
/* 問題: スクロール不可 */
.journey-room { height: 100vh; overflow: hidden; }

/* 解決: スクロール可能 */
.journey-room { min-height: 100vh; overflow-y: auto; }
```

### **📊 動作確認結果**

#### **✅ 完全動作確認済み機能**
1. **ウェイクワード学習**: 3回録音 → API送信 → データベース保存
2. **AudioStateManager起動**: ユーザー認証 → モデル読み込み → WebSocket接続
3. **幾何学模様表示**: バックエンド設定読み込み → 動的表示
4. **UI状態同期**: 録音進捗・学習状態・エラー表示の完全一致
5. **API連携**: 全エンドポイント正常動作・エラーハンドリング

#### **🔧 設定・環境要件**
- **バックエンドサーバー**: `http://localhost:3001`
- **フロントエンドサーバー**: `http://localhost:5173`
- **Supabase**: `wake_word_training` テーブル作成済み
- **環境変数**: OpenAI・Gemini APIキー設定済み

### **🎯 第三者引き継ぎポイント**

#### **重要ファイル一覧**
```
# フロントエンド
apps/web/src/journey-room/
├── JourneyRoom.jsx          # メインUI統合
├── WakeWordTrainer.jsx      # ウェイクワード学習
├── GeometricVisualizer.jsx  # 幾何学模様表示
├── AudioStateManager.js    # 音声処理基盤
└── JourneyRoom.css         # スタイル定義

# バックエンド
backend/
├── routes/journeyRoom.js    # API実装
├── sql/wake_word_training.sql # DB設計
└── config/geometric-config.json # 幾何学設定
```

#### **デバッグ手順**
1. **バックエンド起動確認**: `http://localhost:3001/health`
2. **API疎通確認**: Postmanで各エンドポイントテスト
3. **Supabaseテーブル確認**: `wake_word_training` の存在・RLS設定
4. **フロントエンドコンソール**: エラーログ・API呼び出し状況
5. **ネットワークタブ**: API レスポンス内容・ステータスコード

#### **よくある問題・解決方法**
- **404エラー**: 相対パス → 完全URL修正
- **400エラー**: リクエスト形式確認・フィールド名一致
- **認証エラー**: ユーザー情報・access_token確認
- **CSS競合**: インラインスタイル削除・CSSクラス優先
- **状態不整合**: useEffect依存配列・状態更新タイミング確認

### **🚀 次フェーズ（Phase3）への準備**

#### **完了済み基盤**
✅ **Journey Room UI**: 完全統合・動作確認済み  
✅ **ウェイクワード学習**: 3回録音 → API送信 → データベース保存  
✅ **AudioStateManager**: 音声処理・状態管理基盤  
✅ **バックエンドAPI**: 全エンドポイント実装・テスト済み  
✅ **エラー解消**: 全既知バグ修正・安定動作  

#### **Phase3実装予定**
1. **リアルタイムウェイクワード検出**
   - 学習済みモデルとの音声マッチング
   - 「ジャーニー」発声での自動起動
   - 類似度判定アルゴリズム実装

2. **音声アシスタント機能**
   - ウェイクワード検出 → 同期処理モード
   - 音声コマンド認識・実行
   - TTS応答・対話フロー

3. **幾何学模様の高度化**
   - リアルタイム音声データ連動
   - 感情・意図に応じた視覚表現
   - ユーザーカスタマイズ機能

#### **技術的準備状況**
- **VADProcessor**: Phase2.5で実装済み
- **STT多プロバイダー**: OpenAI・Gemini対応済み
- **WebSocket基盤**: リアルタイム通信準備完了
- **UI基盤**: Journey Room統合完了
- **データベース**: ユーザーデータ管理基盤完成

**Phase2.5+の堅実な基盤により、Phase3のリアルタイムウェイクワード検出・音声アシスタント機能の実装準備が完全に整いました。**
