/**
 * NEXUS — Eval Agents (merged into CashPulse)
 * 
 * All 5 evaluation agents in one file.
 * These run inside Next.js API routes (serverless-safe — no child_process).
 * 
 * Each agent: collectMetrics() → evaluate() → EvalReport
 * 
 * V&V:
 *   CODE_QUALITY  = VERIFICATION  ("building it right?")
 *   VALIDATION    = VALIDATION    ("building the right thing?")
 */

import { EvalReport, KPIValue, NexusIssue, EvalDomain, HealthStatus } from './types';
import { buildKPI, kpisToScore, scoreToStatus } from './constitution';

function simpleId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function issue(
  domain: EvalDomain,
  title: string,
  description: string,
  severity: NexusIssue['severity'],
  evidence: string,
  fixHint: string,
  fixable = true
): NexusIssue {
  return { id: simpleId(), domain, title, description, severity, evidence, fixHint, fixable };
}

// ─── 1. PRODUCT QUALITY ───────────────────────────────────────────────────────
export async function runProductQualityAgent(cashpulseUrl: string): Promise<EvalReport> {
  const domain: EvalDomain = 'PRODUCT_QUALITY';
  const kpis: KPIValue[] = [];
  const issues: NexusIssue[] = [];

  const routes = ['/', '/demo'];
  let totalMs = 0;
  let errors = 0;

  for (const path of routes) {
    const start = Date.now();
    try {
      const res = await fetch(`${cashpulseUrl}${path}`, {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      const ms = Date.now() - start;
      totalMs += ms;
      if (res.status >= 500) errors++;
    } catch {
      totalMs += 8000;
      errors++;
    }
  }

  const avgMs = Math.round(totalMs / routes.length);
  const errorRate = Math.round((errors / routes.length) * 100 * 10) / 10;
  const apiAlive = errors < routes.length;

  kpis.push(buildKPI(domain, 'api_response_time_p95', avgMs, avgMs > 800 ? 'UP' : 'STABLE'));
  kpis.push(buildKPI(domain, 'error_rate', errorRate));
  kpis.push(buildKPI(domain, 'uptime_percentage', apiAlive ? 99.9 : 0));

  if (!apiAlive) {
    issues.push(issue(domain, 'Product is OFFLINE', 'All health checks failed', 'CRITICAL',
      `Checked: ${routes.join(', ')} — all returned errors`,
      'Check Vercel deployment status. Verify environment variables are set. Check Supabase connectivity.', false));
  } else if (avgMs > 2000) {
    issues.push(issue(domain, 'Extremely slow response times', `Avg ${avgMs}ms (target: 500ms)`, 'HIGH',
      `Avg response: ${avgMs}ms across ${routes.length} routes`,
      'Add caching headers to API routes. Check Vercel cold-start settings. Profile heavy components.'));
  } else if (avgMs > 800) {
    issues.push(issue(domain, 'Slow response times', `Avg ${avgMs}ms (target: 500ms)`, 'MEDIUM',
      `Avg response: ${avgMs}ms`,
      'Consider adding Next.js static generation where possible. Add ISR to landing page.'));
  }

  const score = kpisToScore(kpis.map((k) => k.status));
  return {
    id: simpleId(), domain, timestamp: new Date().toISOString(),
    overallScore: score, status: scoreToStatus(score), kpis, issues,
    summary: apiAlive
      ? `Product UP — ${avgMs}ms avg response, ${errorRate}% error rate`
      : 'Product OFFLINE — all routes failing',
  };
}

// ─── 2. CODE QUALITY (VERIFICATION) ──────────────────────────────────────────
// Serverless note: can't run `tsc` in Vercel; scores based on last known build
export async function runCodeQualityAgent(
  lastBuildSuccess: boolean,
  tsErrors: number,
  npmVulns: number
): Promise<EvalReport> {
  const domain: EvalDomain = 'CODE_QUALITY';
  const kpis: KPIValue[] = [];
  const issues: NexusIssue[] = [];

  kpis.push(buildKPI(domain, 'typescript_errors', tsErrors, tsErrors === 0 ? 'STABLE' : 'UP'));
  kpis.push(buildKPI(domain, 'build_success_rate', lastBuildSuccess ? 100 : 0));
  kpis.push(buildKPI(domain, 'dependency_vulnerabilities', npmVulns));

  if (tsErrors > 0) {
    issues.push(issue(domain,
      `${tsErrors} TypeScript errors in last build`,
      'TypeScript strict-mode errors break the build and hide bugs.',
      tsErrors > 20 ? 'CRITICAL' : tsErrors > 5 ? 'HIGH' : 'MEDIUM',
      `${tsErrors} errors reported in last CI build`,
      'Run: npx tsc --noEmit in the cashpulse directory. Fix each error starting with the most referenced files.'));
  }
  if (!lastBuildSuccess) {
    issues.push(issue(domain, 'Build is failing', 'Next.js production build failed', 'CRITICAL',
      'last build exited non-zero',
      'Check Vercel deployment logs. Run npm run build locally and fix the first error.'));
  }
  if (npmVulns > 0) {
    issues.push(issue(domain, `${npmVulns} npm security vulnerabilities`,
      'Dependencies have known vulnerabilities',
      npmVulns > 5 ? 'HIGH' : 'MEDIUM',
      `npm audit reports ${npmVulns} vulnerabilities`,
      'Run: npm audit fix in cashpulse directory.'));
  }

  const score = kpisToScore(kpis.map((k) => k.status));
  return {
    id: simpleId(), domain, timestamp: new Date().toISOString(),
    overallScore: score, status: scoreToStatus(score), kpis, issues,
    summary: tsErrors === 0 && lastBuildSuccess
      ? 'Code quality GREEN — build passing, zero TS errors'
      : `Code issues: ${tsErrors} TS errors, build: ${lastBuildSuccess ? 'PASS' : 'FAIL'}`,
  };
}

// ─── 3. SALES PIPELINE ───────────────────────────────────────────────────────
export async function runSalesPipelineAgent(supabaseUrl: string, supabaseKey: string): Promise<EvalReport> {
  const domain: EvalDomain = 'SALES_PIPELINE';
  const kpis: KPIValue[] = [];
  const issues: NexusIssue[] = [];

  let weeklyLeads = 0;
  let emailsSent = 0;
  let emailReplies = 0;
  let demoBookings = 0;

  if (supabaseUrl && supabaseKey) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [leadsRes, activityRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/leads?created_at=gte.${sevenDaysAgo}&select=id,stage`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, signal: AbortSignal.timeout(8000) }
        ),
        fetch(
          `${supabaseUrl}/rest/v1/lead_activity?created_at=gte.${sevenDaysAgo}&select=action`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, signal: AbortSignal.timeout(8000) }
        ),
      ]);
      if (leadsRes.ok) {
        const leads: Array<{ id: string; stage: string }> = await leadsRes.json();
        weeklyLeads = leads.length;
        emailReplies = leads.filter((l) => l.stage === 'replied').length;
      }
      if (activityRes.ok) {
        const activities: Array<{ action: string }> = await activityRes.json();
        emailsSent = activities.filter((a) => a.action === 'email_sent').length;
      }
    } catch { /* Supabase not connected yet */ }
  }

  const replyRate = emailsSent > 0 ? Math.round((emailReplies / emailsSent) * 100 * 10) / 10 : 0;

  kpis.push(buildKPI(domain, 'weekly_leads_discovered', weeklyLeads, weeklyLeads === 0 ? 'DOWN' : 'STABLE'));
  kpis.push(buildKPI(domain, 'cold_email_reply_rate', replyRate, replyRate > 8 ? 'UP' : replyRate < 3 ? 'DOWN' : 'STABLE'));
  kpis.push(buildKPI(domain, 'demo_bookings_per_week', demoBookings));

  if (weeklyLeads === 0 && emailsSent === 0) {
    issues.push(issue(domain, 'Sales funnel empty — no activity this week', 'No leads discovered, no emails sent.',
      'HIGH', 'weeklyLeads=0, emailsSent=0',
      'Check Apollo.io API key. Verify APOLLO_API_KEY in Vercel env vars. Manually trigger /api/automate?action=scout.', false));
  }
  if (replyRate < 2 && emailsSent > 10) {
    issues.push(issue(domain, 'Cold email reply rate critically low', `${replyRate}% reply rate (target: 8%)`,
      'MEDIUM', `Sent: ${emailsSent}, Replies: ${emailReplies}`,
      'A/B test subject lines. Improve personalization in /api/cold-email route. Check email deliverability (SPF/DKIM).'));
  }
  if (demoBookings === 0 && weeklyLeads > 20) {
    issues.push(issue(domain, 'Leads not converting to demos', `${weeklyLeads} leads but 0 demo bookings`,
      'MEDIUM', `Leads: ${weeklyLeads}, Demos: 0`,
      'Add Calendly link to cold emails. Add demo booking CTA to landing page above the fold.'));
  }

  const score = kpisToScore(kpis.map((k) => k.status));
  return {
    id: simpleId(), domain, timestamp: new Date().toISOString(),
    overallScore: score, status: scoreToStatus(score), kpis, issues,
    summary: `Leads: ${weeklyLeads}/wk | Emails: ${emailsSent} | Reply: ${replyRate}% | Demos: ${demoBookings}`,
  };
}

// ─── 4. REVENUE ───────────────────────────────────────────────────────────────
export async function runRevenueAgent(supabaseUrl: string, supabaseKey: string): Promise<EvalReport> {
  const domain: EvalDomain = 'REVENUE';
  const kpis: KPIValue[] = [];
  const issues: NexusIssue[] = [];

  let mrr = 0;
  let payingCustomers = 0;
  let trialUsers = 0;
  let churnRate = 0;

  if (supabaseUrl && supabaseKey) {
    try {
      const [paymentsRes, profilesRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/payments?status=eq.completed&select=amount,user_id`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`${supabaseUrl}/rest/v1/profiles?select=plan`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          signal: AbortSignal.timeout(8000),
        }),
      ]);

      if (paymentsRes.ok) {
        const payments: Array<{ amount: number; user_id: string }> = await paymentsRes.json();
        const uniqueUsers = new Set(payments.map((p) => p.user_id));
        payingCustomers = uniqueUsers.size;
        mrr = payments.reduce((s, p) => s + (p.amount || 0), 0);
      }
      if (profilesRes.ok) {
        const profiles: Array<{ plan: string }> = await profilesRes.json();
        trialUsers = profiles.filter((p) => p.plan === 'free').length;
      }
    } catch { /* DB not connected */ }
  }

  const conversionRate = trialUsers + payingCustomers > 0
    ? Math.round((payingCustomers / (trialUsers + payingCustomers)) * 100)
    : 0;

  kpis.push(buildKPI(domain, 'monthly_recurring_revenue_usd', mrr, mrr > 0 ? 'UP' : 'STABLE'));
  kpis.push(buildKPI(domain, 'paying_customers', payingCustomers));
  kpis.push(buildKPI(domain, 'trial_to_paid_conversion_rate', conversionRate));
  kpis.push(buildKPI(domain, 'monthly_churn_rate', churnRate));

  if (payingCustomers === 0) {
    issues.push(issue(domain, 'Zero paying customers — $0 MRR', 'No active subscriptions. Revenue is $0.',
      'HIGH', 'payingCustomers=0, mrr=0',
      '1) Deploy CashPulse on Vercel with live PayPal keys. 2) Send 50 cold emails today. 3) Offer 14-day free trial to first 5 users.', false));
  }
  if (conversionRate < 5 && trialUsers > 5) {
    issues.push(issue(domain, 'Trial-to-paid conversion critically low', `Only ${conversionRate}% convert (target: 20%)`,
      'HIGH', `Trial: ${trialUsers}, Paid: ${payingCustomers}`,
      'Add in-app upgrade prompt after user sees invoice analysis. Send Day-3 trial email with ROI calculation.'));
  }

  const score = kpisToScore(kpis.map((k) => k.status));
  const mrrFmt = `$${mrr.toLocaleString()}`;
  return {
    id: simpleId(), domain, timestamp: new Date().toISOString(),
    overallScore: score, status: scoreToStatus(score), kpis, issues,
    summary: payingCustomers === 0
      ? 'No revenue yet — first sale needed'
      : `MRR: ${mrrFmt} | Customers: ${payingCustomers} | Conversion: ${conversionRate}%`,
  };
}

