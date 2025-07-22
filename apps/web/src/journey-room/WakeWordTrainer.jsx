// WakeWordTrainer.jsx
// ジャーニーウェイクワード3回学習UI（Siri方式）
import { useState, useRef } from 'react';
import './WakeWordTrainer.css';

export default function WakeWordTrainer({ onTrainingComplete, user }) {
  const [trainingStep, setTrainingStep] = useState(0); // 0: 準備, 1-3: 録音中, 4: 完了
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // 録音開始
  const startRecording = async () => {
    try {
      setErrorMessage('');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleRecordingComplete(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // 3秒後に自動停止
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 3000);
      
    } catch (error) {
      setErrorMessage('マイクアクセスに失敗しました: ' + error.message);
    }
  };

  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
  };

  // 録音完了処理
  const handleRecordingComplete = async (audioBlob) => {
    try {
      // 音声特徴量抽出（簡易版）
      const audioFeatures = await extractAudioFeatures(audioBlob);
      
      const newRecording = {
        id: trainingStep,
        blob: audioBlob,
        features: audioFeatures,
        timestamp: Date.now()
      };
      
      const updatedRecordings = [...recordings, newRecording];
      setRecordings(updatedRecordings);
      
      // 録音完了数に基づいた正確な進捗計算
      const completedCount = updatedRecordings.length;
      setTrainingProgress((completedCount / 3) * 100);
      
      if (completedCount < 3) {
        setTrainingStep(trainingStep + 1);
      } else {
        // 3回完了 - 学習処理実行
        await processWakeWordTraining(updatedRecordings);
      }
      
    } catch (error) {
      setErrorMessage('録音処理に失敗しました: ' + error.message);
    }
  };

  // 音声特徴量抽出（簡易版）
  const extractAudioFeatures = async (audioBlob) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(audioBlob);
      audio.src = url;
      
      audio.onloadedmetadata = () => {
        // 簡易的な特徴量（実際はより高度な処理が必要）
        const features = {
          duration: audio.duration,
          size: audioBlob.size,
          timestamp: Date.now(),
          // 実際の実装では MFCC, スペクトログラム等を使用
          simpleHash: audioBlob.size.toString() + audio.duration.toString()
        };
        
        URL.revokeObjectURL(url);
        resolve(features);
      };
    });
  };

  // ウェイクワード学習処理
  const processWakeWordTraining = async (allRecordings) => {
    try {
      setTrainingProgress(90);
      
      // 3回の録音を個別にバックエンドに送信
      for (let i = 0; i < allRecordings.length; i++) {
        const recording = allRecordings[i];
        const formData = new FormData();
        
        // バックエンドが期待する形式に合わせる
        formData.append('audio', recording.blob, `journey_${i + 1}.webm`);
        formData.append('userId', user.id);  // user_id → userId
        formData.append('wake_word', 'journey');
        formData.append('features', JSON.stringify(recording.features));
        
        const response = await fetch('http://localhost:3001/api/journey-room/train-wake-word', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '学習処理に失敗しました');
        }
        
        const result = await response.json();
        console.log(`録音 ${i + 1}/3 送信完了:`, result);
        
        // 進捗更新
        setTrainingProgress(90 + (i + 1) * 3); // 90% → 93% → 96% → 99%
      }
      
      setTrainingProgress(100);
      setTrainingStep(4);
      
      // 完了通知
      setTimeout(() => {
        onTrainingComplete();
      }, 1500);
      
    } catch (error) {
      setErrorMessage('学習処理に失敗しました: ' + error.message);
      setTrainingProgress(0);
    }
  };

  // リセット
  const resetTraining = () => {
    setTrainingStep(0);
    setRecordings([]);
    setTrainingProgress(0);
    setErrorMessage('');
    setIsRecording(false);
  };

  // 次のステップ開始
  const startNextStep = () => {
    if (trainingStep < 3) {
      startRecording();
    }
  };

  return (
    <div className="wake-word-trainer">
      <div className="trainer-header">
        <h3>ジャーニー ウェイクワード学習</h3>
        <p>「ジャーニー」を3回発声して、あなた専用の音声パターンを学習します</p>
      </div>

      {/* プログレスバー */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${trainingProgress}%` }}
          ></div>
        </div>
        <div className="progress-text">{Math.round(trainingProgress)}%</div>
      </div>

      {/* 学習ステップ表示 */}
      <div className="training-steps">
        {[1, 2, 3].map((step) => {
          const isCompleted = recordings.length >= step;
          const isActive = trainingStep === step && isRecording;
          const isPending = trainingStep < step;
          
          return (
            <div 
              key={step}
              className={`step-indicator ${
                isCompleted ? 'completed' : 
                isActive ? 'active' : 'pending'
              }`}
            >
              <div className="step-number">{step}</div>
              <div className="step-label">
                {isCompleted ? '完了' : 
                 isActive ? '録音中...' : '待機中'}
              </div>
            </div>
          );
        })}
      </div>

      {/* メインコントロール */}
      <div className="main-control">
        {trainingStep === 0 && (
          <div className="start-section">
            <p>準備ができたら、下のボタンを押して「ジャーニー」と発声してください</p>
            <button 
              className="record-button start"
              onClick={() => {
                setTrainingStep(1);
                startRecording();
              }}
            >
              学習開始
            </button>
          </div>
        )}

        {trainingStep >= 1 && trainingStep <= 3 && (
          <div className="recording-section">
            <div className={`record-indicator ${isRecording ? 'recording' : ''}`}>
              {isRecording ? (
                <>
                  <div className="pulse-circle"></div>
                  <p>「ジャーニー」と発声してください ({trainingStep}/3)</p>
                </>
              ) : (
                <>
                  <p>録音完了 ({recordings.length}/3)</p>
                  {recordings.length < 3 && (
                    <button 
                      className="record-button next"
                      onClick={startNextStep}
                    >
                      次の録音
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {trainingStep === 4 && (
          <div className="completion-section">
            <div className="success-icon">✓</div>
            <h4>学習完了！</h4>
            <p>ジャーニーウェイクワードの学習が完了しました。<br/>
               Journey Roomを起動できます。</p>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
          <button onClick={resetTraining}>リセット</button>
        </div>
      )}

      {/* リセットボタン */}
      {trainingStep > 0 && trainingStep < 4 && (
        <button className="reset-button" onClick={resetTraining}>
          最初からやり直す
        </button>
      )}
    </div>
  );
}
