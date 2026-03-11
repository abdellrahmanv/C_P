/**
 * NEXUS — /api/nexus/status
 * Returns the latest management decision from Supabase.
 * Powers the /nexus dashboard page.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Return a bootstrap state when DB isn't connected yet
    return NextResponse.json({
      systemHealth: 'UNKNOWN',
      overallScore: 0,
      lastEvalAt: null,
      domainScores: [],
      topIssues: [],
      boardSummary: 'NEXUS not yet initialized. Trigger an eval cycle to start.',
    });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('nexus_reports')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({
      systemHealth: 'UNKNOWN',
      overallScore: 0,
      lastEvalAt: null,
      domainScores: [],
      topIssues: [],
      boardSummary: 'No eval reports yet. Click "Run Eval Now" to start.',
    });
  }

  const topIssues = (data.fix_plan?.deviations ?? [])
    .slice(0, 5)
    .map((d: { issue: { title: string; severity: string; domain: string; fixable: boolean; fixHint: string }; priorityScore: number }) => ({
      title: d.issue.title,
      severity: d.issue.severity,
      domain: d.issue.domain,
      fixable: d.issue.fixable,
      fixHint: d.issue.fixHint,
      priority: d.priorityScore,
    }));

  return NextResponse.json({
    systemHealth: data.system_health,
    overallScore: data.overall_score,
    lastEvalAt: data.timestamp,
    domainScores: data.domain_scores ?? [],
    topIssues,
    boardSummary: data.board_summary,
    estimatedImpact: data.fix_plan?.estimatedImpact,
  });
}
