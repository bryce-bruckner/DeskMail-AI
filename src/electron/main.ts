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
