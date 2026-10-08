export type EmailCategory = 'Primary' | 'Junk' | 'Needs Review';

export interface EmailRecord {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string;
  to: string;
  date: string;
  timestamp: number;
  snippet: string;
  bodyText: string;
  bodyHtml?: string;
  category: EmailCategory;
  confidenceScore?: number; // 0 to 1
  categoryReasoning?: string;
  summary: string; // 1-2 sentences highlighting core message & deadlines
  suggestedReplyBullets: string[]; // Bullet-point draft replies
  isRead: boolean;
  isStarred: boolean;
  processedWith: 'gemini' | 'ollama' | 'rule-engine' | 'seed';
  processedAt: string;
  labels: string[];
}

export interface AIAnalysisResult {
  category: EmailCategory;
  summary: string;
  suggested_reply_bullets: string[];
  confidence_score?: number;
  reasoning?: string;
}

export interface AISettings {
  provider: 'gemini' | 'ollama';
  geminiModel: string;
  ollamaUrl: string;
  ollamaModel: string;
  autoProcessNewEmails: boolean;
  pollingIntervalMinutes: number; // 0 for manual only
  trustedSenders: string[]; // Senders marked as "This isn't junk" that should always route to Primary
}

export interface CacheStats {
  totalEmails: number;
  primaryCount: number;
  junkCount: number;
  reviewCount: number;
  unreadCount: number;
  starredCount: number;
  lastSyncedAt: string | null;
  dbSizeEstimate: string;
  aiProcessedCount: number;
}
