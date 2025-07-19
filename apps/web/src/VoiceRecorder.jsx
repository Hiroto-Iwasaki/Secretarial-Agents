import React, { useState, useRef } from 'react';
import { transcribeAudio } from './services/apiClient';
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
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      const result = await transcribeAudio(audioFile, user.id);
      onTranscription(result.text);
    } catch (error) {
      console.error('音声認識エラー:', error);
      onError('音声認識に失敗しました。もう一度お試しください。');
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
