/**
 * NEXUS — Orchestrator + LLM Fix Agent (merged into CashPulse)
 *
 * No Claude Code CLI needed — uses DeepSeek-R1 (already in src/lib/llm.ts)
 * for code reasoning and fix plan generation.
 *
 * Flow:
 *   1. Collect all EvalReports
 *   2. Score system health (weighted by domain importance)
 *   3. Rank deviations by: severity × fixability
 *   4. For top CRITICAL/HIGH fixable issues → call DeepSeek-R1 for fix plan
 *   5. Return ManagementDecision with fix plans ready for developer to apply
 */

import {
  EvalReport,
  ManagementDecision,
  FixPlan,
  Deviation,
  NexusIssue,
  HealthStatus,
  EvalDomain,
} from './types';
import { DOMAIN_WEIGHTS, SEVERITY_WEIGHTS, scoreToStatus } from './constitution';
import { callLLM, MODELS } from '../llm';

function simpleId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── System Health Roll-up ────────────────────────────────────────────────────
function computeSystemHealth(reports: EvalReport[]): { score: number; status: HealthStatus } {
  if (reports.length === 0) return { score: 50, status: 'UNKNOWN' };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const report of reports) {
    const weight = DOMAIN_WEIGHTS[report.domain] ?? 0.2;
    if (weight === 0) continue; // VALIDATION is advisory only
    weightedSum += report.overallScore * weight;
    totalWeight += weight;
  }

  const score = Math.round(weightedSum / Math.max(totalWeight, 0.01));
  return { score, status: scoreToStatus(score) };
}

// ─── Priority Scoring ─────────────────────────────────────────────────────────
function computePriority(issue: NexusIssue): number {
  const severity = SEVERITY_WEIGHTS[issue.severity] ?? 1;
  const fixability = issue.fixable ? 2 : 0.5;
  return severity * fixability;
}

// ─── LLM Fix Plan Generator ───────────────────────────────────────────────────
async function generateFixPlan(issue: NexusIssue): Promise<string> {
  const systemPrompt = `You are a senior engineer for CashPulse — a Next.js 16 TypeScript SaaS for B2B accounts receivable.
Stack: Next.js 16 App Router, TypeScript strict, Tailwind, Supabase, Resend, PayPal, Groq, OpenRouter.
Your job: given an issue detected by the NEXUS monitoring system, produce a PRECISE action plan.
Be specific: file names, function names, exact changes needed.
Format: numbered list. Max 5 steps. Be concise.`;

  const userPrompt = `NEXUS detected this issue:
Title: ${issue.title}
Severity: ${issue.severity}
Domain: ${issue.domain}
Description: ${issue.description}
Evidence: ${issue.evidence}
Fix Hint: ${issue.fixHint}

Write a precise, actionable fix plan for a developer to follow.`;

  try {
    return await callLLM(
      { ...MODELS.RISK_ANALYSIS, maxTokens: 400 }, // DeepSeek-R1: best for reasoning
      systemPrompt,
      userPrompt
    );
  } catch {
    return issue.fixHint; // fallback to static hint
  }
}

// ─── Board Summary Generator ──────────────────────────────────────────────────
function generateBoardSummary(
  reports: EvalReport[],
  systemScore: number,
  systemStatus: HealthStatus,
  topIssues: NexusIssue[]
): string {
  const statusIcon = systemStatus === 'GREEN' ? '✅' : systemStatus === 'YELLOW' ? '⚠️' : '🚨';
  const domainLines = reports
    .map((r) => `• ${r.domain}: ${r.overallScore}/100 [${r.status}] — ${r.summary}`)
    .join('\n');
  const issueLines = topIssues.length === 0
    ? '• No critical issues found — system healthy'
    : topIssues.slice(0, 5).map((i, n) => `${n + 1}. [${i.severity}] ${i.title}`).join('\n');

  return `NEXUS BOARD REPORT — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}

${statusIcon} SYSTEM HEALTH: ${systemStatus} (${systemScore}/100)

DOMAIN SCORES:
${domainLines}

TOP ISSUES:
${issueLines}`;
}

// ─── Orchestrator Main ────────────────────────────────────────────────────────
export async function runOrchestrator(reports: EvalReport[]): Promise<ManagementDecision> {
  const { score: systemScore, status: systemStatus } = computeSystemHealth(reports);

  // Collect + rank all issues
  const allIssues: NexusIssue[] = reports.flatMap((r) => r.issues);
  const deviations: Deviation[] = allIssues
    .map((issue) => ({ issue, priorityScore: computePriority(issue) }))
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // Generate LLM fix plans for top fixable issues (max 3 to control cost)
  const fixableTop = deviations.filter((d) => d.issue.fixable).slice(0, 3);
  for (const deviation of fixableTop) {
    const aiPlan = await generateFixPlan(deviation.issue);
    // Append AI plan to the fixHint
    deviation.issue.fixHint = aiPlan;
  }

  const criticalCount = allIssues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = allIssues.filter((i) => i.severity === 'HIGH').length;

  const estimatedImpact = criticalCount > 0
    ? `${criticalCount} CRITICAL issues need immediate attention`
    : highCount > 0
      ? `${highCount} HIGH priority issues — fix within 24h`
      : 'All clear — continue iterating';

  const fixPlan: FixPlan = {
    deviations,
    estimatedImpact,
  };

  const domainScores = reports.map((r) => ({
    domain: r.domain as EvalDomain,
    score: r.overallScore,
    status: r.status,
  }));

  return {
    id: simpleId(),
    timestamp: new Date().toISOString(),
    systemHealth: systemStatus,
    overallScore: systemScore,
    domainScores,
    fixPlan,
    boardSummary: generateBoardSummary(reports, systemScore, systemStatus, allIssues.slice(0, 5)),
  };
}
