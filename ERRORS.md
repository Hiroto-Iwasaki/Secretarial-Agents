# Electron アプリケーションのエラー対応記録

## preload.js が認識されない問題

### 発生した問題

- **エラー内容**: `VM5:30 preload.js error: Error: module not found: path`
- preload.jsスクリプトでは組み込みモジュール（pathなど）にアクセスできなかった
- モジュールパスの解決が適切に行われず、core/apiパッケージが読み込めなかった
- `window.secretarialAPI` がundefinedになっていた

### 原因

1. **サンドボックス制限**: Electronのセキュリティモデルにより、デフォルトではpreloadスクリプト内で組み込みモジュール（path, fs等）が制限されていた
2. **相対パスの解決**: __dirnameなどのパス解決がサンドボックス環境では期待通りに動作しない場合がある
3. **コンテキスト分離**: Electronのコンテキスト分離機能によるAPIの制限

### 解決策

1. **サンドボックスの設定変更**:
   - main.jsのwebPreferencesで`sandbox: false`を設定
   ```javascript
   webPreferences: {
     preload: path.join(__dirname, 'preload.js'),
     nodeIntegration: false,
     contextIsolation: true,
     sandbox: false,  // プリロードスクリプトがモジュールを読み込めるように
     enableRemoteModule: false
   }
   ```

2. **モジュール読み込み方法の改善**:
   - 複雑なパス解決処理を避け、直接相対パスでモジュールを読み込む
   ```javascript
   const { helloCore } = require('../../packages/core/index.js');
   const { helloApi } = require('../../packages/api/index.js');
   ```

3. **エラーハンドリングの強化**:
   - try-catch ブロックを使い、詳細なエラーログを出力
   - モジュール読み込みに失敗した場合のフォールバック機能を実装

### その他の学習ポイント

- **DevToolsの活用**: `win.webContents.openDevTools()`を使って開発中は常に開発者ツールを開いておくと、preloadスクリプトのエラーも確認できる
- **パス確認ログ**: 重要なファイルパスが正しく解決されているか確認するログ出力を追加しておくと便利
- **モジュールの個別読み込み**: 大きな依存関係がある場合、個別にtry-catchで読み込むことで、一部のモジュールが使えなくても最低限の機能を提供できる

### 注意事項

- `sandbox: false`の設定は、セキュリティ上の理由から本番環境では慎重に検討する必要がある
- コンテキスト分離（contextIsolation: true）は、セキュリティのために維持することが推奨される
