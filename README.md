# Whispr — AI-Powered Interview Preparation Platform

**Practice smarter. Interview with confidence.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-interview--woad--rho.vercel.app-black?style=flat-square)](https://interview-woad-rho.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-ZarmanSattar%2FWhispr-181717?style=flat-square&logo=github)](https://github.com/ZarmanSattar/Whispr)

---

## Overview

Whispr is a full-stack AI-powered interview preparation platform built for job seekers who want structured, personalized practice. It combines a web-based mock interview system with a real-time browser extension, giving users two distinct tools for two distinct moments: preparation before the interview and support during it.

**Prepare Mode** lets users generate AI-tailored question sets based on their target role, tech stack, and experience level. Users speak their answers aloud and receive immediate AI scoring (0–100) with detailed feedback on technical accuracy, clarity, depth, and confidence. Sessions are saved to a dashboard with history, progress tracking, and role-specific insights.

**Live Mode** is a Chrome extension that injects a floating overlay into any browser tab. During a live interview, users hold a keyboard shortcut to record audio, which is transcribed and answered by an AI in seconds — visible only to them. The overlay is designed to be unobtrusive, drag-and-drop repositionable, and fully dismissible, acting as a silent real-time co-pilot.

---

## Features

### Prepare Mode

- AI-generated interview questions tailored to role, tech stack, and experience level
- Voice recording with browser-native `MediaRecorder` API
- Real-time AI scoring and structured feedback (0–100 scale)
- Multi-dimensional scoring: technical accuracy, clarity, depth, and confidence
- Difficulty levels: Easy, Medium, Hard
- Per-question hints and 120-second countdown timer
- Skip questions (scored as 0, no AI call made)
- Detailed feedback page with strengths, weaknesses, and practice recommendations
- Session history with average scores, filters, and progress tracking
- Account page with resume upload, education history, and personal statistics

### Live Mode (Chrome Extension) ⚡

- Floating overlay injected into any browser page — invisible to screen share
- Push-to-hold recording with `Ctrl+Shift+X`
- Real-time audio transcription via Deepgram nova-2 (proxied through backend)
- AI-generated answers via Groq LLaMA 3.3 70B, streamed word by word
- Session code authentication — links the extension to your dashboard session
- Automatic session health checks — disconnects gracefully when a session ends
- Keyboard shortcuts:

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+X` (hold) | Record audio |
| `Ctrl+Shift+H` | Hide / Show overlay |
| `Ctrl+Shift+Q` | Clear overlay |

---

## Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack React framework |
| Language | TypeScript | Type safety across the codebase |
| Styling | Tailwind CSS | Utility-first UI styling |
| Authentication | Clerk v7 | User auth, session management, metadata storage |
| Database | PostgreSQL (Neon) | Serverless relational database |
| ORM | Drizzle ORM | Type-safe SQL queries and schema management |
| LLM | Groq API — LLaMA 3.3 70B | Question generation, answer evaluation, live answers |
| Transcription | Deepgram nova-2 | Speech-to-text for both modes |
| Deployment | Vercel | Hosting and CI/CD |
| Extension | Chrome Manifest V3 | Browser extension platform |

---

## Project Structure

```
whispr/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Sign in, Sign up pages
│   │   ├── (root)/
│   │   │   └── dashboard/           # Main app pages
│   │   │       ├── page.tsx         # Dashboard home
│   │   │       ├── new/             # New interview setup
│   │   │       ├── live/            # Live Mode session management
│   │   │       ├── interview/[id]/  # Active interview page
│   │   │       │   └── feedback/    # Post-session feedback
│   │   │       └── account/         # Profile, resume, education
│   │   ├── api/                     # API routes
│   │   │   ├── interviews/          # Question generation and answer scoring
│   │   │   ├── live/                # Live session, transcription, answers
│   │   │   ├── resume/              # Resume upload and parsing
│   │   │   └── education/           # Education CRUD
│   │   └── page.tsx                 # Landing page
│   └── lib/
│       ├── db.ts                    # Drizzle + Neon connection
│       └── schema.ts                # Database schema
├── extension/                       # Chrome extension source files
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.js
│   └── popup.html
└── public/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech) recommended)
- [Clerk](https://clerk.com) account
- [Groq](https://console.groq.com) API key
- [Deepgram](https://deepgram.com) API key

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
DATABASE_URL=
GROQ_API_KEY=
DEEPGRAM_API_KEY=
```

### Installation

```bash
git clone https://github.com/ZarmanSattar/Whispr.git
cd Whispr
npm install
cp .env.example .env.local
# Fill in your environment variables
npx drizzle-kit push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Chrome Extension Setup 🧩

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer Mode** using the toggle in the top-right corner
3. Click **Load unpacked**
4. Select the `extension/` folder from this repository
5. Pin the Whispr extension to your toolbar
6. Go to your Whispr dashboard and start a **Live Mode** session
7. Copy the 6-digit session code
8. Click the extension icon and enter the code to connect

Once connected, use `Ctrl+Shift+X` (hold) to record audio and release to receive an AI-generated answer in the overlay.

**Keyboard shortcuts:**

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+X` (hold) | Record audio |
| `Ctrl+Shift+H` | Hide / Show overlay |
| `Ctrl+Shift+Q` | Clear overlay |

---

## Deployment

Whispr is hosted on Vercel (Hobby plan) with automatic deployments.

- Every push to `main` triggers a production deployment
- Add all environment variables listed above in the Vercel project dashboard
- After any schema changes, run `npx drizzle-kit push` against your production database

---

## Roadmap

- [ ] Stripe billing — free vs. pro tiers
- [ ] Swap Groq for GPT-4o or Claude API option
- [ ] Mobile responsive polish
- [ ] Score trend graphs and analytics dashboard
- [ ] Company-specific interview modes (Google, Meta, Amazon)
- [ ] React Native mobile app

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

Built by [Zarman Sattar](https://github.com/ZarmanSattar)
