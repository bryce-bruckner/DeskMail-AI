# DeskMail AI — Desktop Email Manager

A modern, desktop-grade email manager built with **Node.js, Express, TypeScript, and React**. DeskMail AI integrates securely with the **Gmail API** (read-only), automatically sorts incoming messages into a streamlined 3-tab inbox, generates concise summaries with deadline highlights, and provides one-click copyable draft reply bullet points.

---

## 🌟 Key Features

- **📬 3-Tab Smart Inbox Triage**:
  - **Primary Feed**: Urgent tasks, executive requests, client communications, and deadlines.
  - **Junk**: Promotional blasts, retail discounts, newsletters, and automated billing receipts.
  - **Needs Review**: Ambiguous reach-outs and low-confidence messages requiring human verification.
- **🛡️ "This Isn't Junk" Sender Whitelisting**:
  - Mark any misclassified email as not junk with a single click.
  - Automatically moves the message to **Primary** and adds the sender to a persistent whitelist so all future emails from them route directly to your Primary Feed.
  - Manage trusted sender rules anytime in Settings.
- **✨ AI Summaries & Draft Reply Bullets**:
  - Structured 1–2 sentence summaries highlighting core takeaways and actionable deadlines.
  - 2–3 ready-to-use bullet-point response outlines with a **1-Click "Copy to Clipboard"** button.
  - **Safety Guarantee**: DeskMail AI never automatically sends emails via the API.
- **🔌 Multi-Provider AI Support**:
  - **Google Gemini 3.8 Flash**: Cloud evaluation via server-side `@google/genai` with built-in sliding-window rate limiting.
  - **Local Ollama**: Run completely offline/locally via `http://localhost:11434` (`llama3`, `mistral`, `qwen2.5`).
  - **High-Precision Heuristic Fallback**: Zero downtime or dropped emails during rate-limit cooldowns.
- **💾 Offline-First Local Storage**:
  - File-backed local database (`data/emails_store.json`) with client-side persistence for instant loading without network delays.
  - Local database export (JSON / SQLite schema backup) and cache clearing tools.
- **🖥️ Desktop Window Experience & Electron Architecture**:
  - macOS/Windows styled titlebar with window controls, network status, and sync indicators.
  - Production-ready Electron `contextBridge` preload script (`src/electron/preload.ts`) and main process loopback OAuth server pattern (`src/electron/main.ts`).
  - First-time user welcome guide and quick onboarding tour.

---

## 🏗️ Architecture Overview

```text
├── src/
│   ├── components/         # Desktop UI components
│   │   ├── TitleBar.tsx     # Window controls, sync status, quick actions
│   │   ├── Sidebar.tsx      # Account card, 3-tab navigation, category counters
│   │   ├── EmailList.tsx    # Search, filters (unread, starred), message items
│   │   ├── EmailDetail.tsx  # Message view, AI summary, "This isn't junk" action, draft replies
│   │   ├── WelcomeModal.tsx # Onboarding tour for first-time users
│   │   ├── SettingsModal.tsx# AI provider (Gemini/Ollama), sync polling & sender rules
│   │   └── CacheInspectorModal.tsx # DB backup export & cache management
│   ├── electron/           # Electron main & preload contextBridge
│   │   ├── main.ts          # Window lifecycle & local OAuth callback server
│   │   └── preload.ts       # Secure contextBridge IPC adapter
│   ├── lib/
│   │   ├── desktopBridge.ts # Unified bridge (Electron IPC or Express backend)
│   │   └── firebase.ts      # Client Google OAuth (in-memory access tokens)
│   ├── types/
│   │   └── email.ts         # TypeScript models (EmailRecord, AISettings, etc.)
│   ├── App.tsx             # Root desktop application layout & state
│   └── main.tsx            # React 19 entry point
├── server.ts               # Full-stack Express backend & Vite middleware
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v20+ or **Bun**
- A Google Cloud / Firebase project with **Gmail API** enabled (OAuth scope: `https://www.googleapis.com/auth/gmail.readonly`)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/deskmail-ai.git
cd deskmail-ai
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:

```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

*(Note: Gemini API calls run strictly on the Node.js backend. If no API key is provided, the app seamlessly uses its deterministic rule engine or local Ollama endpoint.)*

### 4. Running the Development Server
Launch the unified full-stack server (Express + Vite on Port 3000):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 Usage Guide

1. **Connect Gmail**: Click **"Sign in with Google"** in the left sidebar to authenticate read-only access.
2. **Ingest Emails**: Click **"Sync Now"** in the top titlebar. The backend fetches unread/inbox messages, evaluates them with AI, and stores them in your local database.
3. **Review & Triage**:
   - Check **Primary Feed** for high-priority communications.
   - Check **Junk** for receipts and newsletters.
   - Check **Needs Review** for ambiguous items.
4. **"This Isn't Junk"**:
   - If an email was routed to Junk or Needs Review by mistake, click **"This isn't junk"**.
   - DeskMail AI immediately moves the email to Primary and whitelists the sender for all future syncs.
5. **Draft Responses**:
   - Inspect the **Suggested Bullet-Point Draft Replies** in the email detail view.
   - Click **"Copy"** next to any bullet to paste it into your external email client.
6. **Offline Reading**:
   - All previously synced emails remain accessible and searchable even when disconnected.

---

## 🔒 Security & Privacy

- **Read-Only Scope**: Only requests `gmail.readonly`. The application has no permission to send, delete, or modify emails in your Gmail account.
- **In-Memory Tokens**: OAuth access tokens are kept in memory and never written to unencrypted browser storage.
- **Local Persistence**: Email content and settings are saved locally on your own machine in `data/emails_store.json`.
- **Zero Autonomous Sending**: DeskMail AI never sends emails automatically—suggested replies are strictly outlines for user review.

---

## 🛠️ Scripts

- `npm run dev`: Starts the Express server with Vite middlewares mounted.
- `npm run build`: Compiles TypeScript and creates the production Vite bundle in `dist/`.
- `npm run lint`: Runs `tsc --noEmit` to validate all TypeScript types.
- `npm start`: Runs the production server via `tsx server.ts`.

---

## 📄 License

Apache-2.0 License.
