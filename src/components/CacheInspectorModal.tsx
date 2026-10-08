import React, { useState } from 'react';
import { X, Database, Download, RotateCcw, HardDrive, Check, Layers } from 'lucide-react';
import { CacheStats } from '../types/email';

interface CacheInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: CacheStats | null;
  onClearCache: () => Promise<void>;
}

export const CacheInspectorModal: React.FC<CacheInspectorModalProps> = ({
  isOpen,
  onClose,
  stats,
  onClearCache,
}) => {
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/emails');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deskmail-cache-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    await onClearCache();
    setIsResetting(false);
    setConfirmClear(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Local Database &amp; Cache Persistence</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Estimated Local DB Size:</span>
              </span>
              <span className="font-mono text-cyan-300">{stats?.dbSizeEstimate || 'Loading...'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400">Total Stored Emails:</span>
              <span className="font-semibold">{stats?.totalEmails ?? 0}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="p-2 bg-slate-900 rounded border border-emerald-950 text-center">
                <p className="text-emerald-400 font-bold">{stats?.primaryCount ?? 0}</p>
                <p className="text-slate-400 text-[10px]">Primary</p>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-slate-800 text-center">
                <p className="text-slate-300 font-bold">{stats?.junkCount ?? 0}</p>
                <p className="text-slate-400 text-[10px]">Junk</p>
              </div>
              <div className="p-2 bg-slate-900 rounded border border-amber-950 text-center">
                <p className="text-amber-400 font-bold">{stats?.reviewCount ?? 0}</p>
                <p className="text-slate-400 text-[10px]">Needs Review</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <p className="flex items-center gap-1 text-slate-300 font-medium">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Offline Architecture Guarantee:</span>
            </p>
            <p>
              All email headers, bodies, summaries, and generated bullet reply drafts are stored locally on your device in the SQLite/JSON local store with offline browser mirroring.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleExportJson}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isExporting ? 'Exporting...' : 'Export Local Database (JSON / SQLite Schema)'}</span>
            </button>

            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={isResetting}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-300 font-medium transition-colors border border-rose-900/60"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Local Cached Emails</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 space-y-2">
                <p className="text-[11px] text-rose-200 text-center font-medium">
                  Clear all emails stored in local cache?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isResetting}
                    className="flex-1 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
                  >
                    {isResetting ? 'Clearing...' : 'Confirm Clear'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
