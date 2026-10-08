/**
 * Desktop Email Manager - Electron Main Process Architecture
 * Handles native window lifecycle, local SQLite database storage,
 * and secure IPC contextBridge registration.
 */
import path from 'path';
import http from 'http';

// Type stubs for Electron runtime
export interface ElectronWindowConfig {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  titleBarStyle: 'hiddenInset' | 'default';
  webPreferences: {
    preload: string;
    nodeIntegration: boolean;
    contextIsolation: boolean;
    sandbox: boolean;
  };
}

export const DEFAULT_WINDOW_CONFIG: ElectronWindowConfig = {
  width: 1280,
  height: 840,
  minWidth: 960,
  minHeight: 640,
  titleBarStyle: 'hiddenInset',
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  },
};

/**
 * Local OAuth 2.0 Callback Server pattern
 * Listens on localhost:8089 to receive Google OAuth authorization code
 * when authenticating via system browser.
 */
export function createLocalOAuthCallbackServer(
  onCodeReceived: (code: string) => Promise<void>
) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost:8089');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (code) {
        await onCodeReceived(code);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family:sans-serif; text-align:center; padding:40px; background:#0f172a; color:#f8fafc;">
              <h2 style="color:#10b981;">✓ Gmail Authentication Successful</h2>
              <p>You can close this tab and return to DeskMail Desktop.</p>
              <script>window.close();</script>
            </body>
          </html>
        `);
      } else if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h2>Authentication failed: ${error}</h2>`);
      } else {
        res.writeHead(404);
        res.end();
      }
    } catch (err: any) {
      res.writeHead(500);
      res.end(`Server error: ${err.message}`);
    }
  });

  return server;
}

/**
 * Auto-Updater Lifecycle Management
 * Checks GitHub Releases for newer version tags and prompts the user to restart
 */
export function initializeAutoUpdater(mainWindow?: any) {
  try {
    // Safe dynamic require for packaged Electron environment
    const { autoUpdater } = (globalThis as any).require ? (globalThis as any).require('electron-updater') : {};
    if (!autoUpdater) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates on GitHub...');
    });

    autoUpdater.on('update-available', (info: any) => {
      console.log(`[AutoUpdater] Update available: ${info?.version}. Downloading in background...`);
      mainWindow?.webContents?.send?.('updater:status', {
        status: 'downloading',
        version: info?.version,
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] DeskMail is up to date.');
    });

    autoUpdater.on('error', (err: any) => {
      console.warn('[AutoUpdater] Update check error:', err?.message || err);
    });

    autoUpdater.on('update-downloaded', (info: any) => {
      console.log(`[AutoUpdater] Update ${info?.version} downloaded and ready.`);
      mainWindow?.webContents?.send?.('updater:status', {
        status: 'ready',
        version: info?.version,
      });
    });

    // Check for updates shortly after launch
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((err: any) => {
        console.warn('[AutoUpdater] Check notification error:', err?.message);
      });
    }, 5000);
  } catch (err) {
    console.warn('[AutoUpdater] Auto-updater initialization skipped:', err);
  }
}
