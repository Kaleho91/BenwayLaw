# BenwayLaw 🍁

**Canada-first, AI-native legal practice management for small-to-mid Canadian law firms.**

BenwayLaw is a "system of intelligence" that reduces cognitive load with proactive guidance, prevents revenue leakage via smart time + billing signals, and improves compliance posture with trust accounting guardrails.

## Features

- 🔐 **Multi-tenancy** - Firm isolation via Supabase RLS
- 👥 **Client Management** - Individual & organization clients with portal access
- 📁 **Matter Management** - Auto-generated matter numbers (YYYY-NNN)
- ⏱️ **Time Tracking** - Billable time entries with automated calculations
- 💰 **Invoicing** - Canadian tax calculation (HST/GST/PST/QST by province)
- 🔒 **Trust Accounting** - IOLTA-style with balance enforcement & three-way reconciliation
- 🤖 **AI Command Bar** - ⌘K powered assistant with full audit logging
- 📊 **Dashboard** - Metrics, quick actions, and AI-powered risk insights

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com))

### 2. Clone & Install

```bash
cd maplelaw
npm install
```

### 3. Configure Environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Set Up Database

In your Supabase SQL editor, run the following files in order:

1. `supabase/schema.sql` - Creates all tables, indexes, and triggers
2. `supabase/rls.sql` - Enables Row Level Security policies
3. `supabase/seed.sql` - Adds demo data function (optional)

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:5173`

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Data Fetching**: TanStack Query
- **Routing**: React Router
- **Validation**: Zod

## Project Structure

```
maplelaw/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── layout/      # Sidebar, Header, Layout
│   │   ├── ui/          # Button, Input, Modal, etc.
│   │   └── features/    # AICommandBar, etc.
│   ├── pages/           # Route pages
│   ├── hooks/           # React hooks (useAuth, etc.)
│   ├── lib/             # Utilities (supabase, tax, ai)
│   └── types/           # TypeScript types
├── supabase/            # Database files
└── public/              # Static assets
```

## AI Guardrails

BenwayLaw's AI is designed to be **assistive, not authoritative**:

- ✅ AI can create drafts, suggest time entries, flag risks
- ✅ AI logs all suggestions and actions to `ai_events` and `audit_logs`
- ⛔ AI **cannot** execute trust transfers/withdrawals
- ⛔ AI **cannot** provide legal advice
- ⛔ All trust actions require explicit human confirmation

## Canadian Tax Support

Tax rates automatically apply based on firm province:

| Province | Tax Type |
|----------|----------|
| ON | HST 13% |
| BC | GST 5% + PST 7% |
| AB | GST 5% |
| QC | GST 5% + QST 9.975% |
| NB, NS, NL, PE | HST 15% |
| SK | GST 5% + PST 6% |
| MB | GST 5% + RST 7% |
| NT, NU, YT | GST 5% |

## License

MIT
