const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('perryParrotDesktop', {
  isDesktop: true,
  listSources: () => ipcRenderer.invoke('desktop:list-sources'),
  ollamaTags: (base) => ipcRenderer.invoke('ollama:tags', base),
  ollamaChat: (base, body) => ipcRenderer.invoke('ollama:chat', base, body),
  updateAnswer: (payload) => ipcRenderer.invoke('answer:update', payload),
  showAnswerWindow: () => ipcRenderer.invoke('answer:show'),
  hideAnswerWindow: () => ipcRenderer.invoke('answer:hide'),
  closeAnswerWindow: () => ipcRenderer.invoke('answer:close'),
  onAnswerUpdate: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('answer:update', listener);
    return () => ipcRenderer.removeListener('answer:update', listener);
  }
});
