import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useUserAISettings(user) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 取得
  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('user_ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (error && error.code !== 'PGRST116') setError(error);
    setSettings(data || {});
    setLoading(false);
  }, [user]);

  // 保存
  const saveSettings = useCallback(async (newSettings) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('user_ai_settings')
      .upsert([{ user_id: user.id, ...newSettings, updated_at: new Date().toISOString() }], { onConflict: ['user_id'] });
    if (error) setError(error);
    setSettings(newSettings);
    setLoading(false);
  }, [user]);

  return { settings, setSettings, fetchSettings, saveSettings, loading, error };
}
