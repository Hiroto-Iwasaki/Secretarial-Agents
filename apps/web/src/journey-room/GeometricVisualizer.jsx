// GeometricVisualizer.jsx
// ジャービス風幾何学模様による音声・AI状態の視覚表現
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const GeometricVisualizer = forwardRef(({ audioData, mode, isActive, config }, ref) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const geometricEngineRef = useRef(null);

  // 外部から呼び出し可能なメソッドを公開
  useImperativeHandle(ref, () => ({
    updateVisualization: (newAudioData, newMode) => {
      if (geometricEngineRef.current) {
        geometricEngineRef.current.updateData(newAudioData, newMode);
      }
    },
    setGeometricConfig: (config) => {
      if (geometricEngineRef.current) {
        geometricEngineRef.current.setConfig(config);
      }
    }
  }));

  // Canvas初期化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Canvas サイズ設定
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // GeometricEngine初期化
    geometricEngineRef.current = new GeometricEngine(ctx, canvas.width, canvas.height);
    
    // アニメーションループ開始
    const animate = () => {
      if (geometricEngineRef.current) {
        geometricEngineRef.current.render(audioData, mode, isActive);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // モード変更時の効果
  useEffect(() => {
    if (geometricEngineRef.current) {
      geometricEngineRef.current.setMode(mode);
    }
  }, [mode]);

  // 幾何学模様設定変更時の効果
  useEffect(() => {
    if (geometricEngineRef.current && config) {
      geometricEngineRef.current.setConfig(config);
    }
  }, [config]);

  return (
    <canvas
      ref={canvasRef}
      className="geometric-visualizer"
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent'
      }}
    />
  );
});

// 幾何学模様描画エンジン
class GeometricEngine {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    
    // アニメーション状態
    this.time = 0;
    this.rotation = 0;
    this.scale = 1;
    
    // 音声データ
    this.volume = 0;
    this.frequency = 0;
    this.waveform = [];
    
    // モード状態
    this.currentMode = 'idle';
    this.modeTransition = 0;
    
    // 設定可能パラメータ（バックエンドから調整可能）
    this.config = {
      // 基本図形
      baseRadius: 80,
      ringCount: 5,
      pointsPerRing: 12,
      
      // 音声反応
      volumeMultiplier: 2.0,
      frequencyScale: 0.01,
      waveformIntensity: 1.5,
      
      // アニメーション
      rotationSpeed: 0.02,
      pulseSpeed: 0.05,
      transitionSpeed: 0.1,
      
      // 色設定
      idleColor: [100, 181, 246],      // 青系
      listeningColor: [76, 175, 80],   // 緑系
      thinkingColor: [255, 152, 0],    // オレンジ系
      respondingColor: [33, 150, 243], // 青系
      
      // 数式パラメータ
      waveEquation: 'sin(t * 2) * cos(t * 3)',
      spiralEquation: 'r * (1 + 0.3 * sin(6 * theta))',
      pulseEquation: '1 + 0.5 * sin(t * 4)'
    };
  }

  // 外部設定更新
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // データ更新
  updateData(audioData, mode) {
    this.volume = audioData.volume || 0;
    this.frequency = audioData.frequency || 0;
    this.waveform = audioData.waveform || [];
    this.setMode(mode);
  }

  // モード設定
  setMode(mode) {
    if (this.currentMode !== mode) {
      this.currentMode = mode;
      this.modeTransition = 0; // トランジション開始
    }
  }

  // メイン描画処理
  render(audioData, mode, isActive) {
    this.time += 0.016; // 60fps想定
    this.rotation += this.config.rotationSpeed;
    
    // モードトランジション更新
    if (this.modeTransition < 1) {
      this.modeTransition += this.config.transitionSpeed;
    }

    // Canvas クリア
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    if (!isActive) {
      this.renderIdleState();
      return;
    }

    // モード別描画
    switch (this.currentMode) {
      case 'listening':
        this.renderListeningMode();
        break;
      case 'thinking':
        this.renderThinkingMode();
        break;
      case 'responding':
        this.renderRespondingMode();
        break;
      default:
        this.renderIdleState();
    }

    // 共通エフェクト
    this.renderCoreGeometry();
    this.renderAudioWaveform();
  }

  // アイドル状態
  renderIdleState() {
    const color = this.config.idleColor;
    this.ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`;
    this.ctx.lineWidth = 1;
    
    // 静的な円形パターン
    for (let i = 0; i < 3; i++) {
      const radius = this.config.baseRadius + i * 30;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  // 音声認識モード
  renderListeningMode() {
    const color = this.config.listeningColor;
    const intensity = this.volume * this.config.volumeMultiplier;
    
    this.ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.6 + intensity * 0.4})`;
    this.ctx.lineWidth = 2 + intensity * 3;
    
    // 音声反応する波形パターン
    this.ctx.beginPath();
    for (let i = 0; i < this.config.pointsPerRing; i++) {
      const angle = (i / this.config.pointsPerRing) * Math.PI * 2 + this.rotation;
      const waveOffset = Math.sin(this.time * 3 + i * 0.5) * intensity * 20;
      const radius = this.config.baseRadius + waveOffset;
      
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  // AI思考モード
  renderThinkingMode() {
    const color = this.config.thinkingColor;
    this.ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`;
    this.ctx.lineWidth = 2;
    
    // 複雑な回転パターン
    for (let ring = 0; ring < this.config.ringCount; ring++) {
      this.ctx.beginPath();
      const baseRadius = this.config.baseRadius + ring * 25;
      
      for (let i = 0; i <= this.config.pointsPerRing; i++) {
        const angle = (i / this.config.pointsPerRing) * Math.PI * 2;
        const rotatedAngle = angle + this.rotation * (ring % 2 === 0 ? 1 : -1);
        
        // 数式による半径変調
        const t = this.time + ring * 0.5;
        const radiusModulation = 1 + 0.3 * Math.sin(6 * rotatedAngle + t * 2);
        const radius = baseRadius * radiusModulation;
        
        const x = this.centerX + Math.cos(rotatedAngle) * radius;
        const y = this.centerY + Math.sin(rotatedAngle) * radius;
        
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
    }
  }

  // 応答モード
  renderRespondingMode() {
    const color = this.config.respondingColor;
    this.ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.9)`;
    this.ctx.lineWidth = 3;
    
    // 収束パターン
    const pulseScale = 1 + 0.5 * Math.sin(this.time * 4);
    
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.config.baseRadius * pulseScale, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // 放射状パターン
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.rotation;
      const startRadius = this.config.baseRadius * 0.5;
      const endRadius = this.config.baseRadius * 1.5 * pulseScale;
      
      const startX = this.centerX + Math.cos(angle) * startRadius;
      const startY = this.centerY + Math.sin(angle) * startRadius;
      const endX = this.centerX + Math.cos(angle) * endRadius;
      const endY = this.centerY + Math.sin(angle) * endRadius;
      
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  // コア幾何学パターン
  renderCoreGeometry() {
    // 中心点
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // 音声波形表示
  renderAudioWaveform() {
    if (this.waveform.length === 0) return;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    
    const waveRadius = this.config.baseRadius * 1.8;
    const step = (Math.PI * 2) / this.waveform.length;
    
    this.ctx.beginPath();
    for (let i = 0; i < this.waveform.length; i++) {
      const angle = i * step;
      const amplitude = this.waveform[i] * this.config.waveformIntensity;
      const radius = waveRadius + amplitude * 30;
      
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }
}

GeometricVisualizer.displayName = 'GeometricVisualizer';

export default GeometricVisualizer;
