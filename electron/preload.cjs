const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: process.platform,
  fetchEmails: (params) => ipcRenderer.invoke('emails:fetch', params),
  saveEmail: (email) => ipcRenderer.invoke('emails:save', email),
  updateEmailCategory: (id, category) => ipcRenderer.invoke('emails:set-category', { id, category }),
  toggleRead: (id, isRead) => ipcRenderer.invoke('emails:set-read', { id, isRead }),
  toggleStar: (id, isStarred) => ipcRenderer.invoke('emails:set-star', { id, isStarred }),
  deleteEmail: (id) => ipcRenderer.invoke('emails:delete', id),
  categorizeWithAI: (email) => ipcRenderer.invoke('ai:categorize', email),
  ingestGmail: (token) => ipcRenderer.invoke('gmail:ingest', token),
  getCacheStats: () => ipcRenderer.invoke('cache:stats'),
  resetCache: () => ipcRenderer.invoke('cache:reset'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),
  openExternalUrl: (url) => ipcRenderer.invoke('shell:open-external', url),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
});
