// test_ws_stt_client.js
// WebSocket経由でstt_start→stt_ack→バイナリ送信→stt_result受信を検証するNode.jsスクリプト

const WebSocket = require('ws');
const fs = require('fs');

const WS_URL = 'ws://localhost:3001';
const AUDIO_FILE = './recordings/audio_fixed.webm';

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('[client] WebSocket接続');
  // 1. stt_startメッセージ送信
  ws.send(JSON.stringify({
    type: 'stt_start',
    stt_model: 'openai:realtime-stt'
  }));
});

let readyForAudio = false;

ws.on('message', (data, isBinary) => {
  if (isBinary) {
    // サーバーからバイナリが返る場合（今回は未使用）
    return;
  }
  try {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'stt_ack') {
      console.log('[client] stt_ack受信: バイナリ送信開始');
      readyForAudio = true;
      // 2. テスト用音声ファイルをバイナリ送信
      fs.readFile(AUDIO_FILE, (err, buffer) => {
        if (err) {
          console.error('[client] 音声ファイル読み込みエラー:', err);
          ws.close();
          return;
        }
        ws.send(buffer, { binary: true });
        console.log('[client] バイナリ送信: 長さ', buffer.length);
      });
    }
    if (msg.type === 'stt_result') {
      console.log('[client] 認識結果:', msg.text);
      ws.close();
    }
    if (msg.type === 'error') {
      console.error('[client] サーバーエラー:', msg.message);
      ws.close();
    }
  } catch (e) {
    // パース不可
  }
});

ws.on('close', () => {
  console.log('[client] WebSocket切断');
});
