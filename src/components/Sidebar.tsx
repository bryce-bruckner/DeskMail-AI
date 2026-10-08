import React from 'react';
import { User } from 'firebase/auth';
import {
  Inbox,
  Trash2,
  HelpCircle,
  Star,
  Mail,
  LogOut,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { EmailCategory, AISettings } from '../types/email';

interface SidebarProps {
  currentCategory: string; // 'Primary' | 'Junk' | 'Needs Review' | 'All' | 'Starred'
  onSelectCategory: (cat: string) => void;
  counts: {
    primary: number;
    primaryUnread: number;
    junk: number;
    junkUnread: number;
    review: number;
    reviewUnread: number;
    starred: number;
    all: number;
  };
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  settings: AISettings;
  onOpenWelcome: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentCategory,
  onSelectCategory,
  counts,
  currentUser,
  onLogin,
  onLogout,
  isLoggingIn,
  settings,
  onOpenWelcome,
}) => {
  const tabs = [
    {
      id: 'Primary',
      label: 'Primary Feed',
      description: 'Important work & personal',
      icon: Inbox,
      count: counts.primary,
      unread: counts.primaryUnread,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      activeBg: 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500',
    },
    {
      id: 'Junk',
      label: 'Junk',
      description: 'Promotions, newsletters, receipts',
      icon: Trash2,
      count: counts.junk,
      unread: counts.junkUnread,
      badgeColor: 'bg-slate-700/50 text-slate-300 border-slate-600',
      activeBg: 'bg-slate-800/60 text-slate-200 border-l-2 border-slate-400',
    },
    {
      id: 'Needs Review',
      label: 'Needs Review',
      description: 'Ambiguous / low confidence',
      icon: HelpCircle,
      count: counts.review,
      unread: counts.reviewUnread,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      activeBg: 'bg-amber-950/40 text-amber-200 border-l-2 border-amber-500',
    },
  ];

  const subFilters = [
    {
      id: 'Starred',
      label: 'Starred',
      icon: Star,
      count: counts.starred,
      activeBg: 'bg-yellow-950/40 text-yellow-200 border-l-2 border-yellow-500',
    },
    {
      id: 'All',
      label: 'All Cached Mail',
      icon: Mail,
      count: counts.all,
      activeBg: 'bg-indigo-950/40 text-indigo-200 border-l-2 border-indigo-500',
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full select-none">
      {/* Top Section */}
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* User Account Card */}
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 shadow-sm">
          {currentUser ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium text-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {currentUser.displayName || 'Gmail User'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Gmail Ingest Active</span>
                </span>
                <button
                  onClick={onLogout}
                  title="Disconnect Google Account"
                  className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="text-xs font-semibold text-slate-200">Connect Your Gmail</p>
                <p className="text-[11px] text-slate-400">
                  Ingest real incoming emails & run local AI categorization
                </p>
              </div>

              {/* Official Google Sign-in button with recommended styling */}
              <button
                type="button"
                onClick={onLogin}
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-medium rounded-md shadow transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Categories Navigation */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Categories
            </span>
            <span className="text-[10px] text-slate-400 font-mono">3 Core Tabs</span>
          </div>

          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentCategory === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectCategory(tab.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-all ${
                    isActive
                      ? `${tab.activeBg} font-semibold shadow-sm`
                      : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-inherit' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <p className="text-xs truncate">{tab.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {tab.unread > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-bold">
                        {tab.unread}
                      </span>
                    )}
                    <span className={`text-[11px] px-1.5 py-0.5 rounded border ${tab.badgeColor}`}>
                      {tab.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Views */}
        <div>
          <div className="px-2 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Filters & Cache
            </span>
          </div>

          <div className="space-y-1">
            {subFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = currentCategory === filter.id;

              return (
                <button
                  key={filter.id}
                  onClick={() => onSelectCategory(filter.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all ${
                    isActive
                      ? `${filter.activeBg} font-semibold shadow-sm`
                      : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-inherit' : 'text-slate-400'}`} />
                    <span className="text-xs">{filter.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">{filter.count}</span>
                </button>
              );
            })}

            {/* Quick Guide Trigger */}
            <button
              onClick={onOpenWelcome}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-indigo-300 hover:bg-indigo-950/40 hover:text-indigo-200 transition-all border border-indigo-900/40 mt-2"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-medium">Quick Guide &amp; Tour</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info & Engine Status */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Model</span>
          </span>
          <span className="font-mono text-slate-300 px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
            {settings.provider === 'ollama' ? 'Ollama (Local)' : 'Gemini 3.8 Flash'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Storage</span>
          </span>
          <span className="text-[10px] text-slate-300">SQLite / JSON Cache</span>
        </div>

        <div className="pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center gap-1">
          <Layers className="w-3 h-3 text-slate-400" />
          <span>Never sends emails via API</span>
        </div>
      </div>
    </aside>
  );
};
