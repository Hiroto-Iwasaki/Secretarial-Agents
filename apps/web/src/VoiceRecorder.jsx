import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import './VoiceComponents.css';

const VoiceRecorder = ({ onTranscription, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const { user } = useAuth();

  // 録音開始
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('録音開始エラー:', error);
      onError?.('マイクへのアクセスが拒否されました');
    }
  };

  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // STT処理（音声をテキストに変換）
  const transcribeAudio = async () => {
    if (!audioBlob || !user) return;
    
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('userId', user.id);
      
      const response = await fetch('http://localhost:3001/api/stt', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`STT API エラー: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.text) {
        onTranscription?.(result.text);
      } else {
        onError?.('音声認識に失敗しました');
      }
    } catch (error) {
      console.error('STT処理エラー:', error);
      onError?.('音声認識処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  // 録音データをクリア
  const clearRecording = () => {
    setAudioBlob(null);
  };

  return (
    <div className="voice-recorder">
      <div className="recording-controls">
        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="record-btn"
            disabled={isProcessing}
          >
            🎤 録音開始
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="stop-btn"
          >
            ⏹️ 録音停止
          </button>
        )}
        
        {audioBlob && !isRecording && (
          <div className="audio-actions">
            <button 
              onClick={transcribeAudio}
              disabled={isProcessing}
              className="transcribe-btn"
            >
              {isProcessing ? '処理中...' : '📝 テキスト変換'}
            </button>
            <button 
              onClick={clearRecording}
              className="clear-btn"
            >
              🗑️ クリア
            </button>
          </div>
        )}
      </div>
      
      {isRecording && (
        <div className="recording-indicator">
          <span className="recording-dot"></span>
          録音中...
        </div>
      )}
      
      {isProcessing && (
        <div className="processing-indicator">
          音声認識処理中...
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
