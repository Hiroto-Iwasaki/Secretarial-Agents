import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import './VoiceComponents.css';

const TextToSpeech = ({ text, onError }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const audioRef = useRef(null);
  const { user } = useAuth();

  // 利用可能な音声オプション
  const voices = [
    { value: 'alloy', label: 'Alloy（自然）' },
    { value: 'echo', label: 'Echo（男性）' },
    { value: 'fable', label: 'Fable（英国）' },
    { value: 'onyx', label: 'Onyx（深い）' },
    { value: 'nova', label: 'Nova（若い）' },
    { value: 'shimmer', label: 'Shimmer（柔らか）' }
  ];

  // TTS処理（テキストを音声に変換）
  const generateSpeech = async () => {
    if (!text || !user) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          userId: user.id,
          voice: selectedVoice
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS API エラー: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.audio) {
        // Base64音声データをBlobに変換
        const audioData = atob(result.audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < audioData.length; i++) {
          uint8Array[i] = audioData.charCodeAt(i);
        }
        
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      } else {
        onError?.('音声合成に失敗しました');
      }
    } catch (error) {
      console.error('TTS処理エラー:', error);
      onError?.('音声合成処理中にエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // 音声再生
  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 音声停止
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // 音声再生終了時の処理
  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  // 音声データをクリア
  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsPlaying(false);
  };

  return (
    <div className="text-to-speech">
      <div className="voice-selection">
        <label htmlFor="voice-select">音声選択:</label>
        <select 
          id="voice-select"
          value={selectedVoice} 
          onChange={(e) => setSelectedVoice(e.target.value)}
          disabled={isGenerating || isPlaying}
        >
          {voices.map(voice => (
            <option key={voice.value} value={voice.value}>
              {voice.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tts-controls">
        <button 
          onClick={generateSpeech}
          disabled={!text || isGenerating || isPlaying}
          className="generate-btn"
        >
          {isGenerating ? '生成中...' : '🔊 音声生成'}
        </button>
        
        {audioUrl && (
          <div className="audio-controls">
            {!isPlaying ? (
              <button 
                onClick={playAudio}
                className="play-btn"
              >
                ▶️ 再生
              </button>
            ) : (
              <button 
                onClick={stopAudio}
                className="stop-btn"
              >
                ⏸️ 停止
              </button>
            )}
            <button 
              onClick={clearAudio}
              className="clear-btn"
              disabled={isPlaying}
            >
              🗑️ クリア
            </button>
          </div>
        )}
      </div>
      
      {isGenerating && (
        <div className="generating-indicator">
          音声生成中...
        </div>
      )}
      
      {audioUrl && (
        <audio 
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnd}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
};

export default TextToSpeech;
