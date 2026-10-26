const { app, BrowserWindow, ipcMain, desktopCapturer, session } = require('electron');
const path = require('node:path');

let mainWindow;
let answerWindow;
let latestAnswer = { question: '', answer: '', updatedAt: '' };

function secureWindowOptions(extra = {}) {
  return {
    ...extra,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      ...(extra.webPreferences || {})
    }
  };
}

function createAnswerWindow() {
  if (answerWindow && !answerWindow.isDestroyed()) {
    answerWindow.show();
    answerWindow.focus();
    answerWindow.webContents.send('answer:update', latestAnswer);
    return;
  }
  answerWindow = new BrowserWindow(secureWindowOptions({
    width: 420,
    height: 520,
    minWidth: 340,
    minHeight: 360,
    title: 'Perry Parrot — Answer Window',
    show: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1119',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  }));
  answerWindow.setAlwaysOnTop(true, 'floating');
  answerWindow.loadFile(path.join(__dirname, 'overlay.html'));
  answerWindow.webContents.once('did-finish-load', () => answerWindow?.webContents.send('answer:update', latestAnswer));
  answerWindow.on('closed', () => { answerWindow = null; });
}

function createMainWindow() {
  mainWindow = new BrowserWindow(secureWindowOptions({
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 700,
    title: 'Perry Parrot',
    show: false,
    backgroundColor: '#0d0f14'
  }));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // Screen/system-audio capture is only requested after the user clicks the in-app capture control.
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(['media', 'display-capture', 'audioCapture', 'videoCapture'].includes(permission));
  });

  const safeOllamaBase = value => {
    const base = String(value || '');
    if (base !== 'http://localhost:11434' && base !== 'http://127.0.0.1:11434') {
      throw new Error('Only the local Ollama endpoint is allowed.');
    }
    return base;
  };
  ipcMain.handle('ollama:tags', async (_event, base) => {
    try {
      const response = await fetch(safeOllamaBase(base) + '/api/tags', { signal: AbortSignal.timeout(8000) });
      return { ok: response.ok, status: response.status, data: await response.json().catch(() => ({})) };
    } catch (error) {
      return { ok: false, status: 0, data: { error: error instanceof Error ? error.message : 'Local Ollama is unreachable.' } };
    }
  });
  ipcMain.handle('ollama:chat', async (_event, base, body) => {
    try {
      const response = await fetch(safeOllamaBase(base) + '/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180000)
      });
      return { ok: response.ok, status: response.status, data: await response.json().catch(() => ({})) };
    } catch (error) {
      return { ok: false, status: 0, data: { error: error instanceof Error ? error.message : 'Local Ollama is unreachable.' } };
    }
  });

  ipcMain.handle('desktop:list-sources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 200 },
      fetchWindowIcons: true
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      type: source.id.startsWith('screen:') ? 'screen' : 'window',
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL() || ''
    }));
  });

  ipcMain.handle('answer:update', (_event, payload) => {
    latestAnswer = {
      question: String(payload?.question || '').slice(0, 12000),
      answer: String(payload?.answer || '').slice(0, 30000),
      updatedAt: new Date().toLocaleTimeString()
    };
    if (answerWindow && !answerWindow.isDestroyed()) answerWindow.webContents.send('answer:update', latestAnswer);
    return true;
  });

  ipcMain.handle('answer:show', () => { createAnswerWindow(); return true; });
  ipcMain.handle('answer:hide', () => { if (answerWindow && !answerWindow.isDestroyed()) answerWindow.hide(); return true; });
  ipcMain.handle('answer:close', () => { if (answerWindow && !answerWindow.isDestroyed()) answerWindow.close(); return true; });

  createMainWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
