import { useState, useEffect } from 'react';
import Login from './Login';
import Chat from './Chat';
import Settings from './Settings';
import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import AudioStreamTest from './AudioStreamTest';

function AppContent() {
  const { user, loading, signUp, signIn, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [aiSettings, setAISettings] = useState({});
  const [availableAIs, setAvailableAIs] = useState({});
  const [availableModels, setAvailableModels] = useState({});

  // Settings画面表示時のみAPI取得
  useEffect(() => {
    if (showSettings) {
      fetch("http://localhost:3001/api/available-ais")
        .then(res => res.json())
        .then(data => {
          setAvailableAIs(data.ais || {});
          setAvailableModels(data.models || {});
        })
        .catch(() => {
          setAvailableAIs({});
          setAvailableModels({});
        });
    }
  }, [showSettings]);

  // Loginコンポーネントから呼ばれる認証関数
  async function handleAuth(mode, email, password) {
    if (mode === 'signup') {
      return await signUp(email, password);
    } else {
      return await signIn(email, password);
    }
  }

  async function handleSignOut() {
    return await signOut();
  }

  // 初期表示時に現在ユーザー取得
  // (本番ではuseEffectでトークン維持も実装推奨)

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        <div>読み込み中...</div>
      </div>
    );
  }

  return (
    <div>
      <AudioStreamTest />
      {user ? (
        showSettings ? (
          <Settings
            user={user}
            onBack={() => setShowSettings(false)}
            values={aiSettings}
            onChange={(key, value) => setAISettings(prev => ({ ...prev, [key]: value }))}
            availableAIs={availableAIs}
            availableModels={availableModels}
          />
        ) : (
          <Chat user={user} onSignOut={handleSignOut} onSettings={() => setShowSettings(true)} />
        )
      ) : (
        <Login onAuth={handleAuth} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
