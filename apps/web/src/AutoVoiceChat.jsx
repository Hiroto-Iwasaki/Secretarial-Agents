import React, { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import TextToSpeech from './TextToSpeech';

// MVP: 完全自動音声チャット体験
export default function AutoVoiceChat({ user }) {
  const [step, setStep] = useState('idle'); // idle | recording | transcribing | sending | responding | speaking | error
  const [transcribedText, setTranscribedText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState('');

  // 録音開始
  const handleStart = () => {
    setStep('recording');
    setTranscribedText('');
    setAiResponse('');
    setError('');
  };

  // 録音→STT完了
  const handleTranscription = async (text) => {
    setStep('sending');
    setTranscribedText(text);
    try {
      // チャットAPI送信
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: user.id })
      });
      if (!response.ok) throw new Error('APIエラー: ' + response.status);
      const result = await response.json();
      setAiResponse(result.message);
      setStep('speaking');
    } catch (e) {
      setError('AI応答取得エラー: ' + e.message);
      setStep('error');
    }
  };

  // エラー処理
  const handleError = (msg) => {
    setError(msg);
    setStep('error');
  };

  // TTS完了時
  const handleTTSComplete = () => {
    setStep('idle');
  };

  return (
    <div style={{maxWidth: 480, margin: '2rem auto', padding: 24, border: '1px solid #ddd', borderRadius: 8}}>
      <h2>Auto Voice Chat</h2>
      <div style={{marginBottom: 16}}>
        <b>Step:</b> {step}
      </div>
      {error && <div style={{color: '#c33', marginBottom: 12}}>{error}</div>}
      {step === 'idle' && (
        <button onClick={handleStart} style={{padding: '10px 24px', fontSize: 18}}>
          🎤 録音開始
        </button>
      )}
      {step === 'recording' && (
        <div style={{marginBottom: 12}}>
          <VoiceRecorder 
            onTranscription={handleTranscription}
            onError={handleError}
          />
        </div>
      )}
      {step === 'sending' && (
        <div>AIに送信中...</div>
      )}
      {step === 'speaking' && aiResponse && (
        <div>
          <div style={{marginBottom: 8}}><b>AI応答:</b> {aiResponse}</div>
          <TextToSpeech 
            text={aiResponse}
            onEnd={handleTTSComplete}
            onError={handleError}
          />
        </div>
      )}
      {step === 'error' && (
        <button onClick={handleStart} style={{padding: '8px 20px', marginTop: 8}}>
          再試行
        </button>
      )}
    </div>
  );
}
