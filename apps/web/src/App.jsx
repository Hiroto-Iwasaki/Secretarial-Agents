import { useState, useEffect } from 'react';
import Login from './Login';
import Chat from './Chat';
import Settings from './Settings';
import './App.css';
import { AuthProvider, useAuth } from './AuthContext';
import AudioStreamTest from './AudioStreamTest';
import JourneyRoom from './journey-room/JourneyRoom';

function AppContent() {
  const { user, loading, signUp, signIn, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('chat'); // chat, settings, journey-room, audio-test
  const [aiSettings, setAISettings] = useState({});
  const [availableAIs, setAvailableAIs] = useState({});
  const [availableModels, setAvailableModels] = useState({});

  // Settings画面表示時のみAPI取得
  useEffect(() => {
    if (currentView === 'settings') {
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
  }, [currentView]);

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

  // ナビゲーションメニュー
  const renderNavigation = () => {
    if (!user) return null;
    
    return (
      <nav className="app-navigation">
        <div className="nav-brand">
          <h2>Secretarial Agents</h2>
        </div>
        <div className="nav-menu">
          <button 
            className={currentView === 'chat' ? 'nav-item active' : 'nav-item'}
            onClick={() => setCurrentView('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={currentView === 'journey-room' ? 'nav-item active' : 'nav-item'}
            onClick={() => setCurrentView('journey-room')}
          >
            🚀 Journey Room
          </button>
          <button 
            className={currentView === 'audio-test' ? 'nav-item active' : 'nav-item'}
            onClick={() => setCurrentView('audio-test')}
          >
            🎤 Audio Test
          </button>
          <button 
            className={currentView === 'settings' ? 'nav-item active' : 'nav-item'}
            onClick={() => setCurrentView('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
        <div className="nav-user">
          <span className="user-email">{user.email}</span>
          <button className="sign-out-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </nav>
    );
  };

  // メインコンテンツレンダリング
  const renderMainContent = () => {
    if (!user) {
      return <Login onAuth={handleAuth} />;
    }

    switch (currentView) {
      case 'settings':
        return (
          <Settings
            user={user}
            onBack={() => setCurrentView('chat')}
            values={aiSettings}
            onChange={(key, value) => setAISettings(prev => ({ ...prev, [key]: value }))}
            availableAIs={availableAIs}
            availableModels={availableModels}
          />
        );
      case 'journey-room':
        return <JourneyRoom />;
      case 'audio-test':
        return <AudioStreamTest />;
      case 'chat':
      default:
        return (
          <Chat 
            user={user} 
            onSignOut={handleSignOut} 
            onSettings={() => setCurrentView('settings')} 
          />
        );
    }
  };

  return (
    <div className="app-container">
      {renderNavigation()}
      <main className="app-main">
        {renderMainContent()}
      </main>
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
