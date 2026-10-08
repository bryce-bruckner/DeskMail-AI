import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_SEED_EMAILS } from './src/data/seedEmails.js';
import { EmailRecord, EmailCategory, AISettings, AIAnalysisResult } from './src/types/email.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Local persistent database directories
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'emails_store.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default settings
const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  geminiModel: 'gemini-3.8-flash',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  autoProcessNewEmails: true,
  pollingIntervalMinutes: 5,
  trustedSenders: [],
};

// Database helper functions
function readEmailsFromDb(): EmailRecord[] {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_SEED_EMAILS, null, 2), 'utf-8');
      return INITIAL_SEED_EMAILS;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading emails database:', err);
    return INITIAL_SEED_EMAILS;
  }
}

function writeEmailsToDb(emails: EmailRecord[]): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(emails, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing emails database:', err);
  }
}

function readSettingsFromDb(): AISettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      return DEFAULT_SETTINGS;
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      trustedSenders: Array.isArray(parsed.trustedSenders) ? parsed.trustedSenders : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettingsToDb(settings: AISettings): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing settings:', err);
  }
}

// Gemini AI Client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Rate Limiter to stay within Gemini free tier limits (5 requests per minute)
const GEMINI_RPM_LIMIT = 4;
const geminiRequestTimestamps: number[] = [];
let rateLimitCoolOffUntil = 0;

function canMakeGeminiRequest(): boolean {
  const now = Date.now();
  if (now < rateLimitCoolOffUntil) return false;

  // Prune timestamps older than 60 seconds
  while (geminiRequestTimestamps.length > 0 && geminiRequestTimestamps[0] < now - 60000) {
    geminiRequestTimestamps.shift();
  }

  return geminiRequestTimestamps.length < GEMINI_RPM_LIMIT;
}

function recordGeminiRequest(): void {
  geminiRequestTimestamps.push(Date.now());
}

// AI Categorization Engine
async function analyzeEmailWithAI(
  email: { subject: string; from: string; bodyText: string; snippet?: string },
  settings: AISettings
): Promise<AIAnalysisResult> {
  const normalizedFrom = email.from.toLowerCase();
  const isTrustedSender = settings.trustedSenders?.some((trusted) => {
    const t = trusted.trim().toLowerCase();
    return t && (normalizedFrom.includes(t) || normalizedFrom === t);
  });

  const rawResult = await computeRawAnalysis(email, settings);

  if (isTrustedSender) {
    return {
      ...rawResult,
      category: 'Primary',
      confidence_score: 1.0,
      reasoning: 'Sender is on your "This isn\'t junk" trusted list (always routed to Primary).',
    };
  }

  return rawResult;
}

