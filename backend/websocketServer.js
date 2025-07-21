// backend/websocketServer.js
// Phase 2.5: WebSocketサーバー基盤 - VAD対応発話区間ベース処理（単一責任原則・拡張性重視）

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

    // --- Phase2.5: STTストリーミング - VAD対応発話区間ベース処理 ---
    let sttMode = null; // 'openai:whisper-1', 'gemini:default' etc
    let sttStreaming = false;
    const { sttFactory } = require('./sttProviders/sttFactory');
    let sttStreamActive = false;
    let speechSegmentBuffer = []; // 発話区間バッファ

    // メッセージ受信
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // まずバイナリデータをバッファに追加
        audioBuffers.push(Buffer.from(data));
        console.log('バイナリデータ受信（長さ: ' + data.length + '）');
        
        // --- STTストリーミングモード - VAD対応発話区間ベース処理 ---
        if (sttStreaming && sttMode) {
          // 発話区間バッファに追加
          speechSegmentBuffer.push(Buffer.from(data));
          console.log(`発話区間データ受信: ${data.length}bytes, バッファ合計: ${speechSegmentBuffer.length}チャンク`);
          
          // 発話区間完了として即座に処理（VADで区切られた完全な発話）
          if (!sttStreamActive) {
            sttStreamActive = true;
            
            // 発話区間を結合
            const speechSegment = Buffer.concat(speechSegmentBuffer);
            console.log(`発話区間STT処理開始: ${speechSegment.length}bytes`);
            
            try {
              // STTファクトリーでプロバイダー選択
              const { provider, model, options } = sttFactory.createFromSettings(sttMode);
              console.log(`STTプロバイダー: ${provider.getProviderName()}, モデル: ${model}`);
              
              provider.transcribe(speechSegment, (text) => {
                console.log(`STT認識結果: "${text}"`);
                ws.send(JSON.stringify({ 
                  type: 'stt_result', 
                  text,
                  segmentSize: speechSegment.length,
                  timestamp: Date.now()
                }));
                
                // 処理完了後のクリーンアップ
                sttStreamActive = false;
                speechSegmentBuffer = [];
                audioBuffers = [];
              }, (err) => {
                console.error('STT処理エラー:', err);
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'STTエラー: ' + err.message,
                  segmentSize: speechSegment.length
                }));
                
                // エラー時のクリーンアップ
                sttStreamActive = false;
                speechSegmentBuffer = [];
                audioBuffers = [];
              }, options);
              
            } catch (err) {
              console.error('STTファクトリーエラー:', err);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'STTプロバイダーエラー: ' + err.message 
              }));
              
              // エラー時のクリーンアップ
              sttStreamActive = false;
              speechSegmentBuffer = [];
              audioBuffers = [];
            }
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
              speechSegmentBuffer = []; // バッファ初期化
              
              ws.send(JSON.stringify({ 
                type: 'stt_ack', 
                message: `${provider.getProviderName()} VAD対応STTモード開始`,
                stt_model: sttMode,
                mode: 'speech_segment_based'
              }));
              console.log('[WebSocket] VAD対応stt_ack送信完了:', provider.getProviderName());
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
