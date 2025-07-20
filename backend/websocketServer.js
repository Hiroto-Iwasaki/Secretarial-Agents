// backend/websocketServer.js
// Phase 2: WebSocketサーバー基盤（単一責任原則・拡張性重視）

const WebSocket = require('ws');

// WebSocketサーバーを初期化
function createWebSocketServer(server) {
  // HTTP(S)サーバーを共有する形でWebSocketサーバーを起動
  const wss = new WebSocket.Server({ server });

  // クライアント接続時
  wss.on('connection', (ws, req) => {
    console.log('WebSocketクライアント接続:', req.socket.remoteAddress);

    // 音声バッファ（各クライアントごと）
    let audioBuffers = [];
    const clientId = Date.now() + '-' + Math.floor(Math.random() * 10000);
    const fs = require('fs');
    const path = require('path');

    // 初期メッセージ送信
    ws.send(JSON.stringify({ type: 'welcome', message: 'WebSocket接続成功' }));

    // --- Phase2: STTストリーミング分岐PoC ---
    let sttMode = null; // 'openai:whisper-1', 'gemini:default' etc
    let sttStreaming = false;
    const { sttFactory } = require('./sttProviders/sttFactory');
    let sttStreamActive = false;

    // メッセージ受信
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // まずバイナリデータをバッファに追加
        audioBuffers.push(Buffer.from(data));
        console.log('バイナリデータ受信（長さ: ' + data.length + '）');
        
        // --- STTストリーミングモード ---
        if (sttStreaming && sttMode) {
          if (!sttStreamActive) {
            // ストリーミング開始
            sttStreamActive = true;
            console.log('STTストリーミング開始: audioBuffers.length=' + audioBuffers.length);
            // バッファをストリームとして扱う（PoC: まとめて渡す）
            setTimeout(() => {
              const audioStream = Buffer.concat(audioBuffers);
              console.log('STT処理開始: audioStream.length=' + audioStream.length);
              
              try {
                // STTファクトリーでプロバイダー選択
                const { provider, model, options } = sttFactory.createFromSettings(sttMode);
                console.log(`STTプロバイダー: ${provider.getProviderName()}, モデル: ${model}`);
                
                provider.transcribe(audioStream, (text) => {
                  ws.send(JSON.stringify({ type: 'stt_result', text }));
                }, (err) => {
                  ws.send(JSON.stringify({ type: 'error', message: 'STTエラー: ' + err.message }));
                }, options);
              } catch (err) {
                console.error('STTファクトリーエラー:', err);
                ws.send(JSON.stringify({ type: 'error', message: 'STTプロバイダーエラー: ' + err.message }));
              }
              
              sttStreamActive = false;
              audioBuffers = [];
            }, 1000); // PoC: 1秒ごとにまとめて送信
          }
        }
      } else {
        try {
          const msg = JSON.parse(data);
          console.log('テキストメッセージ受信:', msg);
          // STTストリーミング開始指示: {type: 'stt_start', stt_model: 'openai:whisper-1'}
          if (msg.type === 'stt_start') {
            sttMode = msg.stt_model;
            console.log('[WebSocket] STTモード開始:', sttMode);
            
            try {
              // STTファクトリーでプロバイダー検証
              const { provider, model } = sttFactory.createFromSettings(sttMode);
              sttStreaming = true;
              ws.send(JSON.stringify({ 
                type: 'stt_ack', 
                message: `${provider.getProviderName()} STTモード開始`,
                stt_model: sttMode
              }));
              console.log('[WebSocket] stt_ack送信完了:', provider.getProviderName());
            } catch (err) {
              console.error('[WebSocket] STTプロバイダーエラー:', err);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'STTプロバイダーエラー: ' + err.message 
              }));
            }
          // 区間保存API: {type: 'save'} 受信時に保存
          } else if (msg.type === 'save') {
            if (audioBuffers.length > 0) {
              const filePath = path.join(__dirname, 'recordings', `audio_${clientId}_${Date.now()}.webm`);
              const buffer = Buffer.concat(audioBuffers);
              fs.writeFile(filePath, buffer, err => {
                console.log('audioBuffers.length:', audioBuffers.length);
                if (err) {
                  console.error('音声ファイル保存エラー:', err);
                } else {
                  console.log('音声ファイル保存:', filePath, 'サイズ:', buffer.length, 'bytes');
                }
              });
              audioBuffers = [];
            } else {
              console.log('保存要求受信したがaudioBuffersは空');
            }
            ws.send(JSON.stringify({ type: 'save_ack' }));
          } else {
            ws.send(JSON.stringify({ type: 'echo', message: msg }));
          }
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        }
      }
    });

    // 切断時
    ws.on('close', () => {
      if (audioBuffers.length > 0) {
        const filePath = path.join(__dirname, 'recordings', `audio_${clientId}.webm`);
        const buffer = Buffer.concat(audioBuffers);
fs.writeFile(filePath, buffer, err => {
  console.log('audioBuffers.length:', audioBuffers.length);
  if (err) {
    console.error('音声ファイル保存エラー:', err);
  } else {
    console.log('音声ファイル保存:', filePath, 'サイズ:', buffer.length, 'bytes');
  }
});
      }
      console.log('WebSocketクライアント切断');
    });
  });

  return wss;
}

module.exports = { createWebSocketServer };
