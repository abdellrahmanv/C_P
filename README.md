# CashPulse — AI-Powered Accounts Receivable

> **Mission:** Build a B2B SaaS that finds companies with overdue invoice problems, sells itself via an AI sales agent, and then solves their problem autonomously — without the user chasing debtors manually.

**Tagline:** "Stop Chasing. Start Collecting."

**Live Routes:** `/` · `/demo` · `/login` · `/onboarding` · `/dashboard` · `/sales` · `/voice`

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Supabase · Resend · PayPal · Voicebox · Groq · OpenRouter

---

## The Business

CashPulse is a B2B SaaS that solves **accounts receivable** — the $3.1T problem of businesses waiting to get paid.

**The core loop:**
1. Company uploads a CSV of overdue invoices
2. CashPulse AI scores risk for each invoice/customer
3. It auto-sends personalized email sequences (reminder → follow-up → escalation → final notice)
4. An AI voice agent (Voicebox) calls debtors using a cloned human voice
5. An AI sales agent (cold email) finds new customers and sells CashPulse itself on autopilot

**Pricing:** Starter $49/mo · Growth $149/mo · Scale $349/mo (PayPal subscriptions only — no Stripe by constraint)

**Why it wins over ChatGPT:** ChatGPT can *write* one email. CashPulse runs the entire autonomous loop: upload once → emails every 2 days → escalates at 30 days → voice call at 45 days → tracks everything → reports back. Hands-free.

---

## Project Structure & File Guide

Every file explained — so any AI or developer can continue work from any point.

### `src/app/` — Pages (Next.js App Router)

