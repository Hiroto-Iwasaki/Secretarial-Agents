# Phase3 リアルタイム音声アシスタント実装計画

## 🎯 プロジェクト概要

**目標**: 「ジャーニー」ウェイクワードで起動する常時オン・リアルタイム音声アシスタントの完全実装  
**フェーズ**: Phase3 - リアルタイムウェイクワード検出・音声アシスタント機能  
**設計原則**: シンプル・モダン・拡張性・単一責任原則・可読性重視  
**開発指向**: 段階的実装・クロスプラットフォーム対応・世界最高品質  

---

## 📋 Phase3の実装目標

### **🎯 メイン機能**

1. **リアルタイムウェイクワード検出**
   - 学習済み「ジャーニー」音声モデルとのリアルタイム比較
   - 音声特徴量マッチング・類似度判定アルゴリズム
   - 常時監視・低レイテンシ検出システム

2. **音声アシスタント対話システム**
   - ウェイクワード検出後の同期処理モード起動
   - 音声コマンド認識・意図理解
   - AI応答生成・TTS音声出力

3. **処理モード切り替え制御**
   - 非同期モード（通常時のバックグラウンド処理）
   - 同期モード（ウェイクワード検出後のリアルタイム対話）
   - 出力パイプ分離・最適化

4. **幾何学模様の高度化**
   - リアルタイム音声データとの連動
   - 感情・意図に応じた視覚表現
   - ユーザーカスタマイズ機能

---

## 🚀 実装計画・段階的アプローチ

### **Phase3.1: ウェイクワード検出基盤（Week 1-2）**

#### **3.1.1 音声特徴量比較アルゴリズム実装**
**ファイル**: `apps/web/src/journey-room/WakeWordDetector.js`

**機能**:
- 学習済みモデルデータの読み込み・前処理
- リアルタイム音声の特徴量抽出
- 類似度計算（コサイン類似度・DTW等）
- 閾値判定・検出精度調整

**技術仕様**:
```javascript
class WakeWordDetector {
  constructor(trainedModel, options = {}) {
    this.trainedModel = trainedModel;
    this.threshold = options.threshold || 0.8;
    this.windowSize = options.windowSize || 1000; // 1秒
  }
  
  async detectWakeWord(audioBuffer) {
    const features = this.extractFeatures(audioBuffer);
    const similarity = this.calculateSimilarity(features, this.trainedModel);
    return similarity > this.threshold;
  }
}
```

#### **3.1.2 AudioStateManager拡張**
**ファイル**: `apps/web/src/journey-room/AudioStateManager.js`

**拡張内容**:
- WakeWordDetectorの統合
- 常時音声監視ループの実装
- 検出イベントのコールバック処理
- パフォーマンス最適化（バッファリング・スレッド分離）

**実装フロー**:
```javascript
// 常時監視ループ
async startWakeWordMonitoring() {
  this.monitoringActive = true;
  
  while (this.monitoringActive) {
    const audioChunk = await this.getLatestAudioChunk();
    const detected = await this.wakeWordDetector.detectWakeWord(audioChunk);
    
    if (detected) {
      this.onWakeWordDetected();
      break; // 同期モードに切り替え
    }
    
    await this.sleep(100); // 100ms間隔でチェック
  }
}
```

#### **3.1.3 バックエンドAPI拡張**
**ファイル**: `backend/routes/journeyRoom.js`

**新規エンドポイント**:
```
POST /api/journey-room/wake-word-detect
- リアルタイム音声データ受信
- サーバーサイド検出処理（オプション）
- 検出結果・信頼度スコア返却
```

### **Phase3.2: 音声アシスタント対話システム（Week 3-4）**

#### **3.2.1 音声コマンド処理パイプライン**
**ファイル**: `apps/web/src/journey-room/VoiceCommandProcessor.js`

**機能**:
- ウェイクワード検出後の音声入力受付
- STT（Phase2.5基盤活用）による音声→テキスト変換
- コマンド分類・意図理解
- AI応答生成の準備

**処理フロー**:
```javascript
class VoiceCommandProcessor {
  async processCommand(audioStream) {
    // 1. STT変換
    const transcript = await this.sttProvider.transcribe(audioStream);
    
    // 2. 意図理解
    const intent = await this.parseIntent(transcript);
    
    // 3. AI応答生成
    const response = await this.generateResponse(intent);
    
    // 4. TTS出力
    await this.speakResponse(response);
  }
}
```

#### **3.2.2 AI応答生成システム**
**ファイル**: `backend/services/aiResponseService.js`

**機能**:
- 既存のAI設定（GPT-4等）との連携
- コンテキスト管理・会話履歴
- パーソナライズ応答生成
- 応答時間最適化

**API統合**:
```javascript
// 既存のAI設定を活用
const aiSettings = await getAISettings(userId);
const response = await generateAIResponse(command, aiSettings, context);
```

#### **3.2.3 TTS音声出力システム**
**ファイル**: `apps/web/src/journey-room/TTSManager.js`

**機能**:
- Web Speech API統合
- 音声品質・速度調整
- 幾何学模様との同期表示
- 出力キューイング・割り込み制御

### **Phase3.3: 処理モード切り替え・統合（Week 5-6）**

#### **3.3.1 モード制御システム**
**ファイル**: `apps/web/src/journey-room/ModeController.js`

