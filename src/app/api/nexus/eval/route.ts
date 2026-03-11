/**
 * NEXUS — /api/nexus/eval
 * Runs all 5 eval agents + orchestrator. Called by Vercel cron.
 * Stores result in Supabase nexus_reports table.
 * 
 * GET  — cron trigger (no auth needed, Vercel-only)
 * POST — manual trigger with x-nexus-key header
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  runProductQualityAgent,
  runCodeQualityAgent,
  runSalesPipelineAgent,
  runRevenueAgent,
  runValidationAgent,
} from '@/lib/nexus/eval-agents';
import { runOrchestrator } from '@/lib/nexus/orchestrator';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  // Vercel cron calls are GET with a special header
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (!isVercelCron && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return runFullEval();
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-nexus-key');
  const expectedKey = process.env.NEXUS_API_KEY;
  if (expectedKey && apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runFullEval();
}

async function runFullEval() {
  const cashpulseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cashpulse.ai';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  try {
    // Run all 5 eval agents in parallel
    const [product, code, sales, revenue, validation] = await Promise.all([
      runProductQualityAgent(cashpulseUrl),
      runCodeQualityAgent(true, 0, 0), // defaults — updated by CI/build webhook
      runSalesPipelineAgent(supabaseUrl, supabaseKey),
      runRevenueAgent(supabaseUrl, supabaseKey),
      runValidationAgent(supabaseUrl, supabaseKey),
    ]);

    const reports = [product, code, sales, revenue, validation];
    const decision = await runOrchestrator(reports);

    // Persist to Supabase
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('nexus_reports').insert({
        id: decision.id,
        timestamp: decision.timestamp,
        system_health: decision.systemHealth,
        overall_score: decision.overallScore,
        domain_scores: decision.domainScores,
        fix_plan: decision.fixPlan,
        board_summary: decision.boardSummary,
        eval_reports: reports,
      });
    }

    return NextResponse.json({ success: true, decision });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
