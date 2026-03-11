/**
 * NEXUS — Constitution (merged into CashPulse)
 * Company laws: OKRs, KPI thresholds, alert config.
 * No YAML file needed — pure TypeScript.
 */

import { KPIThreshold, HealthStatus } from './types';

// ─── KPI Definitions per Domain ──────────────────────────────────────────────

export const KPIS: Record<string, KPIThreshold[]> = {
  PRODUCT_QUALITY: [
    { name: 'api_response_time_p95', target: 500,  yellowBelow: 800,  redBelow: 2000, unit: 'ms', direction: 'lower_is_better' },
    { name: 'uptime_percentage',     target: 99.9, yellowBelow: 99.0, redBelow: 95.0, unit: '%',  direction: 'higher_is_better' },
    { name: 'error_rate',            target: 0.1,  yellowBelow: 1.0,  redBelow: 5.0,  unit: '%',  direction: 'lower_is_better' },
  ],
  CODE_QUALITY: [
    { name: 'typescript_errors',          target: 0,   yellowBelow: 5,   redBelow: 20,  unit: 'errors', direction: 'lower_is_better' },
    { name: 'build_success_rate',         target: 100, yellowBelow: 95,  redBelow: 85,  unit: '%',      direction: 'higher_is_better' },
    { name: 'dependency_vulnerabilities', target: 0,   yellowBelow: 3,   redBelow: 10,  unit: 'vulns',  direction: 'lower_is_better' },
  ],
  SALES_PIPELINE: [
    { name: 'weekly_leads_discovered',  target: 100, yellowBelow: 50, redBelow: 20, unit: 'leads',  direction: 'higher_is_better' },
    { name: 'cold_email_reply_rate',    target: 8,   yellowBelow: 4,  redBelow: 2,  unit: '%',      direction: 'higher_is_better' },
    { name: 'demo_bookings_per_week',   target: 5,   yellowBelow: 2,  redBelow: 0,  unit: 'demos',  direction: 'higher_is_better' },
  ],
  REVENUE: [
    { name: 'monthly_recurring_revenue_usd', target: 10000, yellowBelow: 5000, redBelow: 1000, unit: '$',         direction: 'higher_is_better' },
    { name: 'paying_customers',              target: 50,    yellowBelow: 10,   redBelow: 3,    unit: 'customers', direction: 'higher_is_better' },
    { name: 'trial_to_paid_conversion_rate', target: 20,    yellowBelow: 10,   redBelow: 5,    unit: '%',         direction: 'higher_is_better' },
    { name: 'monthly_churn_rate',            target: 5,     yellowBelow: 10,   redBelow: 20,   unit: '%',         direction: 'lower_is_better' },
  ],
  VALIDATION: [
    { name: 'invoices_analyzed_7d',       target: 50,  yellowBelow: 10, redBelow: 0,  unit: 'invoices', direction: 'higher_is_better' },
    { name: 'collection_emails_sent_7d',  target: 30,  yellowBelow: 5,  redBelow: 0,  unit: 'emails',   direction: 'higher_is_better' },
    { name: 'onboarding_completion_rate', target: 80,  yellowBelow: 50, redBelow: 20, unit: '%',         direction: 'higher_is_better' },
  ],
};

// Domain weights (must sum to 1)
export const DOMAIN_WEIGHTS: Record<string, number> = {
  PRODUCT_QUALITY: 0.30,
  CODE_QUALITY:    0.20,
  SALES_PIPELINE:  0.20,
  REVENUE:         0.30,
  VALIDATION:      0.00, // advisory only, not counted in score
};

// Severity priority weights for fix ordering
export const SEVERITY_WEIGHTS = {
  CRITICAL: 10,
  HIGH:     5,
  MEDIUM:   2,
  LOW:      1,
} as const;

// ─── Threshold Evaluator ──────────────────────────────────────────────────────

export function evaluateKPI(
  domain: string,
  kpiName: string,
  actual: number
): { status: HealthStatus; deviation: number } {
  const kpis = KPIS[domain] ?? [];
  const kpi = kpis.find((k) => k.name === kpiName);
  if (!kpi) return { status: 'UNKNOWN', deviation: 0 };

  const deviation = (actual - kpi.target) / Math.max(kpi.target, 0.0001);
  let status: HealthStatus;

  if (kpi.direction === 'higher_is_better') {
    if (actual >= kpi.target * 0.95)   status = 'GREEN';
    else if (actual >= kpi.yellowBelow) status = 'YELLOW';
    else                                status = 'RED';
  } else {
    // lower_is_better: redBelow is actually redAbove here
    if (actual <= kpi.target * 1.05)  status = 'GREEN';
    else if (actual <= kpi.redBelow)  status = 'YELLOW';
    else                              status = 'RED';
  }

  return { status, deviation };
}

export function buildKPI(
  domain: string,
  kpiName: string,
  actual: number,
  trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE'
) {
  const kpis = KPIS[domain] ?? [];
  const kpi = kpis.find((k) => k.name === kpiName);
  if (!kpi) return { name: kpiName, current: actual, target: 0, unit: '?', deviation: 0, status: 'UNKNOWN' as HealthStatus, trend };
  const { status, deviation } = evaluateKPI(domain, kpiName, actual);
  return { name: kpiName, current: actual, target: kpi.target, unit: kpi.unit, deviation, status, trend };
}

export function scoreToStatus(score: number): HealthStatus {
  if (score >= 80) return 'GREEN';
  if (score >= 60) return 'YELLOW';
  return 'RED';
}

export function kpisToScore(statuses: HealthStatus[]): number {
  if (statuses.length === 0) return 50;
  const map: Record<HealthStatus, number> = { GREEN: 100, YELLOW: 60, RED: 20, UNKNOWN: 50 };
  return Math.round(statuses.reduce((s, st) => s + map[st], 0) / statuses.length);
}
