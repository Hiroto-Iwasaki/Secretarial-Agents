// Supabase動作確認用サンプル
import { supabase } from './supabaseClient.js';

async function testSupabase() {
  // データベースのテーブル名を適宜変更してください
  const { data, error } = await supabase.from('test').select('*').limit(1);
  if (error) {
    console.error('Supabase接続エラー:', error);
  } else {
    console.log('Supabase接続成功:', data);
  }
}

testSupabase();
