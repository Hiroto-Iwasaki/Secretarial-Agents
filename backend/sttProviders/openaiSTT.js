// sttProviders/openaiSTT.js
// OpenAI Whisper-1 STTプロバイダー（統一インターフェース準拠）

const { OpenAI } = require('openai');
const { STTProviderInterface } = require('./sttInterface');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

class OpenAISTTProvider extends STTProviderInterface {
  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY;
    this.openai = new OpenAI({ apiKey: this.apiKey });
  }

  async transcribe(audioStream, onResult, onError, options = {}) {
    try {
      console.log('[OpenAI STT] 呼び出し: audioStream.length=' + (audioStream?.length || 0));
      
      if (!audioStream || audioStream.length === 0) {
        onError(new Error('音声データが空です'));
        return;
      }

      // 一時ファイル保存
      const tmpWebm = path.join(os.tmpdir(), `stt_openai_${Date.now()}.webm`);
      const tmpWav = path.join(os.tmpdir(), `stt_openai_${Date.now()}.wav`);
      
      try {
        // 1. 受信バイナリをwebmファイルとして保存
        fs.writeFileSync(tmpWebm, audioStream);
        console.log('[OpenAI STT] 一時webm保存:', tmpWebm, 'サイズ:', audioStream.length);
        
        // 2. ffmpegでwavに変換（WebSocketストリームデータ対応）
        try {
          execSync(`ffmpeg -i "${tmpWebm}" -f wav -ar 16000 -ac 1 -acodec pcm_s16le "${tmpWav}" -y`, { stdio: 'pipe' });
          console.log('[OpenAI STT] wav変換完了:', tmpWav);
        } catch (ffmpegError) {
          console.error('[OpenAI STT] ffmpegエラー:', ffmpegError.message);
          // ffmpeg失敗時は元のwebmを直接使用
          console.log('[OpenAI STT] 元webmを直接使用:', tmpWebm);
          // OpenAI API呼び出しでwebmを使用
          const resp = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(tmpWebm),
            model: options.model || 'whisper-1',
            response_format: 'text',
            language: options.language || 'ja'
          });
          console.log('[OpenAI STT] Whisper-1 result (webm):', resp);
          onResult(resp);
          return;
        }
        
        // 3. OpenAI API呼び出し
        const resp = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tmpWav),
          model: options.model || 'whisper-1',
          response_format: 'text',
          language: options.language || 'ja'
        });
        console.log('[OpenAI STT] Whisper-1 result:', resp);
        onResult(resp);
        
      } catch (err) {
        console.error('[OpenAI STT] エラー:', err);
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
    return 'OpenAI';
  }

  getSupportedFormats() {
    return ['webm', 'wav', 'mp3', 'm4a', 'flac', 'ogg'];
  }

  isAvailable() {
    return !!this.apiKey;
  }
}

module.exports = { OpenAISTTProvider };
