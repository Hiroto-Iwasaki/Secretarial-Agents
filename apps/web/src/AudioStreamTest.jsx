// AudioStreamTest.jsx
// WebSocket経由リアルタイムSTTテスト（Phase2 PoC）
import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useUserAISettings } from './hooks/useUserAISettings';

export default function AudioStreamTest() {
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sttReady, setSttReady] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const continuousRecordingRef = useRef(false); // 継続録音制御用
  const { user } = useAuth();
  const { settings, fetchSettings } = useUserAISettings(user);

  // ユーザー設定を自動取得
  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const connectWS = () => {
    if (wsRef.current) return;
    const ws = new window.WebSocket('ws://localhost:3001');
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      setMessages(msgs => [...msgs, '[open] WebSocket接続成功']);
    };
    ws.onmessage = (e) => {
      if (typeof e.data === 'string') {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'stt_ack') {
            setSttReady(true);
            setMessages(msgs => [...msgs, '[recv] STTモード準備完了']);
          } else if (msg.type === 'stt_result') {
            setTranscriptionText(msg.text);
            setMessages(msgs => [...msgs, '[recv] 認識: ' + msg.text]);
          } else if (msg.type === 'error') {
            setMessages(msgs => [...msgs, '[recv] エラー: ' + msg.message]);
          } else {
            setMessages(msgs => [...msgs, '[recv] ' + e.data]);
          }
        } catch (err) {
          setMessages(msgs => [...msgs, '[recv] ' + e.data]);
        }
      } else {
        setMessages(msgs => [...msgs, '[recv] [binary]']);
      }
    };
    ws.onclose = () => {
      setConnected(false);
      setSttReady(false);
      setMessages(msgs => [...msgs, '[close] 切断']);
      wsRef.current = null;
    };
    ws.onerror = (err) => {
      setMessages(msgs => [...msgs, '[error] ' + err.message]);
    };
  };

  const startSTTMode = () => {
    if (!connected || !user || !settings?.stt_model) return;
    // stt_startメッセージ送信
    wsRef.current.send(JSON.stringify({
      type: 'stt_start',
      stt_model: settings.stt_model
    }));
    setMessages(msgs => [...msgs, '[req] STTモード開始: ' + settings.stt_model]);
  };

  const startRecording = async () => {
    if (!sttReady) return;
    if (mediaRecorderRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      
      let chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // 完全なwebmファイルを作成
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (wsRef.current && wsRef.current.readyState === 1 && blob.size > 0) {
          blob.arrayBuffer().then(buf => {
            console.log('[client] 完全webm送信: サイズ', buf.byteLength);
            wsRef.current.send(buf);
          });
        }
        stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
        chunks = [];
        
        // 3秒後に自動で次の録音開始（継続的な認識）
        if (continuousRecordingRef.current) {
          setTimeout(() => {
            if (continuousRecordingRef.current) startRecording();
          }, 500);
        }
      };
      
      mediaRecorder.start();
      setRecording(true);
      continuousRecordingRef.current = true; // 継続録音フラグをセット
      setMessages(msgs => [...msgs, '[rec] 3秒間録音開始']);
      
      // 3秒後に自動停止
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);
      
    } catch (err) {
      setMessages(msgs => [...msgs, '[error] マイク取得失敗: ' + err.message]);
    }
  };

  const stopRecording = () => {
    // 継続録音を停止
    continuousRecordingRef.current = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setRecording(false);
    setMessages(msgs => [...msgs, '[rec] 継続認識停止']);
  };

  const disconnectWS = () => {
    if (wsRef.current) wsRef.current.close();
  };

  // 区間保存APIテスト用ボタン
  const sendSaveRequest = () => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'save' }));
      setMessages(msgs => [...msgs, '[req] 区間保存リクエスト送信']);
    }
  };

  return (
    <div style={{ border: '1px solid #aaa', padding: 16, margin: 16 }}>
      <h3>Realtime STT Test (Phase2 PoC)</h3>
      <div style={{ marginBottom: 8 }}>
        <b>STT Model:</b> {settings?.stt_model || '未設定'} | <b>User:</b> {user?.email || '未ログイン'}
      </div>
      <div>
        <button onClick={connectWS} disabled={connected || recording}>1. Connect</button>
        <button onClick={startSTTMode} disabled={!connected || !user || !settings?.stt_model || sttReady}>2. STT Mode</button>
        <button onClick={startRecording} disabled={!sttReady || recording}>3. 継続認識開始</button>
        <button onClick={stopRecording} disabled={!recording}>4. 認識停止</button>
        <button onClick={disconnectWS} disabled={!connected || recording}>Disconnect</button>
      </div>
      {transcriptionText && (
        <div style={{ marginTop: 12, padding: 8, background: '#e8f5e8', border: '1px solid #4caf50' }}>
          <b>認識結果:</b> {transcriptionText}
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <b>Status:</b> {connected ? (sttReady ? (recording ? '録音中' : 'STT準備完了') : '接続中') : '未接続'}
      </div>
      <div style={{ marginTop: 8 }}>
        <b>Log:</b>
        <ul style={{ maxHeight: 120, overflow: 'auto', background: '#f7f7f7', fontSize: 13 }}>
          {messages.map((msg, i) => <li key={i}>{msg}</li>)}
        </ul>
      </div>
    </div>
  );
}