// ─── 5. VALIDATION (Building the right thing?) ───────────────────────────────
export async function runValidationAgent(supabaseUrl: string, supabaseKey: string): Promise<EvalReport> {
  const domain: EvalDomain = 'VALIDATION';
  const kpis: KPIValue[] = [];
  const issues: NexusIssue[] = [];

  let invoicesAnalyzed = 0;
  let emailsSent = 0;
  let onboardingRate = 0;

  if (supabaseUrl && supabaseKey) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [invoiceRes, profileRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/invoices?created_at=gte.${sevenDaysAgo}&select=id,collection_email_sent`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          signal: AbortSignal.timeout(8000),
        }),
        fetch(`${supabaseUrl}/rest/v1/profiles?select=onboarded`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          signal: AbortSignal.timeout(8000),
        }),
      ]);

      if (invoiceRes.ok) {
        const invoices: Array<{ collection_email_sent: boolean }> = await invoiceRes.json();
        invoicesAnalyzed = invoices.length;
        emailsSent = invoices.filter((i) => i.collection_email_sent).length;
      }
      if (profileRes.ok) {
        const profiles: Array<{ onboarded: boolean }> = await profileRes.json();
        const total = profiles.length;
        const completed = profiles.filter((p) => p.onboarded).length;
        onboardingRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      }
    } catch { /* DB not connected */ }
  }

  kpis.push(buildKPI(domain, 'invoices_analyzed_7d', invoicesAnalyzed, invoicesAnalyzed === 0 ? 'DOWN' : 'STABLE'));
  kpis.push(buildKPI(domain, 'collection_emails_sent_7d', emailsSent));
  kpis.push(buildKPI(domain, 'onboarding_completion_rate', onboardingRate));

  if (invoicesAnalyzed === 0) {
    issues.push(issue(domain, 'No invoices analyzed this week', 'Users not activating — core value not delivered',
      'HIGH', 'invoicesAnalyzed7d=0',
      'Add guided empty state on dashboard: "Upload your first invoice CSV". Add sample data button.'));
  }
  if (invoicesAnalyzed > 0 && emailsSent === 0) {
    issues.push(issue(domain, 'Invoices analyzed but no collection emails sent', 'Core loop broken — AI not triggering emails',
      'CRITICAL', `Invoices: ${invoicesAnalyzed}, Emails: 0`,
      'Check /api/send-email route. Verify RESEND_API_KEY. Check invoice status trigger in engine.ts.'));
  }
  if (onboardingRate < 50 && onboardingRate > 0) {
    issues.push(issue(domain, `Only ${onboardingRate}% complete onboarding`, 'Most users giving up before reaching value',
      'HIGH', `Onboarding completion: ${onboardingRate}%`,
      'Reduce onboarding from 3 to 1 step. Make CSV upload optional. Add sample data on Step 1.'));
  }

  const score = kpisToScore(kpis.map((k) => k.status));
  return {
    id: simpleId(), domain, timestamp: new Date().toISOString(),
    overallScore: score, status: scoreToStatus(score), kpis, issues,
    summary: invoicesAnalyzed === 0
      ? 'No product usage detected — likely pre-launch'
      : `${invoicesAnalyzed} invoices analyzed, ${emailsSent} collection emails sent this week`,
  };
}
