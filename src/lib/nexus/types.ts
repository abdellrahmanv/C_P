/**
 * NEXUS — Types (merged into CashPulse)
 * All types for the AI Company Operating System.
 */

export type HealthStatus = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

export type EvalDomain =
  | 'PRODUCT_QUALITY'
  | 'CODE_QUALITY'
  | 'SALES_PIPELINE'
  | 'REVENUE'
  | 'VALIDATION';

export interface KPIValue {
  name: string;
  current: number;
  target: number;
  unit: string;
  deviation: number;
  status: HealthStatus;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface NexusIssue {
  id: string;
  domain: EvalDomain;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;
  fixable: boolean;
  fixHint: string;
}

export interface EvalReport {
  id: string;
  domain: EvalDomain;
  timestamp: string;
  overallScore: number; // 0–100
  status: HealthStatus;
  kpis: KPIValue[];
  issues: NexusIssue[];
  summary: string;
}

export interface Deviation {
  issue: NexusIssue;
  priorityScore: number;
}

export interface FixPlan {
  deviations: Deviation[];
  estimatedImpact: string;
}

export interface ManagementDecision {
  id: string;
  timestamp: string;
  systemHealth: HealthStatus;
  overallScore: number;
  domainScores: { domain: EvalDomain; score: number; status: HealthStatus }[];
  fixPlan: FixPlan;
  boardSummary: string;
}

// ─── KPI Threshold definition ─────────────────────────────────────────────────
export interface KPIThreshold {
  name: string;
  target: number;
  yellowBelow: number; // for higher_is_better; yellowAbove for lower_is_better
  redBelow: number;
  unit: string;
  direction: 'higher_is_better' | 'lower_is_better';
}