**機能**:
- 非同期モード（バックグラウンド監視）
- 同期モード（リアルタイム対話）
- モード遷移の制御・状態管理
- タイムアウト・自動復帰

**状態遷移**:
```
idle → listening (ウェイクワード監視)
listening → processing (ウェイクワード検出)
processing → responding (AI応答生成)
responding → listening (応答完了後)
```

#### **3.3.2 Journey Room UI統合**
**ファイル**: `apps/web/src/journey-room/JourneyRoom.jsx`

**拡張内容**:
- ウェイクワード検出状態の表示
- 音声コマンド入力UI
- AI応答表示・履歴
- モード切り替えの視覚的フィードバック

### **Phase3.4: 幾何学模様高度化・最適化（Week 7-8）**

#### **3.4.1 リアルタイム音声連動**
**ファイル**: `apps/web/src/journey-room/GeometricVisualizer.jsx`

**拡張機能**:
- 音声レベル・周波数スペクトラムとの連動
- 感情分析結果による色彩・パターン変化
- ウェイクワード検出・応答生成時の特殊エフェクト

#### **3.4.2 ユーザーカスタマイズ**
**ファイル**: `apps/web/src/journey-room/VisualizerSettings.jsx`

**機能**:
- 個人の好みに応じた模様調整
- プリセット選択・カスタムパターン作成
- 設定保存・同期

---

## 🛠️ 技術仕様・アーキテクチャ

### **音声処理パイプライン**

```
マイク入力 → VADProcessor → WakeWordDetector → ModeController
                                    ↓
AudioStateManager ← VoiceCommandProcessor ← STTProvider
        ↓
GeometricVisualizer ← AIResponseService → TTSManager
```

### **データフロー**

```
1. 常時音声監視（非同期モード）
   マイク → VAD → WakeWordDetector → 待機

2. ウェイクワード検出（同期モード切り替え）
   検出 → ModeController → UI更新 → 音声入力待機

3. 音声コマンド処理
   音声入力 → STT → AI処理 → TTS出力 → 非同期モード復帰
```

### **パフォーマンス要件**

- **ウェイクワード検出レイテンシ**: < 500ms
- **AI応答生成時間**: < 3秒
- **TTS出力開始**: < 1秒
- **CPU使用率**: < 30%（常時監視時）
- **メモリ使用量**: < 100MB（音声バッファ含む）

---

## 📊 既存基盤の活用

### **Phase2.5+で完成済み**

✅ **Journey Room UI**: 統合表示システム  
✅ **ウェイクワード学習**: 3回録音・データベース保存  
✅ **AudioStateManager**: 音声処理・状態管理基盤  
✅ **VADProcessor**: 発話区間検出  
✅ **STT多プロバイダー**: OpenAI・Gemini対応  
✅ **WebSocket基盤**: リアルタイム通信  
✅ **バックエンドAPI**: 全エンドポイント実装  

### **Phase3で拡張・統合**

🔄 **WakeWordDetector**: 新規実装  
🔄 **VoiceCommandProcessor**: 新規実装  
🔄 **AIResponseService**: 既存AI設定との統合  
🔄 **TTSManager**: 新規実装  
🔄 **ModeController**: 新規実装  
🔄 **GeometricVisualizer**: 高度化・リアルタイム連動  

---

## 🧪 テスト・検証計画

### **Phase3.1テスト**
- ウェイクワード検出精度（正検出率・誤検出率）
- レスポンス時間測定
- 異なる環境・ノイズでの動作確認

### **Phase3.2テスト**
- 音声コマンド認識精度
- AI応答品質・適切性
- TTS音声品質・自然性

### **Phase3.3テスト**
- モード切り替えの安定性
- 長時間動作での安定性
- UI応答性・ユーザビリティ

### **Phase3.4テスト**
- 幾何学模様の同期精度
- カスタマイズ機能の動作
- 全体統合テスト

---

## 🎯 成功指標・KPI

### **技術的指標**
- ウェイクワード検出精度: > 95%
- 誤検出率: < 5%
- 応答時間: < 3秒（全体）
- 安定動作時間: > 24時間

### **ユーザー体験指標**
- 自然な対話フロー実現
- 視覚的フィードバックの満足度
- 設定・カスタマイズの使いやすさ
- 全体的な「世界最高品質」の実現

---

## 🚀 Phase4への展望

### **Phase4予定機能**
- **マルチユーザー対応**: 声紋認識・個人識別
- **コンテキスト学習**: 長期記憶・個人適応
- **モバイルアプリ**: React Native実装
- **クラウド統合**: 設定同期・バックアップ

### **最終ビジョン**
**「ジャーニー」と呼ぶだけで起動し、自然な会話で様々なタスクを実行できる、世界最高品質のパーソナル音声アシスタント**

---

## 📝 開発開始チェックリスト

### **環境準備**
- [ ] Phase2.5+基盤の動作確認
- [ ] 開発環境セットアップ
- [ ] テスト用音声データ準備

### **Phase3.1開始準備**
- [ ] WakeWordDetector設計レビュー
- [ ] 音声特徴量抽出アルゴリズム選定
- [ ] パフォーマンス測定環境構築

**Phase3実装開始準備完了！世界最高のプロダクトへの最終段階に入ります。**
