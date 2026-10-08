import React from 'react';
import { RefreshCw, Database, Settings, HelpCircle, Sparkles, WifiOff } from 'lucide-react';

interface TitleBarProps {
  onSync: () => void;
  isSyncing: boolean;
  isOffline: boolean;
  onOpenWelcome: () => void;
  onOpenSettings: () => void;
  onOpenCache: () => void;
  lastSyncedText: string;
  cacheCount: number;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onSync,
  isSyncing,
  isOffline,
  onOpenWelcome,
  onOpenSettings,
  onOpenCache,
  lastSyncedText,
  cacheCount,
}) => {
  return (
    <header className="h-10 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 select-none text-xs text-slate-300 z-30 shrink-0">
      {/* Window Controls (macOS style) */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 mr-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors shadow-sm" />
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-100">DeskMail AI</span>
        </div>
      </div>

      {/* Center status */}
      <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
        {isOffline ? (
          <span className="flex items-center gap-1 text-amber-400">
            <WifiOff className="w-3 h-3" />
            <span>Offline Mode Active</span>
          </span>
        ) : (
          <span>{lastSyncedText ? `Synced ${lastSyncedText}` : 'Ready to sync'}</span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Welcome Guide */}
        <button
          onClick={onOpenWelcome}
          title="App Overview & Guide"
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 transition-colors text-[11px] font-medium"
        >
          <HelpCircle className="w-3 h-3" />
          <span className="hidden md:inline">Quick Guide</span>
        </button>

        {/* Sync Button */}
        <button
          onClick={onSync}
          disabled={isSyncing || isOffline}
          title="Fetch latest emails from Gmail API"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium transition-all text-[11px] shadow-sm"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        {/* Cache Inspector */}
        <button
          onClick={onOpenCache}
          title="Local Database Cache"
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px]"
        >
          <Database className="w-3 h-3 text-cyan-400" />
          <span>{cacheCount}</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="AI & App Settings"
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
