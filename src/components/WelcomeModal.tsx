import React from 'react';
import {
  Sparkles,
  Inbox,
  ShieldCheck,
  Copy,
  HardDrive,
  ArrowRight,
  CheckCircle2,
  X,
  Mail,
  HelpCircle,
  Trash2,
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectGoogle: () => void;
  isLoggedIn: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  onConnectGoogle,
  isLoggedIn,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 p-6 border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Welcome to DeskMail AI
              </h2>
              <p className="text-xs text-indigo-300">
                Desktop-grade Gmail manager with AI categorization, summaries &amp; reply drafts
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200">
          {/* Main Value Proposition */}
          <p className="text-xs text-slate-300 leading-relaxed">
            DeskMail AI organizes your incoming Gmail messages into three actionable categories, generates concise bullet-point summaries with deadlines, and creates suggested reply drafts you can copy into your email composer with one click.
          </p>

          {/* Core Features Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Core Capabilities
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Feature 1 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <Inbox className="w-4 h-4 shrink-0" />
                  <span>3-Tab Inbox</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatically sorts mail into <strong>Primary Feed</strong>, <strong>Junk</strong> (promos, receipts), and <strong>Needs Review</strong>.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>AI Summaries &amp; Drafts</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Extracts core messages and deadlines in 1–2 bullet sentences, plus suggested replies with a 1-click copy button.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                  <HardDrive className="w-4 h-4 shrink-0" />
                  <span>Offline-First Store</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Emails and drafts are saved locally in a persistent file database for high-speed offline reading.
                </p>
              </div>
            </div>
          </div>

          {/* Where to Start - Step by Step */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Where to Start
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Connect your Google account</p>
                  <p className="text-[11px] text-slate-400">
                    Use the official Google sign-in button in the left sidebar to grant read-only access to your Gmail.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Sync and ingest messages</p>
                  <p className="text-[11px] text-slate-400">
                    Click <strong>Sync Now</strong> in the top titlebar to fetch and automatically categorize your inbox.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-slate-200">Review summaries and copy replies</p>
                  <p className="text-[11px] text-slate-400">
                    Click any email to inspect its AI breakdown and click <strong>Copy</strong> next to any suggested bullet point.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-[11px] text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Zero Auto-Sending:</strong> DeskMail AI never sends emails on your behalf. All replies are strictly suggestions for you to review and copy.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Explore App
          </button>

          {!isLoggedIn ? (
            <button
              onClick={() => {
                onClose();
                onConnectGoogle();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
            >
              <span>Connect Gmail Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Gmail Connected • Get Started</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
