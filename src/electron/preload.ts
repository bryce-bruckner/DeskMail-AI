/**
 * Electron Preload script
 * Exposes secure contextBridge API to the Renderer Process
 */
import { EmailRecord, EmailCategory, AISettings } from '../types/email';

// Ambient definitions for Electron context
interface IpcRendererShim {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
}

interface ContextBridgeShim {
  exposeInMainWorld: (apiKey: string, api: any) => void;
}

// Fallback to electron module if available, otherwise safe shim
let contextBridge: ContextBridgeShim | undefined;
let ipcRenderer: IpcRendererShim | undefined;

try {
  // @ts-ignore
  const electron = (globalThis as any).require ? (globalThis as any).require('electron') : null;
  if (electron) {
    contextBridge = electron.contextBridge;
    ipcRenderer = electron.ipcRenderer;
  }
} catch {}

export interface DesktopAPI {
  isElectron: boolean;
  platform: string;
  fetchEmails: (params?: { category?: string; search?: string }) => Promise<EmailRecord[]>;
  saveEmail: (email: EmailRecord) => Promise<boolean>;
  updateEmailCategory: (id: string, category: EmailCategory) => Promise<boolean>;
  toggleRead: (id: string, isRead: boolean) => Promise<boolean>;
  toggleStar: (id: string, isStarred: boolean) => Promise<boolean>;
  deleteEmail: (id: string) => Promise<boolean>;
  categorizeWithAI: (email: Partial<EmailRecord>) => Promise<any>;
  ingestGmail: (token: string) => Promise<any>;
  getCacheStats: () => Promise<any>;
  resetCache: () => Promise<boolean>;
  getSettings: () => Promise<AISettings>;
  saveSettings: (settings: AISettings) => Promise<boolean>;
  copyToClipboard: (text: string) => Promise<boolean>;
  openExternalUrl: (url: string) => Promise<void>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

const desktopAPI: DesktopAPI = {
  isElectron: true,
  platform: typeof process !== 'undefined' ? process.platform : 'browser',
  fetchEmails: (params) => ipcRenderer ? ipcRenderer.invoke('emails:fetch', params) : Promise.resolve([]),
  saveEmail: (email) => ipcRenderer ? ipcRenderer.invoke('emails:save', email) : Promise.resolve(true),
  updateEmailCategory: (id, category) => ipcRenderer ? ipcRenderer.invoke('emails:set-category', { id, category }) : Promise.resolve(true),
  toggleRead: (id, isRead) => ipcRenderer ? ipcRenderer.invoke('emails:set-read', { id, isRead }) : Promise.resolve(true),
  toggleStar: (id, isStarred) => ipcRenderer ? ipcRenderer.invoke('emails:set-star', { id, isStarred }) : Promise.resolve(true),
  deleteEmail: (id) => ipcRenderer ? ipcRenderer.invoke('emails:delete', id) : Promise.resolve(true),
  categorizeWithAI: (email) => ipcRenderer ? ipcRenderer.invoke('ai:categorize', email) : Promise.resolve({}),
  ingestGmail: (token) => ipcRenderer ? ipcRenderer.invoke('gmail:ingest', token) : Promise.resolve({}),
  getCacheStats: () => ipcRenderer ? ipcRenderer.invoke('cache:stats') : Promise.resolve({}),
  resetCache: () => ipcRenderer ? ipcRenderer.invoke('cache:reset') : Promise.resolve(true),
  getSettings: () => ipcRenderer ? ipcRenderer.invoke('settings:get') : Promise.resolve({} as any),
  saveSettings: (settings) => ipcRenderer ? ipcRenderer.invoke('settings:save', settings) : Promise.resolve(true),
  copyToClipboard: (text) => ipcRenderer ? ipcRenderer.invoke('clipboard:write', text) : Promise.resolve(true),
  openExternalUrl: (url) => ipcRenderer ? ipcRenderer.invoke('shell:open-external', url) : Promise.resolve(),
  minimizeWindow: () => ipcRenderer?.send('window:minimize'),
  maximizeWindow: () => ipcRenderer?.send('window:maximize'),
  closeWindow: () => ipcRenderer?.send('window:close'),
};

try {
  if (contextBridge) {
    contextBridge.exposeInMainWorld('desktopAPI', desktopAPI);
  }
} catch {
  // If not in Electron context, fallback
}
