import React, { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import TextToSpeech from './TextToSpeech';

export default function Chat({ user, onSignOut, onSettings }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'こんにちは！音声入力も可能です。ご用件をどうぞ。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages([...messages, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          userId: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`API エラー: ${response.status}`);
      }
      
      const result = await response.json();
      
      // server.jsのレスポンス形式に合わせて修正
      const aiMessage = { role: 'assistant', content: result.message };
      setMessages(msgs => [...msgs, aiMessage]);
      
      console.log('チャットAPIレスポンス:', result);
    } catch (error) {
      console.error('チャット送信エラー:', error);
      const errorMessage = { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' };
      setMessages(msgs => [...msgs, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  // 音声認識結果をチャット入力に設定
  const handleTranscription = (transcribedText) => {
    setInput(transcribedText);
    setShowVoiceRecorder(false);
    setError('');
  };

  // エラーハンドリング
  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  // 音声レコーダーの表示切り替え
  const toggleVoiceRecorder = () => {
    setShowVoiceRecorder(!showVoiceRecorder);
    setError('');
  };

  return (
    <div style={{display: 'flex', height: '100vh', maxWidth: '100%', margin: 0, padding: 0}}>
      {/* 左側: 従来のチャット */}
      <div style={{flex: 1, padding: 24, border: '1px solid #ddd', borderRadius: 8, margin: '1rem', maxWidth: 'calc(50% - 2rem)'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <button onClick={onSettings} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 0}} title="設定">
            <span role="img" aria-label="settings">⚙️</span>
          </button>
          <span>ユーザー: {user.email}</span>
        </div>
        <button onClick={onSignOut}>ログアウト</button>
      </div>
      <div style={{height: 240, overflowY: 'auto', background: '#f8fafc', margin: '16px 0', padding: 12, borderRadius: 6}}>
        {messages.map((msg, i) => (
          <div key={i} style={{textAlign: msg.role === 'user' ? 'right' : 'left', margin: '8px 0'}}>
            <div style={{display: 'inline-block'}}>
              <span style={{background: msg.role === 'user' ? '#dbeafe' : '#e0e7ef', padding: '6px 12px', borderRadius: 16, display: 'block'}}>
                {msg.content}
              </span>
              {msg.role === 'assistant' && (
                <div style={{marginTop: 4}}>
                  <TextToSpeech 
                    text={msg.content} 
                    onError={handleError}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div style={{color: '#999'}}>AI応答中...</div>}
      </div>
      
      {error && (
        <div style={{background: '#fee', color: '#c33', padding: 8, borderRadius: 4, margin: '8px 0', fontSize: 14}}>
          {error}
        </div>
      )}
      
      {showVoiceRecorder && (
        <div style={{background: '#f0f9ff', padding: 12, borderRadius: 6, margin: '8px 0'}}>
          <VoiceRecorder 
            onTranscription={handleTranscription}
            onError={handleError}
          />
        </div>
      )}
      
      <form onSubmit={handleSend} style={{display: 'flex', gap: 8, alignItems: 'center'}}>
        <button 
          type="button"
          onClick={toggleVoiceRecorder}
          style={{
            background: showVoiceRecorder ? '#ef4444' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: 14
          }}
          disabled={loading}
        >
          {showVoiceRecorder ? '🎤 録音終了' : '🎤 音声入力'}
        </button>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          style={{flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ddd'}} 
          placeholder="メッセージを入力または音声入力を使用"
          disabled={loading} 
        />
        <button 
          type="submit" 
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? '#ccc' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '送信中...' : '送信'}
        </button>
      </form>
      </div>
      
      {/* 右側: キャンバス */}
      <div style={{flex: 1, padding: 24, border: '1px solid #ddd', borderRadius: 8, margin: '1rem', maxWidth: 'calc(50% - 2rem)', display: 'flex', flexDirection: 'column'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
          <h2 style={{margin: 0, fontSize: 18, color: '#374151'}}>🎤 音声キャンバス</h2>
          <span style={{fontSize: 12, color: '#6b7280'}}>リアルタイム情報表示</span>
        </div>
        
        {/* キャンバス表示エリア */}
        <div style={{flex: 1, background: '#f8fafc', borderRadius: 6, padding: 16, overflowY: 'auto', marginBottom: 16}}>
          <div style={{textAlign: 'center', color: '#6b7280', padding: '2rem 0'}}>
            <div style={{fontSize: 48, marginBottom: 16}}>🎨</div>
            <p>音声認識結果がここに表示されます</p>
            <p style={{fontSize: 14}}>「今日の天気は？」「明日の予定は？」など話しかけてみてください</p>
          </div>
        </div>
        
        {/* キャンバス専用エリア（フォームなし） */}
      </div>
    </div>
  );
}