#### `src/app/page.tsx` — Landing Page
- The public homepage, dark theme (#0a0a0a), green accent (#00e87b)
- Hero: "You're owed money. We get it back."
- Sections: hero → features (3 columns) → social proof ($2.4M recovered, 12 days faster, 94% rate) → pricing (3 tiers with PayPal buttons) → CTA
- PayPal subscribe buttons use `NEXT_PUBLIC_PAYPAL_CLIENT_ID` and `PAYPAL_PLAN_*` env vars
- No auth required

#### `src/app/demo/page.tsx` — Live Interactive Demo
- Auto-loads 20 sample invoices on mount (no signup required)
- Shows real dashboard: stat cards, aging breakdown chart, customer risk scores, AI-generated emails
- 3 tabs: Overview · Invoices · AI Emails
- Green banner at top: "This is a live demo → Sign up free"
- **Purpose:** Convert visitors before they sign up. This is the highest-leverage conversion page.
- Uses `generateSampleCSV()` + `Papa.parse()` + full engine pipeline

#### `src/app/login/page.tsx` — Auth Page
- 3 modes in one page: login · signup · forgot password
- Uses Supabase Auth (`supabase.auth.signInWithPassword`, `signUp`, `resetPasswordForEmail`)
- On successful login → redirects to `/dashboard`
- On signup → Supabase sends confirmation email, user logs in after confirming
- **⚠ Requires:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in env

#### `src/app/onboarding/page.tsx` — Post-Signup Onboarding (3 Steps)
- Step 1: Company name + industry + invoice count estimate
- Step 2: CSV upload (skip option available)
- Step 3: Plan selection ($49/$149/$349) with "Start Free Trial" CTA
- Saves `company_name` and `onboarded: true` to Supabase `profiles` table
- After completion → redirects to `/dashboard`

#### `src/app/dashboard/page.tsx` — Main Product (The Core)
- The actual product users pay for
- **Upload flow:** CSV drag-drop or click → Papa.parse → engine pipeline → full dashboard
- **Demo button:** loads 20-invoice sample data instantly
- **5 tabs:**
  - Overview: 4 stat cards + aging chart (5 buckets) + customer risk panel
  - Invoices: sortable table with risk bars per row
  - Customers: risk card grid per customer
  - Follow-Ups: task list with scheduled dates
  - ROI: calculator showing money recovered + PayPal upgrade CTA
- **Email preview:** "Approve / Edit / Skip" buttons per email → sends via `/api/send-email`
- **⚠ Important:** Currently uses client-side CSV parsing only. Supabase persistence not yet wired into dashboard (invoices load from CSV only, not from DB). That is the next major feature to build.

#### `src/app/sales/page.tsx` — AI Sales Agent Control Panel
- Internal tool — the AI that finds and closes new customers for CashPulse itself
- **4 views:**
  - Pipeline: Kanban board with 5 columns (New → Contacted → Replied → Trial → Customer)
  - All Leads: searchable/filterable table, send email buttons per lead
  - Email Sequences: visualize the 5-step cold email sequence, activity log
  - Settings: API key inputs (Apollo, Groq, Resend), PayPal setup, Vercel deploy guide
- **Start/Stop Agent:** toggle to run automation
- Lead detail modal on row click
- **⚠ Note:** Currently uses mock lead data (50 companies from `sales-engine.ts`). To use real leads, set `APOLLO_API_KEY`.

#### `src/app/voice/page.tsx` — AI Voice Collection Calls
- Generates AI voice calls for overdue invoices using Voicebox (local TTS)
- Voicebox status card (green if connected, red if offline with download link)
- Voice profile selector (select cloned voice from Voicebox app)
- Per-invoice: "Write Script" → Qwen3-72B generates script → "Generate Audio" → Voicebox speaks it
- Editable script textarea (edit before generating audio)
- Download `.wav` button per invoice
- Bulk "Generate All" buttons
- Embedded setup guide for Voicebox
- **⚠ Requires:** Voicebox desktop app running locally. See setup guide in the page.

#### `src/app/layout.tsx` — Root Layout
- Geist font (Sans + Mono), dark background
- Injects Google Analytics (`Analytics` component, only if `NEXT_PUBLIC_GA_ID` is set)
- Injects Tawk.to live chat widget (⚠ replace `YOUR_TAWK_PROPERTY_ID` with real ID from tawk.to)
- SEO metadata: Open Graph, Twitter cards, keywords, robots

#### `src/app/globals.css` — Global Styles
- CSS variables: `--background: #0a0a0a`, `--foreground: #ededed`
- Custom scrollbar (dark, green thumb on hover)
- `pulse-glow` keyframe animation for CTA buttons
- Smooth scroll behavior

#### `src/app/sitemap.ts` — SEO Sitemap
- Auto-generates `/sitemap.xml`
- Lists: `/` (priority 1), `/login` (0.5), `/demo` (0.8)
- **⚠ Update** `baseUrl` from `https://cashpulse.ai` to your real domain

---

### `src/app/api/` — API Routes (Server-Side)

#### `src/app/api/send-email/route.ts` — Product Email Sender
- **Purpose:** Sends collection emails FROM the customer TO their debtors
- POST body: `{ to, subject, body, from? }`
- Uses Resend API (`RESEND_API_KEY`)
- If no API key → logs to console (demo mode, no crash)
- Called from dashboard "Approve" button

#### `src/app/api/scout/route.ts` — Lead Discovery
- **Purpose:** Find new B2B companies to sell CashPulse to
- Calls `searchApolloLeads()` from `sales-engine.ts`
- If `APOLLO_API_KEY` set → real Apollo.io API (10K leads/month free)
- If no key → returns 50 mock leads from `generateMockLeads()`
- Returns array of `Lead` objects

#### `src/app/api/cold-email/route.ts` — Sales Cold Email Sender
- **Purpose:** Sends cold outreach emails to potential CashPulse customers
- Uses `generateColdEmail()` from `llm.ts` (Qwen3-32B via Groq) for personalization
- Falls back to raw template if LLM unavailable
- Sends via Resend; demo mode if no key
- Validates email format before sending (security: prevents header injection)

#### `src/app/api/automate/route.ts` — Cron Automation Endpoint
- **Purpose:** Runs the sales agent automatically on a schedule
- Protected by `CRON_SECRET` header check (prevents unauthorized triggering)
- 4 actions via `?action=`:
  - `scout` → find new leads via Apollo
  - `send-sequence` → send next cold email in sequence to pending leads (⚠ needs DB wired)
  - `check-replies` → check for email replies (⚠ needs webhook/polling logic)
  - `daily-report` → summarize today's metrics
- Called by Vercel cron (see `vercel.json`)

#### `src/app/api/paypal/route.ts` — PayPal Webhooks + Plan Info
- POST: Handles PayPal subscription lifecycle webhooks:
  - `BILLING.SUBSCRIPTION.CREATED` → log
  - `BILLING.SUBSCRIPTION.ACTIVATED` → upgrade user plan in DB
  - `PAYMENT.SALE.COMPLETED` → log payment
  - `BILLING.SUBSCRIPTION.CANCELLED` → downgrade user
  - `BILLING.SUBSCRIPTION.SUSPENDED` → suspend user
- GET: Returns the 3 plan objects (name, price, features, PayPal plan ID)
- **⚠ Note:** PayPal webhook signature verification not yet implemented — add HMAC check before production

#### `src/app/api/voice/route.ts` — Voice Call Generation
- GET: Checks if Voicebox is running + lists voice profiles
- POST with `action: "generate-script"` → uses Qwen3-72B to write call script (text only)
- POST with `action: "generate-audio"` → writes script + sends to Voicebox for audio synthesis
- Returns `{ script, audio: { audio_base64 | audio_url } }`

---

### `src/lib/` — Core Logic

#### `src/lib/types.ts` — Product TypeScript Interfaces
```
Invoice          — id, customerName, invoiceNumber, amount, dueDate, issueDate,
                   status, daysPastDue, riskScore (0-100), riskLevel, predictedPayDate, customerEmail
DashboardStats   — totalOutstanding, totalAtRisk, totalOverdue, totalPaid,
                   invoiceCount, overdueCount, atRiskCount, avgDaysToPayment,
                   collectionRate, recoveredThisMonth
AgingBucket      — label, count, amount, color (for bar chart)
CustomerRisk     — name, email, totalOwed, invoiceCount, avgDaysLate, riskScore, riskLevel
EmailTemplate    — stage (reminder|followup|escalation|final), subject, body, daysRelativeToDue
FollowUpAction   — invoiceId, customerName, email, amount, stage, scheduledDate, sent, template
```

#### `src/lib/engine.ts` — Invoice Analysis Engine (Core Algorithm)
- `parseInvoices(rows)` — flexible CSV column mapper (handles messy headers)
- `calculateStats(invoices)` → `DashboardStats`
- `calculateAging(invoices)` → 5 `AgingBucket[]` (current / 1-30 / 31-60 / 61-90 / 90+)
- `getCustomerRisks(invoices)` → per-customer risk aggregation
- `generateEmailTemplates(customerName, invoiceNumber, amount, dueDate, companyName)` → 4 email stages
- `generateFollowUpActions(invoices, company)` → scheduled task list
- `generateSampleCSV()` → 20 realistic invoice rows as CSV string
- `formatCurrency(amount)` → `$1,234.56`
- **Risk score algorithm:** days past due (weighted heavily) + amount + age + randomness

#### `src/lib/sales-types.ts` — Sales Agent TypeScript Interfaces
```
Lead             — id, companyName, contactName, email, contactTitle, company,
                   industry, employeeCount, website, score (0-100), stage,
                   sequenceStep, lastContactedAt, notes, source
ColdEmailSequence — id, subject, body, delayDays, stepNumber, stage
SalesMetrics      — totalLeads, contacted, replied, trials, customers,
                   conversionRate, revenue, emailsSentToday
ApolloSearchParams — industries[], titles[], employeeMin/Max, locations[]
PayPalPlan         — id, name, price, features[], popular
```

#### `src/lib/sales-engine.ts` — AI Sales Agent Engine
- `getColdEmailSequence()` → 5 cold emails with increasing urgency:
  1. Day 0: Initial outreach (problem-aware, CTA = demo)
  2. Day 3: Follow-up (quick question)
  3. Day 7: Value bomb (ROI calculator)
  4. Day 14: Social proof (case study angle)
  5. Day 21: Break-up (last attempt)
- `scoreLead(lead)` → 0-100 score based on title + industry + company size + email quality
- `searchApolloLeads(params, apiKey)` → Apollo.io API or mock fallback
- `calculateSalesMetrics(leads)` → pipeline stats
- `generateMockLeads()` → 50 realistic B2B companies (CFOs, controllers, AR managers)
- `defaultSearchParams` → targets: Manufacturing, Wholesale, Distribution, Construction · 20-500 employees

#### `src/lib/llm.ts` — Unified Multi-LLM Layer (Key File)
- **THE brain of CashPulse** — all AI calls go through here
- `callLLM(config, systemPrompt, userPrompt)` → calls Groq or OpenRouter
- Model selection per task:
  - `MODELS.COLD_EMAIL` → `qwen-qwq-32b` on Groq (best for business writing, free)
  - `MODELS.VOICE_SCRIPT` → `qwen/qwen3-72b:free` on OpenRouter (most capable, natural speech)
  - `MODELS.RISK_ANALYSIS` → `deepseek-r1-distill-llama-70b` on Groq (reasoning model)
  - `MODELS.FAST` → `llama-3.3-70b-versatile` on Groq (fast fallback)
- `generateColdEmail(params)` → personalized cold email body (Qwen3-32B, falls back to Llama)
- `generateVoiceScript(params)` → phone call script in natural speech (Qwen3-72B)
- `analyzeInvoiceRisk(summary)` → risk assessment bullet points (DeepSeek-R1)
- All functions have automatic fallback to `MODELS.FAST` if primary model fails

#### `src/lib/voicebox.ts` — Voicebox TTS Integration
- Voicebox = open-source ElevenLabs alternative, local, Qwen3-TTS, MIT, 13k stars
- GitHub: https://github.com/jamiepine/voicebox
- `isVoiceboxRunning()` → health check on `VOICEBOX_API_URL` (default: `http://localhost:8000`)
- `listVoiceProfiles()` → GET `/profiles`
- `generateSpeech(params)` → POST `/generate` with `text + profile_id`
  - Returns `audio_base64` (binary) or `audio_url` (JSON response)
- `generateCollectionCallAudio(params)` → runs health check first, then generates at 0.95x speed
- `batchGenerateCollectionCalls(calls[])` → generate audio for multiple invoices sequentially
- **Setup:** Download from github.com/jamiepine/voicebox/releases → launch → create voice profile → set `VOICEBOX_PROFILE_ID`

#### `src/lib/supabase.ts` — Supabase Client
- `supabase` → public client (uses anon key, RLS enforced)
- `getServiceSupabase()` → service role client (bypasses RLS, for API routes only)
- `isSupabaseConfigured()` → returns false if env vars not set (safe for build)
- Falls back to placeholder URL/key at build time so Next.js static generation does not crash

#### `src/lib/db.ts` — Database Operations Layer
All Supabase CRUD operations. Uses `getServiceSupabase()` (service role, server-side only).
- **Invoices:** `saveInvoices()`, `getUserInvoices()`, `updateInvoiceStatus()`
- **Leads:** `saveLeads()`, `getLeadsByStage()`, `updateLeadStage()`, `updateLeadSequenceStep()`, `getLeadsForSequence()`
- **Lead Activity:** `logLeadActivity(leadId, action, details)`
- **Email Log:** `logEmail(entry)` — tracks every sent email
- **Subscriptions:** `createSubscription()`, `cancelSubscription()`
- **Payments:** `logPayment(data)`
- **Profiles:** `getProfile(userId)`, `updateProfile(userId, updates)`
- **Dashboard Stats:** `getDashboardStats(userId)` — from `user_dashboard_stats` view

---

### `supabase/schema.sql` — Complete Database Schema
Run this in Supabase SQL Editor to set up the database.

| Table | Purpose |
|---|---|
| `profiles` | Extends Supabase Auth users. Stores: company_name, plan, paypal_subscription_id, onboarded |
| `invoices` | Customer invoices uploaded via CSV. Per-user RLS. |
| `email_log` | Every email sent (product + cold outreach). For delivery tracking. |
| `leads` | Companies targeted by AI sales agent. No RLS (server-side only). |
| `lead_activity` | Action log per lead (emailed, replied, etc.) |
| `subscriptions` | PayPal subscription records. |
| `payments` | Individual payment events from PayPal webhooks. |
| `user_dashboard_stats` | View: aggregated stats per user (outstanding, overdue, collected) |

Also includes:
- `handle_new_user()` trigger — auto-creates `profiles` row on every signup
- RLS policies on all user-facing tables
- Indexes on user_id, status, score, stage columns

---

### `src/components/Analytics.tsx` — Google Analytics
- Renders 2 `<Script>` tags using Next.js `Script` with `afterInteractive` strategy
- Only renders if `NEXT_PUBLIC_GA_ID` is set — safe if missing
- Injected in `layout.tsx`

---

### Root Config Files

#### `vercel.json` — Vercel Cron Jobs
```
Monday–Friday schedule (UTC):
  06:00 → /api/automate?action=scout         (find new leads via Apollo)
  07:00 → /api/automate?action=send-sequence  (send cold emails to leads)
  18:00 → /api/automate?action=daily-report   (send daily summary)
```

#### `.env.example` — All Environment Variables Reference
```
# Email
RESEND_API_KEY          → resend.com (free 3K/month)
SENDER_EMAIL            → your sending email address

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID  → developer.paypal.com
PAYPAL_SECRET
PAYPAL_PLAN_STARTER     → Plan ID from PayPal Subscriptions ($49/mo)
PAYPAL_PLAN_GROWTH      → Plan ID ($149/mo)
PAYPAL_PLAN_SCALE       → Plan ID ($349/mo)

# AI/LLM
GROQ_API_KEY            → console.groq.com (free — Qwen3, Llama, DeepSeek)
OPENROUTER_API_KEY      → openrouter.ai (free $1 credit — Qwen3-72B)

# Lead Discovery
APOLLO_API_KEY          → app.apollo.io (free 10K leads/month)

# Database
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY  → (server-side only, never expose to client)

# Security
CRON_SECRET             → random hex string, protects /api/automate from abuse

# Voice
VOICEBOX_API_URL        → http://localhost:8000 (or your GPU server)
VOICEBOX_PROFILE_ID     → from Voicebox app after cloning your voice

# Analytics
NEXT_PUBLIC_GA_ID       → Google Analytics measurement ID (G-XXXXXXXXXX)
```

---

## What Is Done vs What Is Next

### Done
- Landing page (converts visitors)
- Demo page (converts without signup — highest impact)
- Auth (Supabase login/signup/forgot password)
- Onboarding flow (3 steps: company → CSV → plan)
- Dashboard (CSV upload → full invoice analysis)
- Invoice engine (risk scoring, aging buckets, email templates)
- Email sending product (Resend API)
- Sales agent engine (50 mock leads, 5-step cold sequences, lead scoring)
- Sales agent dashboard (kanban pipeline, leads table, sequences view, settings)
- AI cold email personalization (Qwen3-32B via Groq)
- AI voice collection calls (Voicebox + Qwen3-TTS + Qwen3-72B scripts)
- Cron automation (Vercel cron, 3 jobs/day)
- PayPal subscriptions (webhooks + plan details)
- Full Supabase database schema (7 tables + view + triggers + RLS)
- Database operations layer (full CRUD in `db.ts`)
- SEO (Open Graph, Twitter cards, sitemap, robots.txt, keywords)
- Google Analytics
- Tawk.to live chat widget

### Next Steps (Priority Order)
1. **Wire dashboard to Supabase** — save uploaded invoices to DB per user, load on return
2. **PayPal webhook HMAC verification** — add signature validation before going live
3. **Wire automate cron send-sequence** — connect `getLeadsForSequence()` → send email → `updateLeadSequenceStep()`
4. **Email reply detection** — Resend webhook or inbox polling for reply tracking
5. **Twilio auto-dial** — use generated `.wav` files to automatically call debtors
6. **Real domain** — replace `cashpulse.ai` in `sitemap.ts` and `layout.tsx` OG tags
7. **Tawk.to property ID** — replace `YOUR_TAWK_PROPERTY_ID` in `layout.tsx`

---

## How to Run

```bash
# Local development
cd cashpulse
npm install
npm run dev
# → http://localhost:3000

# Production build test
npm run build

# Deploy: push to GitHub → import on vercel.com → add env vars → deploy
```

---

## Git History
```
304f75b  Add voice calls + multi-LLM layer (Qwen3, DeepSeek-R1, OpenRouter)
52c8b46  Full system: sales agent, auth, database, demo, SEO, analytics, cron automation
3d1aa5e  CashPulse MVP - landing page, dashboard, invoice engine, email system, PayPal
```

---

*CashPulse — built to be the autonomous money-collector for every B2B company on Earth.*
