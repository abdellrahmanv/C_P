'use client';

/**
 * NEXUS — Command Center Dashboard (/nexus)
 * 
 * Shows real-time AI company OS status:
 * - System health score
 * - 5 domain scores (product, code, sales, revenue, validation)
 * - Top issues with AI-generated fix plans
 * - Board summary
 * - Manual eval trigger button
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
type HealthStatus = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';

interface DomainScore {
  domain: string;
  score: number;
  status: HealthStatus;
}

interface TopIssue {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  domain: string;
  fixable: boolean;
  fixHint: string;
  priority: number;
}

interface StatusData {
  systemHealth: HealthStatus;
  overallScore: number;
  lastEvalAt: string | null;
  domainScores: DomainScore[];
  topIssues: TopIssue[];
  boardSummary: string;
  estimatedImpact?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<HealthStatus, string> = {
  GREEN:   'text-[#00e87b]',
  YELLOW:  'text-yellow-400',
  RED:     'text-red-500',
  UNKNOWN: 'text-gray-400',
};

const STATUS_BG: Record<HealthStatus, string> = {
  GREEN:   'bg-[#00e87b]/10 border-[#00e87b]/30',
  YELLOW:  'bg-yellow-400/10 border-yellow-400/30',
  RED:     'bg-red-500/10 border-red-500/30',
  UNKNOWN: 'bg-gray-700/30 border-gray-600/30',
};

const STATUS_DOT: Record<HealthStatus, string> = {
  GREEN:   'bg-[#00e87b]',
  YELLOW:  'bg-yellow-400',
  RED:     'bg-red-500',
  UNKNOWN: 'bg-gray-500',
};

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
  HIGH:     'text-orange-400 bg-orange-500/10 border-orange-400/30',
  MEDIUM:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  LOW:      'text-gray-400 bg-gray-600/10 border-gray-500/30',
};

const DOMAIN_LABELS: Record<string, string> = {
  PRODUCT_QUALITY: '🔧 Product',
  CODE_QUALITY:    '🛡️  Verification',
  SALES_PIPELINE:  '📈 Sales',
  REVENUE:         '💰 Revenue',
  VALIDATION:      '✅ Validation',
};

function ScoreRing({ score, status }: { score: number; status: HealthStatus }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = status === 'GREEN' ? '#00e87b' : status === 'YELLOW' ? '#facc15' : status === 'RED' ? '#ef4444' : '#6b7280';

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1f2937" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-2xl font-bold ${STATUS_COLOR[status]}`}>{score}</div>
        <div className="text-xs text-gray-500">/100</div>
      </div>
    </div>
  );
}

function DomainCard({ d }: { d: DomainScore }) {
  const pct = d.score;
  const color = d.status === 'GREEN' ? '#00e87b' : d.status === 'YELLOW' ? '#facc15' : '#ef4444';
  return (
    <div className={`rounded-xl border p-4 ${STATUS_BG[d.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{DOMAIN_LABELS[d.domain] ?? d.domain}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_BG[d.status]} ${STATUS_COLOR[d.status]}`}>
          {d.status}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className={`text-right text-sm font-bold mt-1 ${STATUS_COLOR[d.status]}`}>{pct}/100</div>
    </div>
  );
}

function IssueCard({ issue, idx }: { issue: TopIssue; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-xl border p-4 cursor-pointer hover:border-gray-500 transition-colors`}
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
      onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-3">
        <span className="text-gray-500 font-mono text-sm mt-0.5 w-5 shrink-0">{idx + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${SEVERITY_COLOR[issue.severity]}`}>
              {issue.severity}
            </span>
            <span className="text-xs text-gray-500">{DOMAIN_LABELS[issue.domain] ?? issue.domain}</span>
            {issue.fixable && (
              <span className="text-xs text-[#00e87b] bg-[#00e87b]/10 border border-[#00e87b]/20 px-2 py-0.5 rounded">
                AI Fix Available
              </span>
            )}
          </div>
          <p className="text-sm text-white font-medium">{issue.title}</p>
          {expanded && (
            <div className="mt-3 text-xs text-gray-300 bg-gray-900/50 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
              {issue.fixHint}
            </div>
          )}
        </div>
        <span className="text-gray-600 text-xs mt-0.5 shrink-0">{expanded ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NexusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/nexus/status', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    } catch {
      setError('Failed to load NEXUS status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const triggerEval = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/nexus/eval', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchStatus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Eval failed');
    } finally {
      setRunning(false);
    }
  };

  const status = data?.systemHealth ?? 'UNKNOWN';
  const score = data?.overallScore ?? 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="border-b border-[#222] px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00e87b] flex items-center justify-center">
              <span className="text-black font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-bold">CashPulse</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">Dashboard</Link>
            <Link href="/sales" className="text-sm text-gray-400 hover:text-white transition">Sales Agent</Link>
            <span className="text-sm text-[#00e87b] font-semibold">NEXUS</span>
          </div>
        </div>
      </nav>

      <div className="p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-[#00e87b]">NEXUS</span> Command Center
            </h1>
            <p className="text-gray-400 text-sm mt-1">AI Company Operating System — Measure → Detect → Fix → Loop</p>
          </div>
          <button
            onClick={triggerEval}
            disabled={running}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-[#00e87b] text-black hover:bg-[#00c96a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {running ? (
              <><span className="animate-spin">⟳</span> Running Eval...</>
            ) : (
              '▶ Run Eval Now'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {/* ── System Health ───────────────────────────────────────────── */}
        {loading ? (
          <div className="text-gray-500 text-center py-20 animate-pulse">Loading NEXUS status...</div>
        ) : (
          <>
            <div className={`rounded-2xl border p-6 flex items-center gap-8 flex-wrap ${STATUS_BG[status]}`}>
              <ScoreRing score={score} status={status} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-3 h-3 rounded-full ${STATUS_DOT[status]} ${status === 'RED' ? 'animate-pulse' : ''}`} />
                  <span className={`text-2xl font-bold ${STATUS_COLOR[status]}`}>{status}</span>
                  <span className="text-gray-400 text-sm">System Health</span>
                </div>
                {data?.lastEvalAt && (
                  <p className="text-xs text-gray-500">
                    Last eval: {new Date(data.lastEvalAt).toLocaleString()}
                  </p>
                )}
                {data?.estimatedImpact && (
                  <p className="text-sm text-gray-300 mt-2">{data.estimatedImpact}</p>
                )}
              </div>
            </div>

            {/* ── Domain Scores ─────────────────────────────────────────── */}
            {data?.domainScores && data.domainScores.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-100">Domain Scores</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.domainScores.map((d) => <DomainCard key={d.domain} d={d} />)}
                </div>
              </div>
            )}

            {/* ── Top Issues + Fix Plans ─────────────────────────────────── */}
            {data?.topIssues && data.topIssues.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-100">
                  Issues — Ranked by Priority
                  <span className="ml-2 text-xs font-normal text-gray-500">(click to expand AI fix plan)</span>
                </h2>
                <div className="space-y-2">
                  {data.topIssues.map((issue, i) => (
                    <IssueCard key={i} issue={issue} idx={i} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Board Summary ──────────────────────────────────────────── */}
            {data?.boardSummary && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-100">Board Report</h2>
                <pre className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-5 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                  {data.boardSummary}
                </pre>
              </div>
            )}

            {/* ── Empty State ────────────────────────────────────────────── */}
            {!data?.domainScores?.length && (
              <div className="text-center py-16 text-gray-500">
                <div className="text-5xl mb-4">🔭</div>
                <p className="text-lg font-medium text-gray-300 mb-2">NEXUS is ready</p>
                <p className="text-sm mb-6">No eval data yet. Click &quot;Run Eval Now&quot; to start the first measurement cycle.</p>
                <button onClick={triggerEval} disabled={running}
                  className="px-6 py-3 bg-[#00e87b] text-black font-semibold rounded-xl hover:bg-[#00c96a] transition-colors disabled:opacity-50">
                  {running ? 'Running...' : '▶ Start First Eval'}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <p className="text-center text-xs text-gray-600 pb-4">
          NEXUS evaluates every 6 hours via Vercel cron • DeepSeek-R1 generates fix plans • Stores in Supabase
        </p>
      </div>
      </div>
    </div>
  );
}
