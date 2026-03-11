# CashPulse — CLAUDE.md
# Context file for Claude Code agents working on this codebase

## What is CashPulse?

CashPulse is an AI-powered Accounts Receivable SaaS.
It helps SMBs get paid faster by:
1. Analyzing invoice CSV files to score payment risk
2. Automatically sending collection emails via Resend
3. Generating AI voice call scripts for collections teams
4. Running autonomous sales outreach via Apollo.io + Qwen3

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript strict
- **Styling**: Tailwind CSS, dark theme (#0a0a0a background, #00e87b accent)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Email**: Resend (transactional email)
- **Payments**: PayPal subscriptions (NOT Stripe)
- **AI/LLM**: Groq (Llama 3.3/DeepSeek-R1) + OpenRouter (Qwen3-72B)
- **Voice**: Voicebox on localhost:8000 (Qwen3-TTS)
- **Leads**: Apollo.io API
- **Chat widget**: Tawk.to

## Critical Rules

1. TypeScript strict — ZERO tolerance for errors
2. All API routes: POST to `/api/xxx`, return `{ data }` or `{ error: string }`
3. Payment: PayPal only. No Stripe.
4. Dark theme: never change `#0a0a0a` or `#00e87b`
5. Security: SUPABASE_SERVICE_ROLE_KEY is server-only. Never use in client.
6. All Supabase tables have RLS enabled — use service role key for server operations only.

## Key Files

```
src/app/page.tsx              ← Landing page
src/app/dashboard/page.tsx    ← Core product
src/app/onboarding/page.tsx   ← 3-step onboarding
src/app/sales/page.tsx        ← Sales agent
src/app/voice/page.tsx        ← Voice calls
src/lib/engine.ts             ← Invoice analysis engine
src/lib/llm.ts                ← LLM unified layer
src/lib/db.ts                 ← Supabase CRUD
src/lib/sales-engine.ts       ← Lead discovery + cold email
src/lib/voicebox.ts           ← TTS integration
supabase/schema.sql           ← Database schema (7 tables)
```

## Build

```bash
npm run dev        # Development
npm run build      # Production build
npx tsc --noEmit   # Type check only
npm audit          # Security check
```

## After Every Fix

Run `npx tsc --noEmit` to confirm zero TypeScript errors.
Report: what changed, what file, what line, what it fixes.
