import React, { useState } from 'react';
import { X, Cpu, Sparkles, Check, Server, Clock, CheckCircle2, Trash2, Plus } from 'lucide-react';
import { AISettings } from '../types/email';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (newSettings: AISettings) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<AISettings>({
    ...settings,
    trustedSenders: settings.trustedSenders || [],
  });
  const [newSenderInput, setNewSenderInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSender = () => {
    if (!newSenderInput.trim()) return;
    const clean = newSenderInput.trim().toLowerCase();
    if (!formData.trustedSenders.includes(clean)) {
      setFormData({
        ...formData,
        trustedSenders: [...formData.trustedSenders, clean],
      });
    }
    setNewSenderInput('');
  };

  const handleRemoveSender = (index: number) => {
    setFormData({
      ...formData,
      trustedSenders: formData.trustedSenders.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestStatus('Testing...');
    try {
      if (formData.provider === 'ollama') {
        const res = await fetch(`${formData.ollamaUrl}/api/tags`);
        if (res.ok) {
          setTestStatus('✓ Ollama connection succeeded');
        } else {
          setTestStatus(`Failed: HTTP ${res.status}`);
        }
      } else {
        const res = await fetch('/api/health');
        const json = await res.json();
        if (json.geminiConfigured) {
          setTestStatus('✓ Gemini 3.8 Flash server-side integration active');
        } else {
          setTestStatus('Using rule-engine heuristic fallback (GEMINI_API_KEY optional)');
        }
      }
    } catch (err: any) {
      setTestStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>AI &amp; Desktop Ingestion Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* AI Provider */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 block">
              AI Categorization &amp; Drafting Engine:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, provider: 'gemini' })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  formData.provider === 'gemini'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 font-semibold shadow-xs'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs">Google Gemini</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  gemini-3.8-flash via server-side SDK
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, provider: 'ollama' })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  formData.provider === 'ollama'
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200 font-semibold shadow-xs'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs">Local Ollama</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Runs on local machine endpoint
                </p>
              </button>
            </div>
          </div>

          {/* Conditional provider inputs */}
          {formData.provider === 'ollama' && (
            <div className="space-y-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Ollama API URL:</label>
                <input
                  type="text"
                  value={formData.ollamaUrl}
                  onChange={(e) => setFormData({ ...formData, ollamaUrl: e.target.value })}
                  placeholder="http://localhost:11434"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Model Name:</label>
                <input
                  type="text"
                  value={formData.ollamaModel}
                  onChange={(e) => setFormData({ ...formData, ollamaModel: e.target.value })}
                  placeholder="llama3, mistral, qwen2.5"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {formData.provider === 'gemini' && (
            <div className="space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Gemini Model:</span>
                <span className="font-mono text-indigo-300">gemini-3.8-flash</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                High-speed structured JSON categorization, 1-2 sentence core message summaries &amp; bullet-point reply drafts.
              </p>
            </div>
          )}

          {/* Polling Interval */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Gmail Background Polling Interval:</span>
            </label>
            <select
              value={formData.pollingIntervalMinutes}
              onChange={(e) =>
                setFormData({ ...formData, pollingIntervalMinutes: parseInt(e.target.value, 10) })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value={0}>Manual Only ("Sync Now" button)</option>
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes (Recommended)</option>
              <option value={15}>Every 15 minutes</option>
            </select>
          </div>

          {/* Trusted Senders ("This isn't junk") Whitelist */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Always Primary Senders ("This isn't junk")</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {formData.trustedSenders.length} rule{formData.trustedSenders.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Emails from these senders bypass junk/promotional filters and will always route directly into your Primary Feed.
            </p>

            {/* Senders list */}
            <div className="max-h-24 overflow-y-auto space-y-1 bg-slate-950 p-2 rounded-lg border border-slate-800">
              {formData.trustedSenders.length > 0 ? (
                formData.trustedSenders.map((sender, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2 py-1 rounded bg-slate-900 border border-slate-800/80 text-[11px] text-slate-200"
                  >
                    <span className="truncate">{sender}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSender(idx)}
                      className="text-slate-400 hover:text-rose-400 transition-colors ml-2 p-0.5"
                      title="Remove sender rule"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-400 italic p-1">
                  No rules yet. Click "This isn't junk" on any email to add senders here.
                </p>
              )}
            </div>

            {/* Add manual sender */}
            <div className="flex gap-1.5 pt-0.5">
              <input
                type="text"
                value={newSenderInput}
                onChange={(e) => setNewSenderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSender();
                  }
                }}
                placeholder="e.g. colleague@company.com"
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSender}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-colors"
              >
                Add Sender
              </button>
            </div>
          </div>

          {/* Test connection & status */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
            >
              Test Connection
            </button>
            {testStatus && (
              <span className="text-[11px] text-indigo-300 truncate max-w-[200px]">
                {testStatus}
              </span>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
