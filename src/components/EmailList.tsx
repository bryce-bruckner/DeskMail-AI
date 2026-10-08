import React, { useState } from 'react';
import { Search, Star, Sparkles, Filter, X } from 'lucide-react';
import { EmailRecord, EmailCategory } from '../types/email';

interface EmailListProps {
  emails: EmailRecord[];
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailRecord) => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentCategoryTitle: string;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  onToggleStar,
  searchQuery,
  onSearchChange,
  currentCategoryTitle,
}) => {
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);

  // Filter based on local pill toggles
  const filteredEmails = emails.filter((item) => {
    if (filterUnreadOnly && item.isRead) return false;
    if (filterStarredOnly && !item.isStarred) return false;
    return true;
  });

  const getCategoryBadge = (category: EmailCategory) => {
    switch (category) {
      case 'Primary':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
            Primary
          </span>
        );
      case 'Junk':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600 font-medium">
            Junk
          </span>
        );
      case 'Needs Review':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
            Needs Review
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string, timestamp: number) => {
    try {
      const d = new Date(timestamp || dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-80 sm:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
            <span>{currentCategoryTitle}</span>
            <span className="text-xs font-normal text-slate-400">
              ({filteredEmails.length})
            </span>
          </h2>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search subjects, senders, summaries..."
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            onClick={() => {
              setFilterUnreadOnly(false);
              setFilterStarredOnly(false);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              !filterUnreadOnly && !filterStarredOnly
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterUnreadOnly
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Unread Only
          </button>
          <button
            onClick={() => setFilterStarredOnly(!filterStarredOnly)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterStarredOnly
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Starred
          </button>
        </div>
      </div>

      {/* Email Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {filteredEmails.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2.5">
            <Filter className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs font-medium text-slate-300">No emails in {currentCategoryTitle}</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              Connect your Google account or click "Sync Now" in the top bar to ingest and categorize your live Gmail messages.
            </p>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = selectedEmailId === email.id;

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className={`p-3 cursor-pointer transition-all border-l-2 ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500'
                    : 'hover:bg-slate-850/60 border-transparent bg-slate-900/40'
                }`}
              >
                {/* Top Row: Sender & Time */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!email.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    )}
                    <span
                      className={`text-xs truncate ${
                        !email.isRead ? 'font-bold text-slate-100' : 'font-medium text-slate-300'
                      }`}
                    >
                      {email.fromName || email.from}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[11px]">
                    <span>{formatDate(email.date, email.timestamp)}</span>
                    <button
                      onClick={(e) => onToggleStar(email.id, e)}
                      title={email.isStarred ? 'Unstar email' : 'Star email'}
                      className="text-slate-400 hover:text-amber-400 transition-colors p-0.5"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Subject line */}
                <h3
                  className={`text-xs line-clamp-1 mb-1.5 ${
                    !email.isRead ? 'font-semibold text-slate-100' : 'text-slate-300'
                  }`}
                >
                  {email.subject}
                </h3>

                {/* Snippet / Summary Preview */}
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                  {email.summary ? email.summary.replace(/•\s*/g, '') : email.snippet}
                </p>

                {/* Badges footer */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    {getCategoryBadge(email.category)}
                    {email.confidenceScore && (
                      <span className="text-slate-400 font-mono">
                        {(email.confidenceScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {email.suggestedReplyBullets?.length > 0 && (
                    <span className="flex items-center gap-1 text-indigo-400 font-medium">
                      <Sparkles className="w-3 h-3" />
                      <span>{email.suggestedReplyBullets.length} reply drafts</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
