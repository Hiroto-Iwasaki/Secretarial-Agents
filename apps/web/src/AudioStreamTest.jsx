// AudioStreamTest.jsx
// WebSocket経由リアルタイムSTTテスト（Phase2.5 - VAD制御）
import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useUserAISettings } from './hooks/useUserAISettings';
import { VADProcessor } from './audio/VADProcessor';

export default function AudioStreamTest() {
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sttReady, setSttReady] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [vadActive, setVadActive] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const vadProcessorRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  
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
    if (vadActive) return;
    
    try {
      // 音声ストリーム取得
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      audioStreamRef.current = stream;
      
      // VADProcessor初期化
      vadProcessorRef.current = new VADProcessor({
        volumeThreshold: 0.08,
        speechStartDelay: 150,
        speechEndDelay: 1000,
        minSpeechDuration: 800,
        maxSpeechDuration: 30000,
        debug: true
      });
      
      // VADイベントハンドラー設定
      vadProcessorRef.current.onSpeechStart = () => {
        setIsSpeaking(true);
        startSpeechRecording();
        setMessages(msgs => [...msgs, '[VAD] 発話開始検出']);
      };
      
      vadProcessorRef.current.onSpeechEnd = (duration) => {
        setIsSpeaking(false);
        stopSpeechRecording();
        setMessages(msgs => [...msgs, `[VAD] 発話終了検出 (${duration}ms)`]);
      };
      
      vadProcessorRef.current.onVolumeChange = (volume) => {
        setCurrentVolume(volume);
      };
      
      // VAD開始
      await vadProcessorRef.current.start(stream);
      setVadActive(true);
      setRecording(true);
      setMessages(msgs => [...msgs, '[VAD] 発話区間検出開始']);
      
    } catch (err) {
      setMessages(msgs => [...msgs, '[error] VAD開始失敗: ' + err.message]);
    }
  };
  
  const startSpeechRecording = () => {
    if (!audioStreamRef.current) return;
    
    try {
      const mediaRecorder = new window.MediaRecorder(audioStreamRef.current, { 
        mimeType: 'audio/webm' 
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (wsRef.current && wsRef.current.readyState === 1 && blob.size > 0) {
          blob.arrayBuffer().then(buf => {
            console.log('[client] 発話区間webm送信: サイズ', buf.byteLength);
            wsRef.current.send(buf);
          });
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
      };
      
      mediaRecorder.start();
      
    } catch (err) {
      setMessages(msgs => [...msgs, '[error] 発話録音開始失敗: ' + err.message]);
    }
  };
  
  const stopSpeechRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const stopRecording = () => {
    // VAD停止
    if (vadProcessorRef.current) {
      vadProcessorRef.current.stop();
      vadProcessorRef.current = null;
    }
    
    // 録音停止
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // 音声ストリーム停止
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    setVadActive(false);
    setRecording(false);
    setIsSpeaking(false);
    setCurrentVolume(0);
    setMessages(msgs => [...msgs, '[VAD] 発話区間検出停止']);
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
        <button onClick={startRecording} disabled={!sttReady || recording}>3. VAD録音開始</button>
        <button onClick={stopRecording} disabled={!recording}>4. VAD録音停止</button>
        <button onClick={disconnectWS} disabled={!connected || recording}>Disconnect</button>
      </div>
      
      {/* VAD状態表示 */}
      {vadActive && (
        <div style={{ marginTop: 12, padding: 8, background: '#f0f8ff', border: '1px solid #4169e1' }}>
          <div><b>VAD状態:</b> {isSpeaking ? '🗣️ 発話中' : '🤫 待機中'}</div>
          <div><b>音量レベル:</b> 
            <div style={{ 
              width: '200px', 
              height: '10px', 
              background: '#ddd', 
              marginTop: '4px',
              position: 'relative'
            }}>
              <div style={{
                width: `${currentVolume * 100}%`,
                height: '100%',
                background: isSpeaking ? '#ff4444' : '#44ff44',
                transition: 'width 0.1s'
              }}></div>
            </div>
          </div>
        </div>
      )}
      {transcriptionText && (
        <div style={{ marginTop: 12, padding: 8, background: '#e8f5e8', border: '1px solid #4caf50' }}>
          <b>認識結果:</b> {transcriptionText}
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <b>Status:</b> {connected ? (sttReady ? (recording ? (vadActive ? 'VAD録音中' : '録音中') : 'STT準備完了') : '接続中') : '未接続'}
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
