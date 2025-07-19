// CLIでSupabase Authの動作確認
import readline from 'readline';
import { signUp, signIn, signOut, getUser } from './auth.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(res => rl.question(q, res));
}

async function main() {
  console.log('Supabase Auth CLI サンプル');
  while (true) {
    const cmd = await ask('\n1: サインアップ 2: ログイン 3: ログアウト 4: 現在ユーザー 0: 終了 > ');
    if (cmd === '1') {
      const email = await ask('メール: ');
      const pw = await ask('パスワード: ');
      const { data, error } = await signUp(email, pw);
      console.log('結果:', data, error);
    } else if (cmd === '2') {
      const email = await ask('メール: ');
      const pw = await ask('パスワード: ');
      const { data, error } = await signIn(email, pw);
      console.log('結果:', data, error);
    } else if (cmd === '3') {
      const { error } = await signOut();
      console.log('ログアウト:', error || 'OK');
    } else if (cmd === '4') {
      const user = await getUser();
      console.log('現在ユーザー:', user);
    } else if (cmd === '0') {
      break;
    }
  }
  rl.close();
}

main();
