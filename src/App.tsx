/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebase';
import { desktopBridge } from './lib/desktopBridge';
import { EmailRecord, EmailCategory, AISettings, CacheStats } from './types/email';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { EmailList } from './components/EmailList';
import { EmailDetail } from './components/EmailDetail';
import { SettingsModal } from './components/SettingsModal';
import { CacheInspectorModal } from './components/CacheInspectorModal';
import { WelcomeModal } from './components/WelcomeModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>('Primary');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [lastSyncedText, setLastSyncedText] = useState<string>('just now');
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCacheModalOpen, setIsCacheModalOpen] = useState<boolean>(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('deskmail_welcome_dismissed');
    } catch {
      return true;
    }
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [settings, setSettings] = useState<AISettings>({
    provider: 'gemini',
    geminiModel: 'gemini-3.8-flash',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    autoProcessNewEmails: true,
    pollingIntervalMinutes: 5,
    trustedSenders: [],
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Load emails and stats from desktop bridge
  const loadEmails = useCallback(async () => {
    try {
      const data = await desktopBridge.fetchEmails();
      setEmails(data);

      // Auto select first email if none selected
      setSelectedEmailId((prev) => {
        if (prev && data.some((e) => e.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });

      // Update cache stats
      try {
        const stats = await desktopBridge.getCacheStats();
        setCacheStats(stats);
      } catch {}
    } catch (err: any) {
      console.error('Failed to load emails:', err);
      showToast('Loaded offline cached database.', 'info');
    }
  }, []);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, _token) => {
        setCurrentUser(user);
        showToast(`Connected as ${user.displayName || user.email}`, 'success');
      },
      () => {
        setCurrentUser(null);
      }
    );

    // Initial fetch of settings and emails
    desktopBridge.getSettings().then((s) => setSettings(s)).catch(() => {});
    loadEmails();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadEmails]);

  // Google Sign-In Handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        showToast('Successfully signed in with Google! Ingesting latest emails...', 'success');
        // Trigger immediate ingest with token
        await handleSyncWithToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast(err.message || 'Failed to sign in with Google', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      showToast('Logged out of Google account.', 'info');
    } catch (err: any) {
      console.error('Logout failed:', err);
    }
  };

  // Sync with Gmail API using in-memory access token
  const handleSyncWithToken = async (token: string) => {
    setIsSyncing(true);
    try {
      const result = await desktopBridge.ingestGmail(token);
      await loadEmails();
      setLastSyncedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      showToast(
        result.ingestedCount > 0
          ? `Ingested & categorized ${result.ingestedCount} new emails from Gmail!`
          : 'Gmail inbox is up to date (no new messages).',
        'success'
      );
    } catch (err: any) {
      console.error('Sync failed:', err);
      showToast(`Sync error: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync button handler
  const handleSync = async () => {
    if (isOffline) {
      showToast('Cannot sync in offline mode. Switch to Online mode first.', 'info');
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      showToast('Sign in with Google to sync live Gmail inbox, or viewing cached emails.', 'info');
      await loadEmails();
      setLastSyncedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return;
    }

    await handleSyncWithToken(token);
  };

  // Polling effect
  useEffect(() => {
    if (!settings.pollingIntervalMinutes || settings.pollingIntervalMinutes <= 0 || isOffline) {
      return;
    }

    const intervalMs = settings.pollingIntervalMinutes * 60 * 1000;
    const interval = setInterval(async () => {
      const token = await getAccessToken();
      if (token) {
        try {
          await desktopBridge.ingestGmail(token);
          await loadEmails();
          setLastSyncedText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch (e) {
          console.warn('Periodic background sync failed:', e);
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [settings.pollingIntervalMinutes, isOffline, loadEmails]);

  // Update email category
  const handleUpdateCategory = async (id: string, category: EmailCategory) => {
    try {
      await desktopBridge.updateCategory(id, category);
      setEmails((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, category, categoryReasoning: `Manually moved to ${category}` } : e
        )
      );
      showToast(`Moved email to ${category}`, 'success');
      try {
        const stats = await desktopBridge.getCacheStats();
        setCacheStats(stats);
      } catch {}
    } catch (err: any) {
      showToast(`Failed to update category: ${err.message}`, 'error');
    }
  };

  // Toggle star
  const handleToggleStar = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const email = emails.find((item) => item.id === id);
    if (!email) return;

    const newStarred = !email.isStarred;
    try {
      await desktopBridge.toggleStar(id, newStarred);
      setEmails((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isStarred: newStarred } : item))
      );
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Toggle read
  const handleToggleRead = async (id: string, isRead: boolean) => {
    try {
      await desktopBridge.toggleRead(id, isRead);
      setEmails((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead } : item))
      );
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Delete email
  const handleDeleteEmail = async (id: string) => {
    try {
      await desktopBridge.deleteEmail(id);
      setEmails((prev) => prev.filter((item) => item.id !== id));
      if (selectedEmailId === id) {
        const remaining = emails.filter((item) => item.id !== id);
        setSelectedEmailId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast('Deleted email from local cache', 'info');
      try {
        const stats = await desktopBridge.getCacheStats();
        setCacheStats(stats);
      } catch {}
    } catch (err: any) {
      showToast(`Failed to delete: ${err.message}`, 'error');
    }
  };

  // Mark email as "This isn't junk" and whitelist sender to always go to Primary
  const handleMarkNotJunk = async (sender: string, _emailId: string) => {
    try {
      const res = await desktopBridge.trustSender(sender);
      setSettings((prev) => ({
        ...prev,
        trustedSenders: res.trustedSenders,
      }));

      // Retroactively update matching emails in frontend state to Primary
      const cleanSender = sender.trim().toLowerCase();
      setEmails((prev) =>
        prev.map((e) =>
          e.from.toLowerCase().includes(cleanSender)
            ? {
                ...e,
                category: 'Primary',
                confidenceScore: 1.0,
                categoryReasoning: 'Sender is on your "This isn\'t junk" trusted list (routed to Primary).',
              }
            : e
        )
      );

      try {
        const stats = await desktopBridge.getCacheStats();
        setCacheStats(stats);
      } catch {}

      showToast(`Marked "${sender}" as not junk. All current & future emails will land in Primary Feed!`, 'success');
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Re-run AI analysis
  const handleReanalyze = async (email: EmailRecord) => {
    setIsAnalyzing(true);
    try {
      const result = await desktopBridge.categorizeWithAI(email);
      setEmails((prev) =>
        prev.map((item) =>
          item.id === email.id
            ? {
                ...item,
                category: result.category,
                summary: result.summary,
                suggestedReplyBullets: result.suggested_reply_bullets,
                confidenceScore: result.confidence_score,
                categoryReasoning: result.reasoning,
                processedWith: settings.provider === 'ollama' ? 'ollama' : 'gemini',
                processedAt: new Date().toISOString(),
              }
            : item
        )
      );
      showToast(`AI analysis updated via ${settings.provider === 'ollama' ? 'Ollama' : 'Gemini 3.8 Flash'}`, 'success');
    } catch (err: any) {
      showToast(`AI Analysis error: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save settings
  const handleSaveSettings = async (newSettings: AISettings) => {
    await desktopBridge.saveSettings(newSettings);
    setSettings(newSettings);
    showToast('AI and sync settings saved successfully', 'success');
  };

  // Clear cache
  const handleResetToSeeds = async () => {
    await desktopBridge.resetCache();
    await loadEmails();
    showToast('Local database cache cleared', 'info');
  };

  // Filtered emails based on current sidebar tab and search query
  const displayedEmails = useMemo(() => {
    let list = [...emails];

    if (currentCategory === 'Primary' || currentCategory === 'Junk' || currentCategory === 'Needs Review') {
      list = list.filter((e) => e.category === currentCategory);
    } else if (currentCategory === 'Starred') {
      list = list.filter((e) => e.isStarred);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.from.toLowerCase().includes(q) ||
          e.fromName.toLowerCase().includes(q) ||
          e.snippet.toLowerCase().includes(q) ||
          e.bodyText.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q)
      );
    }

    return list;
  }, [emails, currentCategory, searchQuery]);

  // Sidebar count calculations
  const counts = useMemo(() => {
    return {
      primary: emails.filter((e) => e.category === 'Primary').length,
      primaryUnread: emails.filter((e) => e.category === 'Primary' && !e.isRead).length,
      junk: emails.filter((e) => e.category === 'Junk').length,
      junkUnread: emails.filter((e) => e.category === 'Junk' && !e.isRead).length,
      review: emails.filter((e) => e.category === 'Needs Review').length,
      reviewUnread: emails.filter((e) => e.category === 'Needs Review' && !e.isRead).length,
      starred: emails.filter((e) => e.isStarred).length,
      all: emails.length,
    };
  }, [emails]);

  const selectedEmail = useMemo(() => {
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [emails, selectedEmailId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Desktop Window Title Bar */}
      <TitleBar
        onSync={handleSync}
        isSyncing={isSyncing}
        isOffline={isOffline}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCache={() => setIsCacheModalOpen(true)}
        lastSyncedText={lastSyncedText}
        cacheCount={emails.length}
      />

      {/* Main App Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentCategory={currentCategory}
          onSelectCategory={(cat) => setCurrentCategory(cat)}
          counts={counts}
          currentUser={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isLoggingIn={isLoggingIn}
          settings={settings}
          onOpenWelcome={() => setIsWelcomeOpen(true)}
        />

        {/* Center Email List Pane */}
        <EmailList
          emails={displayedEmails}
          selectedEmailId={selectedEmailId}
          onSelectEmail={(email) => {
            setSelectedEmailId(email.id);
            if (!email.isRead) {
              handleToggleRead(email.id, true);
            }
          }}
          onToggleStar={(id, e) => handleToggleStar(id, e)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentCategoryTitle={
            currentCategory === 'Primary'
              ? 'Primary Feed'
              : currentCategory === 'Junk'
              ? 'Junk / Marketing'
              : currentCategory === 'Needs Review'
              ? 'Needs Review / Low Confidence'
              : currentCategory
          }
          onResetSamples={handleResetToSeeds}
        />

        {/* Right Email Detail & AI Action Pane */}
        <EmailDetail
          email={selectedEmail}
          onUpdateCategory={handleUpdateCategory}
          onToggleStar={handleToggleStar}
          onToggleRead={handleToggleRead}
          onDelete={handleDeleteEmail}
          onReanalyze={handleReanalyze}
          isAnalyzing={isAnalyzing}
          onMarkNotJunk={handleMarkNotJunk}
          trustedSenders={settings.trustedSenders || []}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Local Cache Inspector Modal */}
      <CacheInspectorModal
        isOpen={isCacheModalOpen}
        onClose={() => setIsCacheModalOpen(false)}
        stats={cacheStats}
        onResetToSeeds={handleResetToSeeds}
      />

      {/* Welcome & First-time User Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => {
          setIsWelcomeOpen(false);
          try {
            localStorage.setItem('deskmail_welcome_dismissed', 'true');
          } catch {}
        }}
        onConnectGoogle={handleLogin}
        isLoggedIn={!!currentUser}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-lg shadow-xl text-xs font-medium border animate-in fade-in slide-in-from-bottom-2 duration-200 bg-slate-900 border-slate-700 text-slate-100">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-slate-200 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
