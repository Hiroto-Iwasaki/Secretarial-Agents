const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
console.log('preload path:', preloadPath);
console.log('preload exists:', require('fs').existsSync(preloadPath));

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // レンダラープロセスに対してはfalseのまま
      contextIsolation: true,  // コンテキスト分離を有効にしたまま
      sandbox: false,  // プリロードスクリプトがモジュールを読み込めるようにサンドボックスを無効化
      enableRemoteModule: false // リモートモジュールは使用しない
    },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  
  // DevToolsを開く
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
