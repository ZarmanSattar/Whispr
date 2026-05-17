# Whispr — AI Interview Preparation Platform

> Practice interviews with AI. Get real-time feedback. Build confidence.

**Live:** https://interview-woad-rho.vercel.app

---

## What is Whispr?

Whispr is a full-stack AI-powered interview preparation platform that helps job seekers practice technical and behavioral interviews through realistic AI-generated question sets, spoken answer recording, and instant scored feedback.

The platform has two modes:

- **Prepare Mode** — Web-based mock interview sessions with AI question generation, spoken answer recording, real-time evaluation, and detailed feedback summaries

- **Meeting Assistant** — A Chrome extension and desktop overlay that provides real-time AI answers during live interviews, visible only to the user

---

## Features

### Prepare Mode

- AI-generated interview questions tailored to job role, tech stack, and experience level

- Spoken answer recording via Deepgram nova-2 real-time transcription

- Instant AI scoring (0-100) with detailed feedback on each answer

- Difficulty levels: Easy, Medium, Hard

- Skip questions — scored as 0, no AI call made

- Per-question hints and 120-second countdown timer

- Detailed feedback page with score visualization, strengths, weaknesses, and practice recommendations

- PDF export of full session report

- Dashboard with session history, search, filter, sort, progress chart, and role insights

### Meeting Assistant

- Chrome extension with injected floating overlay — invisible to screen share

- Real-time microphone transcription via Deepgram

- Hold Ctrl+Shift+X to record, release to get AI answer

- Answers personalized to user resume and job context

- Python desktop overlay for Windows with WASAPI loopback system audio capture

### Account

- Profile editing via Clerk

- Resume upload (PDF/DOCX) — parsed and injected into AI prompts for personalized answers

- Education history

- Personal statistics and session history

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Authentication | Clerk v7 |
| Database | PostgreSQL via Neon |
| ORM | Drizzle ORM |
| AI / LLM | Groq API — LLaMA 3.3 70B Versatile |
| Speech-to-Text | Deepgram nova-2 (real-time WebSocket) |
| PDF Export | jsPDF |
| Charts | Recharts |
| Deployment | Vercel (auto-deploy on push) |
| CI/CD | GitHub Actions |
| Testing | Vitest (unit + integration), Playwright (E2E) |
| Desktop Overlay | Python 3.12, soundcard, Tkinter |
| Chrome Extension | Manifest V3, MediaRecorder API |

---

## Architecture

```
src/
├── app/
│   ├── page.tsx                # Landing page (auth-aware)
│   ├── (auth)/                 # Sign in / Sign up
│   ├── (root)/
│   │   └── dashboard/
│   │       ├── page.tsx        # Server component — fetches session data
│   │       ├── DashboardClient.tsx  # Client component — all interactivity
│   │       ├── new/            # New interview form
│   │       ├── live/           # Meeting Assistant page
│   │       ├── interview/[id]/ # Interview page
│   │       │   └── feedback/   # Feedback summary
│   │       └── account/        # Profile, resume, education
│   └── api/
│       ├── interviews/create/  # Groq question generation
│       ├── interviews/answer/  # Groq answer evaluation
│       ├── live/session/       # Meeting session management
│       ├── live/answer/        # Real-time meeting answers
│       ├── resume/             # Resume upload and parsing
│       └── education/          # Education CRUD
└── lib/
    ├── db.ts                   # Drizzle + Neon connection
    └── schema.ts               # Database schema
```

---

## Database Schema

- **mock_interviews** — session metadata (role, stack, level, type, company, status)

- **questions** — AI-generated questions with difficulty, type, topic

- **user_answers** — user responses with AI feedback and multi-dimensional scoring

- **education** — user education history

- **user_progress** — aggregated session statistics

- **live_sessions** — Meeting Assistant sessions with 4-hour expiry

- **live_answers** — real-time meeting Q&A history

---

## Getting Started

### Prerequisites

- Node.js 18+

- PostgreSQL database (Neon recommended)

- Clerk account

- Groq API key

- Deepgram API key

### Installation

```bash
git clone https://github.com/ZarmanSattar/Whispr.git
cd Whispr
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
DATABASE_URL=your_neon_postgresql_url
GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_DEEPGRAM_API_KEY=your_deepgram_api_key
```

### Database Setup

```bash
npx drizzle-kit push
```

### Run Development Server

```bash
npm run dev
```

### Run Tests

```bash
npm run test          # Unit + integration tests
npm run test:e2e      # E2E tests (requires running dev server)
```

---

## Testing

- 58 unit tests covering core utilities and data transformations

- 22 integration tests covering all API routes

- 16 E2E tests covering full user flows via Playwright

- GitHub Actions CI runs all tests on every push to dev and main

---

## Key Engineering Decisions

- **Server/Client component separation** — data fetching in server components, interactivity in client components with clear boundaries

- **Groq over OpenAI** — LPU hardware delivers LLaMA 3.3 70B responses in 1-2 seconds, critical for real-time interview feedback

- **Deepgram over Web Speech API** — production-grade accuracy, works cross-browser, supports real-time WebSocket streaming

- **Drizzle ORM** — type-safe queries with direct eq() where clauses for reliability

- **WASAPI loopback** — Python overlay captures system audio output directly, enabling automatic question detection without manual triggers

---

## Deployment

Auto-deploys to Vercel on every push to main branch.

Preview deployments on every push to dev branch.

---

## License

MIT

---

Built by [Zarman Sattar](https://github.com/ZarmanSattar)