async function computeRawAnalysis(
  email: { subject: string; from: string; bodyText: string; snippet?: string },
  settings: AISettings
): Promise<AIAnalysisResult> {
  const { subject, from, bodyText, snippet } = email;
  const content = `Subject: ${subject}
From: ${from}
Snippet: ${snippet || ''}
Content:
${bodyText.slice(0, 3000)}`;

  // 1. Try Ollama if selected
  if (settings.provider === 'ollama') {
    try {
      const prompt = `You are a desktop email categorization and draft reply assistant.
Classify the following email into one of 3 exact categories:
- "Primary": Important personal or work communications requiring human attention or action.
- "Junk": Promotional emails, newsletters, marketing blasts, retail sales, spam, or routine automated receipts.
- "Needs Review": Ambiguous emails where category confidence is uncertain or mixed personal/work inquiries.

Return ONLY a valid JSON object with the following schema:
{
  "category": "Primary" | "Junk" | "Needs Review",
  "summary": "1-2 sentence bullet points summarizing core message & deadlines",
  "suggested_reply_bullets": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "confidence_score": 0.85,
  "reasoning": "brief explanation"
}

Email:
${content}`;

      const ollamaRes = await fetch(`${settings.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.ollamaModel || 'llama3',
          prompt,
          format: 'json',
          stream: false,
        }),
      });

      if (ollamaRes.ok) {
        const json = await ollamaRes.json();
        const parsed = JSON.parse(json.response);
        return {
          category: parsed.category || 'Needs Review',
          summary: parsed.summary || 'Summary unavailable.',
          suggested_reply_bullets: parsed.suggested_reply_bullets || ['Acknowledge email.'],
          confidence_score: parsed.confidence_score || 0.8,
          reasoning: parsed.reasoning || 'Categorized via local Ollama.',
        };
      }
    } catch (ollamaErr) {
      console.warn('Ollama request failed, falling back to Gemini/rules:', ollamaErr);
    }
  }

  // 2. Try Gemini API with Rate-Limit & Quota Guard
  if (canMakeGeminiRequest()) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        recordGeminiRequest();
        const generatePromise = ai.models.generateContent({
          model: settings.geminiModel || 'gemini-3.8-flash',
          contents: `You are an elite desktop email manager AI.
Analyze this email and provide structured classification, concise summary, and bullet-point draft reply suggestions.

Requirements:
1. Category must strictly be one of:
   - "Primary": High priority personal or work communications, urgent tasks, direct client questions, executive requests.
   - "Junk": Promotional emails, newsletters, marketing blasts, discount coupons, automated receipts.
   - "Needs Review": Ambiguous emails with uncertain category or mixed signals.
2. Summary: 1-2 sentence bullet points highlighting the core message, actionable requests, and deadlines.
3. Suggested reply bullets: 2-3 concise, actionable bullet points that the user can copy into an external email composer.
4. Confidence score: between 0.0 and 1.0.

Email to analyze:
${content}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: {
                  type: Type.STRING,
                  description: 'Primary, Junk, or Needs Review',
                },
                summary: {
                  type: Type.STRING,
                  description: '1-2 sentence bullet points summarizing core message & deadlines',
                },
                suggested_reply_bullets: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Bullet-point suggested draft replies',
                },
                confidence_score: {
                  type: Type.NUMBER,
                  description: 'Confidence between 0.0 and 1.0',
                },
                reasoning: {
                  type: Type.STRING,
                  description: 'Brief reason for the categorization',
                },
              },
              required: ['category', 'summary', 'suggested_reply_bullets'],
            },
          },
        });

        // 14-second safety timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 14000)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);

        const responseText = response.text?.trim();
        if (responseText) {
          const parsed = JSON.parse(responseText);
          let category: EmailCategory = 'Needs Review';
          if (parsed.category === 'Primary' || parsed.category === 'Junk' || parsed.category === 'Needs Review') {
            category = parsed.category;
          } else if (parsed.category?.toLowerCase().includes('primary')) {
            category = 'Primary';
          } else if (parsed.category?.toLowerCase().includes('junk')) {
            category = 'Junk';
          }

          return {
            category,
            summary: parsed.summary || 'Summary generated.',
            suggested_reply_bullets: Array.isArray(parsed.suggested_reply_bullets)
              ? parsed.suggested_reply_bullets
              : ['Acknowledge email.'],
            confidence_score: parsed.confidence_score ?? 0.92,
            reasoning: parsed.reasoning || 'Categorized with Gemini 3.8 Flash.',
          };
        }
      } catch (geminiErr: any) {
        const errMsg = geminiErr?.message || String(geminiErr);
        if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn('[AI Engine] Rate limit reached. Backing off for 15s; falling back to heuristic engine.');
          rateLimitCoolOffUntil = Date.now() + 15000;
        } else if (errMsg.includes('timeout')) {
          console.warn('[AI Engine] Request timed out; falling back to heuristic engine.');
        } else {
          console.warn('[AI Engine] Non-fatal Gemini error, falling back to heuristic engine:', errMsg);
        }
      }
    }
  }

  // 3. Fallback Heuristic Rule Engine
  return fallbackRuleEngine(email);
}

