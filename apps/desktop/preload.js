console.log('==== preload.js 実行開始 ====');
try {
  console.log('preload.js loaded');
  
  // 直接相対パスでrequireする
  const { contextBridge } = require('electron');
  
  // 注意: __dirnameが使えない場合は直接相対パスで指定
  const { helloCore } = require('../../packages/core/index.js');
  const { helloApi } = require('../../packages/api/index.js');
  
  console.log('helloCore loaded:', typeof helloCore);
  console.log('helloApi loaded:', typeof helloApi);
  
  contextBridge.exposeInMainWorld('secretarialAPI', {
    helloCore,
    helloApi
  });
  
  console.log('contextBridge exposed successfully');
} catch (e) {
  console.error('preload.js error:', e);
  console.error(e.stack);
}
