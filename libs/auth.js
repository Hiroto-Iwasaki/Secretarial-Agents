// Supabase Auth ラッパー
import { supabase } from './supabaseClient.js';

// サインアップ（ユーザー登録）
export async function signUp(email, password) {
  return await supabase.auth.signUp({ email, password });
}

// ログイン
export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

// ログアウト
export async function signOut() {
  return await supabase.auth.signOut();
}

// 現在のユーザー取得
export function getUser() {
  return supabase.auth.getUser();
}