// High-precision heuristic fallback engine
function fallbackRuleEngine(email: { subject: string; from: string; bodyText: string }): AIAnalysisResult {
  const text = `${email.subject} ${email.from} ${email.bodyText}`.toLowerCase();
  
  const junkTriggers = [
    'unsubscribe', 'opt-out', 'newsletter', 'flash sale', 'discount', 'percent off',
    'promo', 'marketing', 'receipt for', 'invoice #', 'order confirmation', 'deals', 'special offer'
  ];
  const primaryTriggers = [
    'urgent', 'deadline', 'sign-off', 'contract', 'proposal', 'asap', 'meeting tomorrow',
    'review needed', 'approval', 'confidential', 'roadmap', 'schedule a call'
  ];

  const hasJunk = junkTriggers.some((kw) => text.includes(kw));
  const hasPrimary = primaryTriggers.some((kw) => text.includes(kw));

  if (hasJunk && !hasPrimary) {
    return {
      category: 'Junk',
      summary: `• Promotional or automated message from ${email.from.split('@')[0]}.`,
      suggested_reply_bullets: [
        'No response required (automated notice or marketing blast).',
        'Unsubscribe if no longer relevant.'
      ],
      confidence_score: 0.9,
      reasoning: 'Identified promotional keywords or automated receipts.',
    };
  }

  if (hasPrimary && !hasJunk) {
    return {
      category: 'Primary',
      summary: `• Direct communication regarding "${email.subject}" requiring review or timely response.`,
      suggested_reply_bullets: [
        'Confirm receipt and state that a detailed response is being prepared.',
        'Acknowledge timeline and propose next steps.'
      ],
      confidence_score: 0.88,
      reasoning: 'Contains actionable work keywords and priority requests.',
    };
  }

  return {
    category: 'Needs Review',
    summary: `• Incoming email regarding "${email.subject}". Review sender and context to determine priority.`,
    suggested_reply_bullets: [
      'Thank sender for reaching out and request additional details.',
      'Acknowledge email and set expectation on next response.'
    ],
    confidence_score: 0.6,
    reasoning: 'Ambiguous or mixed sender context; manual verification suggested.',
  };
}

// ----------------- API ROUTES ----------------- //

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Get all cached emails
app.get('/api/emails', (req: Request, res: Response) => {
  const { category, search, unread, starred } = req.query;
  let emails = readEmailsFromDb();

  if (category && category !== 'All') {
    emails = emails.filter((e) => e.category === category);
  }

  if (unread === 'true') {
    emails = emails.filter((e) => !e.isRead);
  }

  if (starred === 'true') {
    emails = emails.filter((e) => e.isStarred);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    emails = emails.filter(
      (e) =>
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        e.fromName.toLowerCase().includes(q) ||
        e.snippet.toLowerCase().includes(q) ||
        e.bodyText.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q)
    );
  }

  // Sort descending by timestamp
  emails.sort((a, b) => b.timestamp - a.timestamp);

  res.json(emails);
});

// Update or save email
app.post('/api/emails/save', (req: Request, res: Response) => {
  const email: EmailRecord = req.body;
  if (!email || !email.id) {
    return res.status(400).json({ error: 'Invalid email payload' });
  }

  const emails = readEmailsFromDb();
  const index = emails.findIndex((e) => e.id === email.id);
  if (index >= 0) {
    emails[index] = { ...emails[index], ...email };
  } else {
    emails.unshift(email);
  }

  writeEmailsToDb(emails);
  res.json({ success: true, email });
});

// Manually update email category
app.post('/api/emails/:id/category', (req: Request, res: Response) => {
  const { id } = req.params;
  const { category } = req.body;

  if (!['Primary', 'Junk', 'Needs Review'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const emails = readEmailsFromDb();
  const email = emails.find((e) => e.id === id);
  if (!email) {
    return res.status(404).json({ error: 'Email not found' });
  }

  email.category = category as EmailCategory;
  email.confidenceScore = 1.0;
  email.categoryReasoning = `Manually categorized as ${category} by user.`;
  writeEmailsToDb(emails);

  res.json({ success: true, email });
});

// Mark read/unread
app.post('/api/emails/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const { isRead } = req.body;

  const emails = readEmailsFromDb();
  const email = emails.find((e) => e.id === id);
  if (!email) {
    return res.status(404).json({ error: 'Email not found' });
  }

  email.isRead = isRead ?? true;
  writeEmailsToDb(emails);
  res.json({ success: true, email });
});

// Toggle star
app.post('/api/emails/:id/star', (req: Request, res: Response) => {
  const { id } = req.params;
  const { isStarred } = req.body;

  const emails = readEmailsFromDb();
  const email = emails.find((e) => e.id === id);
  if (!email) {
    return res.status(404).json({ error: 'Email not found' });
  }

  email.isStarred = isStarred !== undefined ? isStarred : !email.isStarred;
  writeEmailsToDb(emails);
  res.json({ success: true, email });
});

// Delete email from cache
app.delete('/api/emails/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let emails = readEmailsFromDb();
  emails = emails.filter((e) => e.id !== id);
  writeEmailsToDb(emails);
  res.json({ success: true });
});

