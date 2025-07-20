# Gemini API キー設定ガイド

## 🔑 Gemini API キーの取得と設定

### 1. Gemini API キーの取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセス
2. Googleアカウントでログイン
3. 「Get API key」をクリック
4. 新しいAPIキーを作成
5. APIキーをコピー（安全な場所に保存）

### 2. 環境変数への設定

#### バックエンド（`.env`ファイル）

```bash
# backend/.env
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

#### 設定例

```bash
# 実際の設定例
OPENAI_API_KEY=sk-proj-abcd1234...
GEMINI_API_KEY=AIzaSyD1234567890abcdef...
```

### 3. STT設定での使用方法

#### 設定画面での選択

- **OpenAI Whisper-1**: `openai:whisper-1`
- **Gemini STT**: `gemini:gemini-stt`

#### AudioStreamTest.jsxでの使用

```javascript
// 設定から選択されたSTTモデルが自動的に使用される
const { settings } = useUserAISettings(user);
const sttModel = settings?.stt_model || 'openai:whisper-1';

// WebSocket経由で送信
ws.send(JSON.stringify({
  type: 'stt_start',
  stt_model: sttModel
}));
```

### 4. プロバイダー拡張

新しいSTTプロバイダーを追加する場合：

1. `backend/sttProviders/` に新しいプロバイダーファイルを作成
2. `STTProviderInterface` を継承
3. `sttFactory.js` にプロバイダーを登録
4. `models.json` に設定を追加

### 5. セキュリティ注意事項

- ⚠️ **APIキーは絶対にコードにハードコーディングしない**
- ⚠️ **`.env`ファイルは`.gitignore`に追加済み**
- ⚠️ **本番環境では環境変数で設定**

### 6. トラブルシューティング

#### APIキーが認識されない場合

```bash
# 環境変数の確認
echo $GEMINI_API_KEY

# サーバー再起動
cd backend
npm run dev
```

#### プロバイダーが利用不可の場合

```javascript
// ログで確認
console.log('Available STT providers:', sttFactory.getAvailableProviders());
```

---

## 🚀 使用開始

1. `.env`ファイルに`GEMINI_API_KEY`を追加
2. バックエンドサーバーを再起動
3. 設定画面で「Gemini STT」を選択
4. AudioStreamTestで音声認識をテスト

**これでGemini APIを使用したSTTが利用可能になります！**
