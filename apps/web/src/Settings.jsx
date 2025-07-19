import React, { useEffect } from 'react';
import { useUserAISettings } from './hooks/useUserAISettings';

export default function Settings({ user, onBack, availableModels = {} }) {
  const { settings, setSettings, fetchSettings, saveSettings, loading, error } = useUserAISettings(user);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  if (!settings) return <div>Loading...</div>;

  const handleChange = (key, value) => setSettings(s => ({ ...s, [key]: value }));

  const handleSave = async () => {
    await saveSettings(settings);
    // 保存成功時のアラートは不要
  };


  return (
    <div style={{maxWidth: 400, margin: '2rem auto', padding: 24, border: '1px solid #ddd', borderRadius: 8}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{margin: 0}}>設定</h2>
        <button onClick={onBack} style={{fontSize: 18, background: 'none', border: 'none', cursor: 'pointer'}}>← 戻る</button>
      </div>
      <div style={{marginTop: 24}}>
        <div>ユーザー: {user.email}</div>
        <div style={{marginTop: 16}}>
          {error && <div style={{color:'red'}}>エラー: {error.message}</div>}
          {/* 用途ごとのモデル選択プルダウンを動的生成 */}
          {[
            { key: "dialog_model", label: "対話モデル" },
            { key: "stt_model", label: "音声認識モデル" },
            { key: "tts_model", label: "音声出力モデル" },
            { key: "slide_model", label: "スライド生成モデル" },
            { key: "research_model", label: "DeepResearchモデル" },
            { key: "tool_model", label: "ツール用モデル" },
          ].map(({ key, label }) => {
            // モデル候補抽出
            const tag = key.replace('_model', '');
            const candidates = [];
            Object.entries(availableModels).forEach(([provider, conf]) => {
              (conf.candidates || []).forEach(model => {
                if (model.tags && model.tags.includes(tag)) {
                  candidates.push({ provider, ...model });
                }
              });
            });
            if (!candidates.length) return null;
            return (
              <label key={key}>{label}<br/>
                <select value={settings[key] || ""} onChange={e => handleChange(key, e.target.value)} style={{width: '100%', marginBottom: 10}}>
                  <option value="">選択してください</option>
                  {candidates.map(opt => (
                    <option key={opt.provider + ":" + opt.name} value={opt.provider + ":" + opt.name}>
                      {opt.provider} / {opt.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          <button onClick={handleSave} disabled={loading} style={{marginTop: 16}}>保存</button>
        </div>
      </div>
    </div>
  );
}