// Run AI analysis on an email
app.post('/api/ai/categorize', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email data' });
    }

    const settings = readSettingsFromDb();
    const result = await analyzeEmailWithAI(email, settings);
    res.json(result);
  } catch (err: any) {
    console.error('Categorization error:', err);
    res.status(500).json({ error: err.message || 'Categorization failed' });
  }
});

// Settings endpoints
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(readSettingsFromDb());
});

app.post('/api/settings', (req: Request, res: Response) => {
  const updated: AISettings = req.body;
  writeSettingsToDb(updated);
  res.json({ success: true, settings: updated });
});

// Whitelist sender as "This isn't junk" (always route to Primary)
app.post('/api/senders/trust', (req: Request, res: Response) => {
  const { sender } = req.body;
  if (!sender || typeof sender !== 'string') {
    return res.status(400).json({ error: 'Sender required' });
  }

  const cleanSender = sender.trim().toLowerCase();
  const settings = readSettingsFromDb();
  if (!settings.trustedSenders.some((s) => s.toLowerCase() === cleanSender)) {
    settings.trustedSenders.push(cleanSender);
    writeSettingsToDb(settings);
  }

  // Retroactively move all emails from this sender to Primary
  const emails = readEmailsFromDb();
  let updatedCount = 0;
  emails.forEach((e) => {
    if (e.from.toLowerCase().includes(cleanSender)) {
      e.category = 'Primary';
      e.confidenceScore = 1.0;
      e.categoryReasoning = `Sender is on your "This isn't junk" trusted list (routed to Primary).`;
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    writeEmailsToDb(emails);
  }

  res.json({
    success: true,
    trustedSenders: settings.trustedSenders,
    updatedCount,
  });
});

// Remove sender from trusted whitelist
app.post('/api/senders/untrust', (req: Request, res: Response) => {
  const { sender } = req.body;
  if (!sender || typeof sender !== 'string') {
    return res.status(400).json({ error: 'Sender required' });
  }

  const cleanSender = sender.trim().toLowerCase();
  const settings = readSettingsFromDb();
  settings.trustedSenders = settings.trustedSenders.filter((s) => s.toLowerCase() !== cleanSender);
  writeSettingsToDb(settings);

  res.json({
    success: true,
    trustedSenders: settings.trustedSenders,
  });
});

// Cache stats endpoint
app.get('/api/cache/stats', (req: Request, res: Response) => {
  const emails = readEmailsFromDb();
  let fileSize = '0 KB';
  try {
    if (fs.existsSync(DB_FILE)) {
      const stats = fs.statSync(DB_FILE);
      fileSize = `${(stats.size / 1024).toFixed(1)} KB`;
    }
  } catch {}

  const stats = {
    totalEmails: emails.length,
    primaryCount: emails.filter((e) => e.category === 'Primary').length,
    junkCount: emails.filter((e) => e.category === 'Junk').length,
    reviewCount: emails.filter((e) => e.category === 'Needs Review').length,
    unreadCount: emails.filter((e) => !e.isRead).length,
    starredCount: emails.filter((e) => e.isStarred).length,
    aiProcessedCount: emails.filter((e) => e.processedWith !== 'seed').length,
    lastSyncedAt: new Date().toISOString(),
    dbSizeEstimate: fileSize,
  };

  res.json(stats);
});

// Reset cache to seed data
app.post('/api/cache/reset', (req: Request, res: Response) => {
  writeEmailsToDb(INITIAL_SEED_EMAILS);
  res.json({ success: true, count: INITIAL_SEED_EMAILS.length });
});

// Ingest from Gmail API
app.post('/api/gmail/ingest', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  const settings = readSettingsFromDb();

  try {
    // 1. Fetch message list from Gmail (batch of 8 to ensure quota safety)
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=in:inbox',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      return res.status(listRes.status).json({ error: `Gmail API error: ${errText}` });
    }

    const listData = await listRes.json();
    const messageStubs = listData.messages || [];

    const existingEmails = readEmailsFromDb();
    const existingIds = new Set(existingEmails.map((e) => e.id));
    const newEmails: EmailRecord[] = [];

    // Helper to decode Gmail base64url body
    function decodeBase64Url(data?: string): string {
      if (!data) return '';
      try {
        const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(normalized, 'base64').toString('utf-8');
      } catch {
        return '';
      }
    }

    // Helper to extract email body
    function extractBody(payload: any): { text: string; html?: string } {
      let text = '';
      let html = '';

      if (payload.body && payload.body.data) {
        if (payload.mimeType === 'text/html') {
          html = decodeBase64Url(payload.body.data);
        } else {
          text = decodeBase64Url(payload.body.data);
        }
      }

      if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            text += decodeBase64Url(part.body.data) + '\n';
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            html += decodeBase64Url(part.body.data) + '\n';
          } else if (part.parts) {
            const nested = extractBody(part);
            text += nested.text;
            if (nested.html) html += nested.html;
          }
        }
      }

      return { text: text.trim(), html: html.trim() || undefined };
    }

    for (const stub of messageStubs) {
      // Check if already in cache
      if (existingIds.has(stub.id)) continue;

      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${stub.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!msgRes.ok) continue;

        const msg = await msgRes.json();
        const headers: Record<string, string> = {};
        for (const h of msg.payload?.headers || []) {
          headers[h.name.toLowerCase()] = h.value;
        }

        const subject = headers['subject'] || '(No Subject)';
        const from = headers['from'] || 'Unknown Sender';
        const to = headers['to'] || '';
        const dateStr = headers['date'] || new Date().toISOString();
        const timestamp = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now();
        const snippet = msg.snippet || '';

        // Extract name from "John Doe <john@doe.com>"
        let fromName = from;
        const nameMatch = from.match(/^([^<]+)<.*>$/);
        if (nameMatch) {
          fromName = nameMatch[1].trim().replace(/^["']|["']$/g, '');
        }

        const { text: bodyText, html: bodyHtml } = extractBody(msg.payload || {});

        // AI Categorization & Summarization
        const aiResult = await analyzeEmailWithAI(
          {
            subject,
            from,
            bodyText: bodyText || snippet,
            snippet,
          },
          settings
        );

        const newEmail: EmailRecord = {
          id: msg.id,
          threadId: msg.threadId || msg.id,
          subject,
          from,
          fromName,
          to,
          date: dateStr,
          timestamp,
          snippet,
          bodyText: bodyText || snippet,
          bodyHtml,
          category: aiResult.category,
          confidenceScore: aiResult.confidence_score,
          categoryReasoning: aiResult.reasoning,
          summary: aiResult.summary,
          suggestedReplyBullets: aiResult.suggested_reply_bullets,
          isRead: !msg.labelIds?.includes('UNREAD'),
          isStarred: !!msg.labelIds?.includes('STARRED'),
          processedWith: settings.provider === 'ollama' ? 'ollama' : 'gemini',
          processedAt: new Date().toISOString(),
          labels: msg.labelIds || ['INBOX'],
        };

        newEmails.push(newEmail);
      } catch (msgErr) {
        console.error(`Failed to fetch message ${stub.id}:`, msgErr);
      }
    }

    // Merge and persist
    const allEmails = [...newEmails, ...existingEmails];
    writeEmailsToDb(allEmails);

    res.json({
      success: true,
      ingestedCount: newEmails.length,
      totalCount: allEmails.length,
      newEmails,
    });
  } catch (err: any) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: err.message || 'Ingestion failed' });
  }
});

// Setup Vite middleware in dev OR static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`DeskMail Desktop Manager running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
