// backend/openaiRealtimeSTT.js
// 単一責任: OpenAI Realtime STT APIラッパー
// Phase2 PoC: バイナリ音声ストリーム→OpenAI Realtime API→テキストストリーム

const { OpenAI } = require('openai');
const apiKey = process.env.OPENAI_API_KEY;

// OpenAI Realtime STTストリーム処理（PoC: 最小構成）
async function transcribeRealtimeSTT(audioStream, onResult, onError) {
  try {
    const openai = new OpenAI({ apiKey });
    // ここでOpenAI Realtime APIのストリーミング呼び出しを実装
    // ※2024年時点のAPI仕様に合わせて適宜修正が必要
    // 例: openai.audio.transcriptions.createStream(...)
    // onResult(text)で逐次認識結果を返す
    // onError(err)でエラーを通知
    
    // --- デバッグ版: 受信バイナリをwav変換してAPI送信 ---
    console.log('[transcribeRealtimeSTT] 呼び出し: audioStream.length=' + (audioStream?.length || 0));
    
    if (!audioStream || audioStream.length === 0) {
      onError(new Error('音声データが空です'));
      return;
    }

    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { execSync } = require('child_process');
    
    // 一時ファイル保存
    const tmpWebm = path.join(os.tmpdir(), `stt_${Date.now()}.webm`);
    const tmpWav = path.join(os.tmpdir(), `stt_${Date.now()}.wav`);
    
    try {
      // 1. 受信バイナリをwebmファイルとして保存
      fs.writeFileSync(tmpWebm, audioStream);
      console.log('[transcribeRealtimeSTT] 一時webm保存:', tmpWebm, 'サイズ:', audioStream.length);
      
      // 2. ffmpegでwavに変換（WebSocketストリームデータ対応）
      try {
        execSync(`ffmpeg -i "${tmpWebm}" -f wav -ar 16000 -ac 1 -acodec pcm_s16le "${tmpWav}" -y`, { stdio: 'pipe' });
        console.log('[transcribeRealtimeSTT] wav変換完了:', tmpWav);
      } catch (ffmpegError) {
        console.error('[transcribeRealtimeSTT] ffmpegエラー:', ffmpegError.message);
        // ffmpeg失敗時は元のwebmを直接使用
        console.log('[transcribeRealtimeSTT] 元webmを直接使用:', tmpWebm);
        // OpenAI API呼び出しでwebmを使用
        const resp = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tmpWebm),
          model: 'whisper-1',
          response_format: 'text',
          language: 'ja'
        });
        console.log('[transcribeRealtimeSTT] Whisper-1 result (webm):', resp);
        onResult(resp);
        return;
      }
      
      // 3. OpenAI API呼び出し
      const resp = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tmpWav),
        model: 'whisper-1',
        response_format: 'text',
        language: 'ja'
      });
      console.log('[transcribeRealtimeSTT] Whisper-1 result:', resp);
      onResult(resp);
      
    } catch (err) {
      console.error('[transcribeRealtimeSTT] エラー:', err);
      onError(err);
    } finally {
      // 一時ファイル削除
      [tmpWebm, tmpWav].forEach(file => {
        if (fs.existsSync(file)) {
          fs.unlink(file, () => {});
        }
      });
    }
    // ---
  } catch (err) {
    onError(err);
  }
}

module.exports = { transcribeRealtimeSTT };
