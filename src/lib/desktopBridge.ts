import { EmailRecord, EmailCategory, AISettings, CacheStats, AIAnalysisResult } from '../types/email';

declare global {
  interface Window {
    desktopAPI?: any;
  }
}

class DesktopBridge {
  private isElectronApp: boolean;

  constructor() {
    this.isElectronApp = typeof window !== 'undefined' && !!window.desktopAPI?.isElectron;
  }

  isElectron(): boolean {
    return this.isElectronApp;
  }

  async fetchEmails(params?: { category?: string; search?: string; unread?: boolean; starred?: boolean }): Promise<EmailRecord[]> {
    if (this.isElectronApp && window.desktopAPI?.fetchEmails) {
      return window.desktopAPI.fetchEmails(params);
    }

    try {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.unread) query.set('unread', 'true');
      if (params?.starred) query.set('starred', 'true');

      const res = await fetch(`/api/emails?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch emails');
      const data: EmailRecord[] = await res.json();
      
      // Cache locally for offline availability
      try {
        localStorage.setItem('deskmail_offline_emails', JSON.stringify(data));
      } catch {}

      return data;
    } catch (err) {
      console.warn('Network fetch failed, attempting offline cache:', err);
      try {
        const cached = localStorage.getItem('deskmail_offline_emails');
        if (cached) return JSON.parse(cached);
      } catch {}
      throw err;
    }
  }

  async saveEmail(email: EmailRecord): Promise<boolean> {
    if (this.isElectronApp && window.desktopAPI?.saveEmail) {
      return window.desktopAPI.saveEmail(email);
    }

    const res = await fetch('/api/emails/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
    });
    return res.ok;
  }

  async updateCategory(id: string, category: EmailCategory): Promise<boolean> {
    if (this.isElectronApp && window.desktopAPI?.updateEmailCategory) {
      return window.desktopAPI.updateEmailCategory(id, category);
    }

    const res = await fetch(`/api/emails/${id}/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    return res.ok;
  }

  async toggleRead(id: string, isRead: boolean): Promise<boolean> {
    if (this.isElectronApp && window.desktopAPI?.toggleRead) {
      return window.desktopAPI.toggleRead(id, isRead);
    }

    const res = await fetch(`/api/emails/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead }),
    });
    return res.ok;
  }

  async toggleStar(id: string, isStarred: boolean): Promise<boolean> {
    if (this.isElectronApp && window.desktopAPI?.toggleStar) {
      return window.desktopAPI.toggleStar(id, isStarred);
    }

    const res = await fetch(`/api/emails/${id}/star`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isStarred }),
    });
    return res.ok;
  }

  async deleteEmail(id: string): Promise<boolean> {
    if (this.isElectronApp && window.desktopAPI?.deleteEmail) {
      return window.desktopAPI.deleteEmail(id);
    }

    const res = await fetch(`/api/emails/${id}`, { method: 'DELETE' });
    return res.ok;
  }

  async categorizeWithAI(email: Partial<EmailRecord>): Promise<AIAnalysisResult> {
    if (this.isElectronApp && window.desktopAPI?.categorizeWithAI) {
      return window.desktopAPI.categorizeWithAI(email);
    }

    const res = await fetch('/api/ai/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'AI categorization failed');
    }

    return res.json();
  }

  async ingestGmail(accessToken: string): Promise<{ success: boolean; ingestedCount: number; newEmails: EmailRecord[] }> {
    if (this.isElectronApp && window.desktopAPI?.ingestGmail) {
      return window.desktopAPI.ingestGmail(accessToken);
    }

    const res = await fetch('/api/gmail/ingest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to ingest Gmail emails');
    }

    return res.json();
  }

  async getCacheStats(): Promise<CacheStats> {
    if (this.isElectronApp && window.desktopAPI?.getCacheStats) {
      return window.desktopAPI.getCacheStats();
    }

    const res = await fetch('/api/cache/stats');
    if (!res.ok) throw new Error('Failed to retrieve cache stats');
    return res.json();
  }

  async resetCache(): Promise<boolean> {
    if (this.isElectronApp && window.desktopAPI?.resetCache) {
      return window.desktopAPI.resetCache();
    }

    const res = await fetch('/api/cache/reset', { method: 'POST' });
    return res.ok;
  }

  async getSettings(): Promise<AISettings> {
    if (this.isElectronApp && window.desktopAPI?.getSettings) {
      return window.desktopAPI.getSettings();
    }

    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to retrieve settings');
    return res.json();
  }

  async saveSettings(settings: AISettings): Promise<boolean> {
    if (this.isElectronApp && window.desktopAPI?.saveSettings) {
      return window.desktopAPI.saveSettings(settings);
    }

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.ok;
  }

  async trustSender(sender: string): Promise<{ success: boolean; trustedSenders: string[]; updatedCount: number }> {
    const res = await fetch('/api/senders/trust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender }),
    });
    if (!res.ok) throw new Error('Failed to trust sender');
    return res.json();
  }

  async untrustSender(sender: string): Promise<{ success: boolean; trustedSenders: string[] }> {
    const res = await fetch('/api/senders/untrust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender }),
    });
    if (!res.ok) throw new Error('Failed to remove trusted sender');
    return res.json();
  }

  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (this.isElectronApp && window.desktopAPI?.copyToClipboard) {
        return await window.desktopAPI.copyToClipboard(text);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      console.error('Clipboard copy error:', err);
      return false;
    }
  }

  openExternalUrl(url: string): void {
    if (this.isElectronApp && window.desktopAPI?.openExternalUrl) {
      window.desktopAPI.openExternalUrl(url);
      return;
    }
    try {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Failed to open external url:', e);
    }
  }
}

export const desktopBridge = new DesktopBridge();
