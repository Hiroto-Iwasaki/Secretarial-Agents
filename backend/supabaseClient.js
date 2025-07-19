// バックエンド用Supabaseクライアント
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Warning: Supabase環境変数が設定されていません');
  console.warn('SUPABASE_URL:', supabaseUrl ? 'あり' : 'なし');
  console.warn('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'あり' : 'なし');
}

// サービスロールキーを使用（バックエンドでのみ使用、RLSをバイパス可能）
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

module.exports = { supabase };
