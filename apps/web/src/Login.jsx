import { useState } from 'react';

export default function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    try {
      const res = await onAuth(mode, email, password);
      if (res.error) setMessage(res.error.message);
      else setMessage(mode === 'signup' ? '登録メールを確認してください' : 'ログイン成功');
    } catch (err) {
      setMessage('エラー: ' + err.message);
    }
  }

  return (
    <div style={{maxWidth: 340, margin: '2rem auto', padding: 24, border: '1px solid #ddd', borderRadius: 8}}>
      <h2>{mode === 'login' ? 'ログイン' : 'サインアップ'}</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} required style={{width: '100%', marginBottom: 8}} />
        <input type="password" placeholder="パスワード" value={password} onChange={e => setPassword(e.target.value)} required style={{width: '100%', marginBottom: 8}} />
        <button type="submit" style={{width: '100%', marginBottom: 8}}>{mode === 'login' ? 'ログイン' : 'サインアップ'}</button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{width: '100%', background: 'none', color: '#0070f3', border: 'none', textDecoration: 'underline', cursor: 'pointer'}}>
        {mode === 'login' ? '新規登録はこちら' : 'ログイン画面へ戻る'}
      </button>
      {message && <div style={{marginTop: 8, color: 'red'}}>{message}</div>}
    </div>
  );
}
