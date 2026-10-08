const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Determine storage path (user app data directory in production, ./data in dev)
const DATA_DIR = app.isPackaged
  ? path.join(app.getPath('userData'), 'data')
  : path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'emails_store.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  provider: 'gemini',
  geminiModel: 'gemini-flash-latest',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  autoProcessNewEmails: true,
  pollingIntervalMinutes: 5,
  trustedSenders: [],
};

function readEmailsFromDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading emails database:', err);
    return [];
  }
}

function writeEmailsToDb(emails) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(emails, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing emails database:', err);
  }
}

function readSettingsFromDb() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      return DEFAULT_SETTINGS;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettingsToDb(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing settings:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'DeskMail AI',
    backgroundColor: '#020617',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform === 'darwin' ? true : true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const isDev = !app.isPackaged && process.env.ELECTRON_START_URL;
  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler Registrations
ipcMain.handle('emails:fetch', async (event, params) => {
  let emails = readEmailsFromDb();
  if (params?.category && params.category !== 'All') {
    emails = emails.filter((e) => e.category === params.category);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    emails = emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        (e.snippet && e.snippet.toLowerCase().includes(q))
    );
  }
  emails.sort((a, b) => b.timestamp - a.timestamp);
  return emails;
});

ipcMain.handle('emails:save', async (event, email) => {
  const emails = readEmailsFromDb();
  const idx = emails.findIndex((e) => e.id === email.id);
  if (idx >= 0) {
    emails[idx] = { ...emails[idx], ...email };
  } else {
    emails.unshift(email);
  }
  writeEmailsToDb(emails);
  return true;
});

ipcMain.handle('emails:set-category', async (event, { id, category }) => {
  const emails = readEmailsFromDb();
  const email = emails.find((e) => e.id === id);
  if (email) {
    email.category = category;
    email.categoryReasoning = `Manually categorized as ${category} by user.`;
    writeEmailsToDb(emails);
    return true;
  }
  return false;
});

ipcMain.handle('emails:set-read', async (event, { id, isRead }) => {
  const emails = readEmailsFromDb();
  const email = emails.find((e) => e.id === id);
  if (email) {
    email.isRead = isRead;
    writeEmailsToDb(emails);
    return true;
  }
  return false;
});

ipcMain.handle('emails:set-star', async (event, { id, isStarred }) => {
  const emails = readEmailsFromDb();
  const email = emails.find((e) => e.id === id);
  if (email) {
    email.isStarred = isStarred;
    writeEmailsToDb(emails);
    return true;
  }
  return false;
});

ipcMain.handle('emails:delete', async (event, id) => {
  let emails = readEmailsFromDb();
  emails = emails.filter((e) => e.id !== id);
  writeEmailsToDb(emails);
  return true;
});

ipcMain.handle('cache:stats', async () => {
  const emails = readEmailsFromDb();
  return {
    totalEmails: emails.length,
    primaryCount: emails.filter((e) => e.category === 'Primary').length,
    junkCount: emails.filter((e) => e.category === 'Junk').length,
    reviewCount: emails.filter((e) => e.category === 'Needs Review').length,
    unreadCount: emails.filter((e) => !e.isRead).length,
    starredCount: emails.filter((e) => e.isStarred).length,
    lastSyncedAt: new Date().toISOString(),
    dbSizeEstimate: `${(fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size / 1024 : 0).toFixed(1)} KB`,
  };
});

ipcMain.handle('cache:reset', async () => {
  writeEmailsToDb([]);
  return true;
});

ipcMain.handle('settings:get', async () => {
  return readSettingsFromDb();
});

ipcMain.handle('settings:save', async (event, newSettings) => {
  writeSettingsToDb(newSettings);
  return true;
});

ipcMain.handle('clipboard:write', async (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('shell:open-external', async (event, url) => {
  await shell.openExternal(url);
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});
