// JourneyRoom.jsx
// ジャーニーウェイクワードで起動する音声アシスタント統合UI
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useUserAISettings } from '../hooks/useUserAISettings';
import AudioStateManager from './AudioStateManager';
import './JourneyRoom.css';

export default function JourneyRoom() {
  // 基本状態管理
  const [isActive, setIsActive] = useState(false);
  const [currentMode, setCurrentMode] = useState('idle'); // idle, listening, thinking, responding
  const [wakeWordTrained, setWakeWordTrained] = useState(false);
  const [wakeWordStatus, setWakeWordStatus] = useState({
    trained: false,
    trainingCount: 0,
    lastTraining: null
  });
  const [geometricConfig, setGeometricConfig] = useState(null);
  const [audioData, setAudioData] = useState({
    volume: 0,
    frequency: 0,
    waveform: []
  });
  
  // 動的インポート用の状態
  const [componentsLoaded, setComponentsLoaded] = useState({
    GeometricVisualizer: null,
    WakeWordTrainer: null
  });

  // Refs
  const audioStateManagerRef = useRef(null);
  const geometricVisualizerRef = useRef(null);

  // Hooks
  const { user } = useAuth();
  const { settings, fetchSettings } = useUserAISettings(user);

  // API呼び出し関数
  const fetchWakeWordStatus = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/journey-room/wake-word-status?userId=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setWakeWordStatus({
          trained: data.trained,
          trainingCount: data.trainingCount,
          lastTraining: data.lastTraining
        });
        setWakeWordTrained(data.trained);
      }
    } catch (error) {
      console.error('[JourneyRoom] ウェイクワード状態取得エラー:', error);
    }
  };

  const fetchGeometricConfig = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/journey-room/geometric-config');
      const data = await response.json();
      
      if (data.success) {
        setGeometricConfig(data.config);
      }
    } catch (error) {
      console.error('[JourneyRoom] 幾何学模様設定取得エラー:', error);
    }
  };

  const updateGeometricConfig = async (newConfig) => {
    try {
      const response = await fetch('http://localhost:3001/api/journey-room/geometric-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: newConfig })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGeometricConfig(data.config);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[JourneyRoom] 幾何学模様設定更新エラー:', error);
      return false;
    }
  };

  // 動的インポート
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const [geometricModule, trainerModule] = await Promise.all([
          import('./GeometricVisualizer').catch(() => null),
          import('./WakeWordTrainer').catch(() => null)
        ]);
        
        setComponentsLoaded({
          GeometricVisualizer: geometricModule?.default || null,
          WakeWordTrainer: trainerModule?.default || null
        });
      } catch (error) {
        console.warn('[JourneyRoom] コンポーネント動的インポートエラー:', error);
      }
    };
    
    loadComponents();
  }, []);

  // AudioStateManager初期化
  useEffect(() => {
    if (!audioStateManagerRef.current) {
      audioStateManagerRef.current = new AudioStateManager();
      
      // コールバック設定
      audioStateManagerRef.current.onWakeWordDetected = handleWakeWordDetected;
      audioStateManagerRef.current.onAudioDataUpdate = handleAudioDataUpdate;
      audioStateManagerRef.current.onModeChange = handleModeChange;
    }
  }, []);

  // 初期化・データ取得
  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchWakeWordStatus();
      fetchGeometricConfig();
    }
  }, [user, fetchSettings]);

  // journey-room起動
  const activateJourneyRoom = async () => {
    if (!wakeWordTrained) {
      alert('まず「ジャーニー」のウェイクワード学習を完了してください');
      return;
    }

    setIsActive(true);
    setCurrentMode('listening');
    
    // AudioStateManager起動
    if (audioStateManagerRef.current && user && settings) {
      await audioStateManagerRef.current.start(settings, user);
    }
  };

  // journey-room停止
  const deactivateJourneyRoom = () => {
    setIsActive(false);
    setCurrentMode('idle');
    
    // AudioStateManager停止
    if (audioStateManagerRef.current) {
      audioStateManagerRef.current.stop();
    }
  };

  // ウェイクワード検出コールバック
  const handleWakeWordDetected = () => {
    console.log('[JourneyRoom] ジャーニー検出 - 同期モード起動');
    setCurrentMode('listening');
    // 同期処理パイプへの切り替え処理
  };

  // 音声データ更新コールバック
  const handleAudioDataUpdate = (newAudioData) => {
    setAudioData(newAudioData);
    
    // GeometricVisualizerに反映
    if (geometricVisualizerRef.current) {
      geometricVisualizerRef.current.updateVisualization(newAudioData, currentMode);
    }
  };

  // モード変更コールバック
  const handleModeChange = (newMode) => {
    setCurrentMode(newMode);
  };

  // ウェイクワード学習データリセット
  const resetWakeWordTraining = async () => {
    if (!audioStateManagerRef.current?.wakeWordDetector) {
      console.error('ウェイクワード検出器が初期化されていません');
      return;
    }

    try {
      const result = await audioStateManagerRef.current.wakeWordDetector.resetTrainingData();
      
      // UI状態をリセット
      setWakeWordTrained(false);
      setWakeWordStatus({
        trained: false,
        trainingCount: 0,
        lastTraining: null
      });
      
      console.log('ウェイクワード学習データリセット完了:', result.message);
      
      // Journey Roomがアクティブな場合は停止
      if (isActive) {
        deactivateJourneyRoom();
      }
      
    } catch (error) {
      console.error('ウェイクワード学習データリセットエラー:', error);
    }
  };

  // デバッグ用ログ
  console.log('[JourneyRoom] レンダリング開始', { isActive, currentMode, wakeWordTrained });

  return (
    <div className={`journey-room ${isActive ? 'active' : 'inactive'}`}>
      {/* デバッグ情報（常に表示） */}
      <div style={{ 
        position: 'fixed', 
        top: '10px', 
        left: '10px', 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div>JourneyRoom Debug:</div>
        <div>Active: {isActive ? 'Yes' : 'No'}</div>
        <div>Mode: {currentMode}</div>
        <div>Wake Word Trained: {wakeWordTrained ? 'Yes' : 'No'}</div>
        <div>Training Count: {wakeWordStatus.trainingCount}/3</div>
        <div>Geometric Config: {geometricConfig ? 'Loaded' : 'Loading...'}</div>
        <div>User: {user?.email || 'No user'}</div>
        <div>Settings: {settings?.stt_model || 'No settings'}</div>
      </div>

      {/* ヘッダー */}
      <div className="journey-room-header">
        <h2>Journey Room</h2>
        <div className="status-indicator">
          <span className={`status-dot ${currentMode}`}></span>
          <span className="status-text">
            {currentMode === 'idle' && 'スタンバイ'}
            {currentMode === 'listening' && '音声認識中'}
            {currentMode === 'thinking' && 'AI思考中'}
            {currentMode === 'responding' && '応答中'}
          </span>
        </div>
      </div>

      {/* メインビジュアライザー */}
      <div className="visualizer-container">
        {componentsLoaded.GeometricVisualizer ? (
          <componentsLoaded.GeometricVisualizer
            ref={geometricVisualizerRef}
            audioData={audioData}
            mode={currentMode}
            isActive={isActive}
            config={geometricConfig}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '300px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: 'white'
          }}>
            <div>
              <h3>🚀 Journey Room Visualizer</h3>
              <p>幾何学模様ビジュアライザー準備中...</p>
            </div>
          </div>
        )}
      </div>

      {/* コントロールパネル */}
      <div className="control-panel">
        {!wakeWordTrained ? (
          componentsLoaded.WakeWordTrainer ? (
            <componentsLoaded.WakeWordTrainer
              onTrainingComplete={() => setWakeWordTrained(true)}
              user={user}
            />
          ) : (
            <div style={{
              padding: '30px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '20px',
              textAlign: 'center'
            }}>
              <h3>🎤 ウェイクワード学習</h3>
              <p>「ジャーニー」のウェイクワード学習機能を準備中...</p>
              <button 
                onClick={() => setWakeWordTrained(true)}
                style={{
                  padding: '12px 24px',
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                スキップ（テスト用）
              </button>
            </div>
          )
        ) : (
          <div className="main-controls">
            <button
              className={`journey-button ${isActive ? 'active' : ''}`}
              onClick={isActive ? deactivateJourneyRoom : activateJourneyRoom}
              disabled={!settings?.stt_model}
            >
              {isActive ? 'Journey Room 停止' : 'Journey Room 起動'}
            </button>
            
            <div className="settings-info">
              <small>STT: {settings?.stt_model || '未設定'}</small>
              <small>AI: {settings?.ai_model || '未設定'}</small>
            </div>
            
            {/* ウェイクワード学習リセットボタン */}
            <div className="reset-controls" style={{ marginTop: '15px' }}>
              <button
                onClick={resetWakeWordTraining}
                style={{
                  padding: '8px 16px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
                title="ウェイクワード学習データを完全にリセットします"
              >
                🗑️ 学習データリセット
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AudioStateManager は useEffect で初期化済み（非表示） */}

      {/* デバッグ情報（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-panel">
          <h4>Debug Info</h4>
          <div>Mode: {currentMode}</div>
          <div>Active: {isActive ? 'Yes' : 'No'}</div>
          <div>Wake Word Trained: {wakeWordTrained ? 'Yes' : 'No'}</div>
          <div>Volume: {audioData.volume.toFixed(3)}</div>
          <div>Frequency: {audioData.frequency.toFixed(1)} Hz</div>
        </div>
      )}
    </div>
  );
}
