// sttProviders/geminiSTT.js
// Google Gemini STTプロバイダー（統一インターフェース準拠）

const { STTProviderInterface } = require('./sttInterface');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

class GeminiSTTProvider extends STTProviderInterface {
  constructor() {
    super();
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.fileManager = new GoogleAIFileManager(this.apiKey);
  }

  async transcribe(audioStream, onResult, onError, options = {}) {
    try {
      console.log('[Gemini STT] 呼び出し: audioStream.length=' + (audioStream?.length || 0));
      
      if (!audioStream || audioStream.length === 0) {
        onError(new Error('音声データが空です'));
        return;
      }

      // 一時ファイル保存
      const tmpWebm = path.join(os.tmpdir(), `stt_gemini_${Date.now()}.webm`);
      const tmpWav = path.join(os.tmpdir(), `stt_gemini_${Date.now()}.wav`);
      
      try {
        // 1. 受信バイナリをwebmファイルとして保存
        fs.writeFileSync(tmpWebm, audioStream);
        console.log('[Gemini STT] 一時webm保存:', tmpWebm, 'サイズ:', audioStream.length);
        
        // 2. ffmpegでwavに変換（Gemini APIはwebm未対応のため）
        try {
          execSync(`ffmpeg -i "${tmpWebm}" -f wav -ar 16000 -ac 1 -acodec pcm_s16le "${tmpWav}" -y`, { stdio: 'pipe' });
          console.log('[Gemini STT] wav変換完了:', tmpWav);
        } catch (ffmpegError) {
          console.error('[Gemini STT] ffmpegエラー:', ffmpegError.message);
          onError(new Error('音声形式変換に失敗しました'));
          return;
        }
        
        // 3. Gemini APIでファイルアップロード
        const uploadResult = await this.fileManager.uploadFile(tmpWav, {
          mimeType: 'audio/wav',
        });
        console.log('[Gemini STT] ファイルアップロード完了:', uploadResult.file.uri);
        
        // 4. 音声認識実行
        const modelName = options.model || 'gemini-2.5-flash';
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          {
            fileData: {
              mimeType: uploadResult.file.mimeType,
              fileUri: uploadResult.file.uri
            }
          },
          { text: 'Generate a transcript of the speech in Japanese.' }
        ]);
        console.log('[Gemini STT] 使用モデル:', modelName);
        
        const transcript = result.response.text();
        console.log('[Gemini STT] 認識結果:', transcript);
        onResult(transcript);
        
      } catch (err) {
        console.error('[Gemini STT] エラー:', err);
        onError(err);
      } finally {
        // 一時ファイル削除
        [tmpWebm, tmpWav].forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlink(file, () => {});
          }
        });
      }
    } catch (err) {
      onError(err);
    }
  }

  getProviderName() {
    return 'Gemini';
  }

  getSupportedFormats() {
    return ['webm', 'wav', 'mp3'];
  }

  isAvailable() {
    return !!this.apiKey;
  }
}

module.exports = { GeminiSTTProvider };
