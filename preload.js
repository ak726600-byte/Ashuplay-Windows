const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ashu', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  pickImage: (kind) => ipcRenderer.invoke('settings:pickImage', kind),
  resetImage: (kind) => ipcRenderer.invoke('settings:resetImage', kind),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  search: (q) => ipcRenderer.invoke('yt:search', q),
  stream: (id, audioOnly) => ipcRenderer.invoke('yt:stream', { id, audioOnly }),
});
