# アプリの起動方法（完全版）

**重要**: Webアプリを正常に動作させるには、**バックエンドAPI**と**Webアプリ**の両方を起動する必要があります。

---

## 🚀 Webアプリの完全起動手順

### ステップ1: バックエンドAPIサーバーの起動

1. **新しいターミナルウィンドウ**を開く
2. プロジェクトルートから`backend`ディレクトリに移動
   ```bash
   cd backend
   ```
3. 依存関係がインストールされているか確認（初回のみ）
   ```bash
   npm install
   ```
4. バックエンドAPIサーバーを起動
   ```bash
   npm start
   ```
5. 以下のメッセージが表示されれば成功
   ```
   Backend API server running on http://localhost:3001
   ```

### ステップ2: Webアプリの起動

1. **別の新しいターミナルウィンドウ**を開く（バックエンドは起動したまま）
2. プロジェクトルートから`apps/web`ディレクトリに移動
   ```bash
   cd apps/web
   ```
3. 依存関係がインストールされているか確認（初回のみ）
   ```bash
   npm install
   ```
4. Webアプリを起動
   ```bash
   npm run dev
   ```
5. 以下のメッセージが表示されれば成功
   ```
   ➜  Local:   http://localhost:5173/
   ```

### ステップ3: ブラウザでアクセス

1. ブラウザで `http://localhost:5173/` にアクセス
2. ログイン/サインアップ画面が表示される
3. 設定画面でAIモデル選択肢が正しく表示されることを確認

---

## ✅ 動作確認チェックリスト

- [ ] バックエンドAPI（http://localhost:3001）が起動している
- [ ] Webアプリ（http://localhost:5173）が起動している
- [ ] ログイン/サインアップができる
- [ ] 設定画面に移動できる
- [ ] 各用途別のAIモデル選択肢が表示される
- [ ] 設定を保存できる
- [ ] ページリロード後も設定が復元される

---

## 🔧 トラブルシューティング

### バックエンドAPIが起動しない場合
```bash
# ポート3001が使用中の場合、プロセスを終了
lsof -ti:3001 | xargs kill -9

# 再度起動
cd backend
npm start
```

### Webアプリが起動しない場合
```bash
# ポート5173が使用中の場合、プロセスを終了
lsof -ti:5173 | xargs kill -9

# 再度起動
cd apps/web
npm run dev
```

### 設定画面にモデルが表示されない場合
1. バックエンドAPIが正常に動作しているか確認
   ```bash
   curl http://localhost:3001/api/available-ais
   ```
2. レスポンスにmodelsデータが含まれているか確認
3. ブラウザの開発者ツールでネットワークエラーがないか確認

---

## 📱 その他のアプリ起動方法

### デスクトップアプリ（Electron）
```bash
cd apps/desktop
npm install  # 初回のみ
npm start
```

### モバイルアプリ（Expo/React Native）
```bash
cd apps/mobile
npm install     # 初回のみ
npm run ios     # iOSエミュレータで起動
npm run android # Androidエミュレータで起動
npm run web     # ブラウザで起動
```

---

## 🔄 開発時の再起動手順

### バックエンドAPIサーバーの再起動
1. バックエンドが動いているターミナルで `Ctrl+C` を押して停止
2. 再度起動
   ```bash
   npm start
   ```

### Webアプリの再起動
1. Webアプリが動いているターミナルで `Ctrl+C` を押して停止
2. 再度起動
   ```bash
   npm run dev
   ```

### 完全リセット（問題が発生した場合）
```bash
# 全プロセス終了
pkill -f "node server.js"
pkill -f "vite"

# バックエンド再起動
cd backend
npm start

# 別ターミナルでWebアプリ再起動
cd apps/web
npm run dev
```

---

## 💡 開発のコツ

- **2つのターミナル**を常に開いておく（バックエンド用・フロントエンド用）
- **ブラウザの開発者ツール**を開いてエラーログを確認
- **設定変更後**は必ずページをリロードして動作確認
- **models.json変更後**はバックエンドの再起動が必要


# 1. バックエンドディレクトリに移動
cd /Users/iwasakihiroto/Secretarial-Agents/backend

# 2. 既存プロセスを確実に終了
pkill -f "node server.js"
lsof -ti:3001 | xargs kill -9

# 3. バックエンドを起動
npm start

cd /Users/iwasakihiroto/Secretarial-Agents/backend 
node wsServer.js