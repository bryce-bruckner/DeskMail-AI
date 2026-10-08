import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Star,
  Trash2,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import { EmailRecord, EmailCategory } from '../types/email';
import { desktopBridge } from '../lib/desktopBridge';

interface EmailDetailProps {
  email: EmailRecord | null;
  onUpdateCategory: (id: string, category: EmailCategory) => void;
  onToggleStar: (id: string) => void;
  onToggleRead: (id: string, isRead: boolean) => void;
  onDelete: (id: string) => void;
  onReanalyze: (email: EmailRecord) => void;
  isAnalyzing: boolean;
  onMarkNotJunk?: (sender: string, emailId: string) => void;
  trustedSenders?: string[];
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onUpdateCategory,
  onToggleStar,
  onToggleRead,
  onDelete,
  onReanalyze,
  isAnalyzing,
  onMarkNotJunk,
  trustedSenders = [],
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  if (!email) {
    return (
      <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center text-slate-400 p-8 select-none">
        <Mail className="w-12 h-12 text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-300">No Email Selected</h3>
        <p className="text-xs text-slate-400 max-w-sm text-center mt-1">
          Select an email from the left pane to view its AI summary, category analysis, and suggested bullet reply drafts.
        </p>
      </div>
    );
  }

  const handleCopySingle = async (text: string, index: number) => {
    const success = await desktopBridge.copyToClipboard(text);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleCopyAll = async () => {
    if (!email.suggestedReplyBullets || email.suggestedReplyBullets.length === 0) return;
    const allText = email.suggestedReplyBullets.map((b) => `• ${b}`).join('\n');
    const success = await desktopBridge.copyToClipboard(allText);
    if (success) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  const openInGmailWeb = () => {
    desktopBridge.openExternalUrl(`https://mail.google.com/mail/u/0/#inbox/${email.id}`);
  };

  const categories: EmailCategory[] = ['Primary', 'Junk', 'Needs Review'];
  const isSenderTrusted = trustedSenders.some((s) => email.from.toLowerCase().includes(s.toLowerCase()));

  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="h-12 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between shrink-0 select-none">
        {/* Category Selector & Not Junk action */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Category: {email.category}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {categoryDropdownOpen && (
              <div className="absolute left-0 mt-1 w-44 rounded-md shadow-lg bg-slate-800 border border-slate-700 z-50 py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      onUpdateCategory(email.id, cat);
                      setCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-700 ${
                      email.category === cat ? 'text-indigo-300 font-semibold bg-slate-700/50' : 'text-slate-200'
                    }`}
                  >
                    <span>{cat}</span>
                    {email.category === cat && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {email.category !== 'Primary' && (
            <button
              onClick={() => onMarkNotJunk && onMarkNotJunk(email.from, email.id)}
              title={`Move to Primary and always route future emails from ${email.from} to Primary`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-medium transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>This isn't junk</span>
            </button>
          )}

          {isSenderTrusted && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/60 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Always in Primary</span>
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Mark read / unread */}
          <button
            onClick={() => onToggleRead(email.id, !email.isRead)}
            className="px-2 py-1 rounded text-xs text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {email.isRead ? 'Mark as Unread' : 'Mark as Read'}
          </button>

          {/* Star toggle */}
          <button
            onClick={() => onToggleStar(email.id)}
            title={email.isStarred ? 'Unstar' : 'Star'}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
              }`}
            />
          </button>

          {/* Re-run AI analysis */}
          <button
            onClick={() => onReanalyze(email)}
            disabled={isAnalyzing}
            title="Re-run AI categorization & summary"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Re-analyze AI'}</span>
          </button>

          {/* Delete from cache */}
          <button
            onClick={() => onDelete(email.id)}
            title="Delete from local cache"
            className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Open in Gmail Web */}
          <button
            onClick={openInGmailWeb}
            title="Open in Gmail Web"
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <span>Gmail Web</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Main Email Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Email Header */}
        <div className="space-y-2 border-b border-slate-800 pb-4">
          <h1 className="text-lg font-bold text-slate-100 leading-snug">
            {email.subject}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600/80 text-white flex items-center justify-center font-bold text-xs">
                {(email.fromName || email.from || 'S')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-200">{email.fromName || email.from}</p>
                <p className="text-[11px] text-slate-400">&lt;{email.from}&gt;</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(email.timestamp || email.date).toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>

        {/* "This isn't junk" recommendation banner */}
        {email.category !== 'Primary' && !isSenderTrusted && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-emerald-900/60 shadow-md text-xs">
            <div className="flex items-center gap-2.5 text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-100">Not junk?</p>
                <p className="text-[11px] text-slate-400">
                  Mark emails from <strong className="text-slate-300">{email.from}</strong> to always route directly into your Primary Feed.
                </p>
              </div>
            </div>
            <button
              onClick={() => onMarkNotJunk && onMarkNotJunk(email.from, email.id)}
              className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>This isn't junk (Route to Primary)</span>
            </button>
          </div>
        )}

        {/* AI Intelligence Card (Categorization, Summary & Draft Replies) */}
        <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 p-4 shadow-lg space-y-4">
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  AI Intelligence &amp; Categorization
                </h2>
                <p className="text-[11px] text-slate-400">
                  Structured evaluation powered by {email.processedWith === 'ollama' ? 'Local Ollama' : 'Gemini 3.8 Flash'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Category: {email.category}
              </span>
              {email.confidenceScore && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Confidence: {(email.confidenceScore * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          {/* Category Reasoning */}
          {email.categoryReasoning && (
            <div className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
              <span className="font-semibold text-slate-400">Category Reasoning: </span>
              {email.categoryReasoning}
            </div>
          )}

          {/* 1-2 Sentence Core Summary & Deadlines */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Core Message &amp; Deadlines Summary:</span>
            </div>
            <div className="bg-slate-950/70 rounded-lg p-3 border border-slate-800 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {email.summary || 'Summary is being processed.'}
            </div>
          </div>

          {/* Suggested Reply Bullets & 1-Click Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Suggested Bullet-Point Draft Replies:</span>
              </span>

              {email.suggestedReplyBullets?.length > 0 && (
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[11px] font-medium transition-colors"
                >
                  {copiedAll ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAll ? 'Copied All!' : 'Copy All Bullets'}</span>
                </button>
              )}
            </div>

            {email.suggestedReplyBullets && email.suggestedReplyBullets.length > 0 ? (
              <div className="space-y-2">
                {email.suggestedReplyBullets.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors group"
                  >
                    <div className="flex items-start gap-2 text-xs text-slate-200 leading-relaxed">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{bullet}</span>
                    </div>

                    <button
                      onClick={() => handleCopySingle(bullet, idx)}
                      title="1-Click Copy this bullet point"
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-medium transition-all shadow-sm"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No draft bullets available for this email.
              </p>
            )}
          </div>

          {/* Safety Notice Banner */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/90 border border-emerald-900/40 text-[11px] text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-emerald-300">Safety Guarantee:</strong> DeskMail AI NEVER sends emails automatically. Use the 1-Click Copy button to paste suggested replies into your external email composer.
            </span>
          </div>
        </div>

        {/* Original Email Content Body */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Email Body</span>
            <span className="text-[11px] text-slate-400 font-normal">
              {email.bodyHtml ? 'HTML / Rich Text' : 'Plain Text'}
            </span>
          </div>

          <div className="rounded-lg bg-slate-900 border border-slate-800 p-4 text-xs text-slate-200 leading-relaxed">
            {email.bodyHtml ? (
              <div
                className="prose prose-invert max-w-none prose-sm overflow-x-auto text-slate-200"
                dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
              />
            ) : (
              <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
                {email.bodyText || email.snippet}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
