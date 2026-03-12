"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Users,
  Mail,
  Target,
  TrendingUp,
  Zap,
  Globe,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Circle,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface PipelineData {
  new: number;
  contacted: number;
  replied: number;
  trial: number;
  customer: number;
  lost: number;
}

interface NexusReport {
  overall_score: number;
  system_health: string;
  domain_scores: Record<string, { score: number; health: string }>;
  timestamp: string;
}

interface ActivityItem {
  id: string;
  action: string;
  details: string;
  created_at: string;
  lead_name?: string;
}

// â”€â”€â”€ Animated Number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{display}</>;
}

// â”€â”€â”€ Pulse Dot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PulseDot({ color = "#00e87b" }: { color?: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-3 w-3"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

// â”€â”€â”€ Health Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HealthBar({ score, label, delay = 0 }: { score: number; label: string; delay?: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 100 + delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const color =
    score >= 80 ? "#00e87b" : score >= 50 ? "#ffaa00" : "#ff4444";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-[#aaa]">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-[1.5s] ease-out"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// â”€â”€â”€ Pipeline Stage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PipelineStage({
  label,
  count,
  total,
  color,
  delay,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm text-[#aaa] flex-1">{label}</span>
        <span className="font-mono font-bold text-white">
          <AnimatedNumber value={count} />
        </span>
      </div>
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden ml-6">
        <div
          className="h-full rounded-full transition-all duration-[2s] ease-out"
          style={{
            width: visible ? `${Math.max(pct, 2)}%` : "0%",
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function CommandCenter() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [pipeline, setPipeline] = useState<PipelineData>({
    new: 0, contacted: 0, replied: 0, trial: 0, customer: 0, lost: 0,
  });
  const [totalLeads, setTotalLeads] = useState(0);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [emailsSent, setEmailsSent] = useState(0);
  const [nexus, setNexus] = useState<NexusReport | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [leadsToday, setLeadsToday] = useState(0);
  const [emailsToday, setEmailsToday] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      // All queries in parallel
      const [
        leadsRes,
        waitlistRes,
        activityRes,
        nexusRes,
        todayLeadsRes,
        todayActivityRes,
      ] = await Promise.all([
        supabase.from("leads").select("stage"),
        supabase.from("waitlist").select("id", { count: "exact", head: true }),
        supabase
          .from("lead_activity")
          .select("id, action, details, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("nexus_reports")
          .select("*")
          .order("timestamp", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("lead_activity")
          .select("id", { count: "exact", head: true })
          .eq("action", "email_sent")
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      // Pipeline counts
      const leads = leadsRes.data || [];
      const pipe: PipelineData = {
        new: 0, contacted: 0, replied: 0, trial: 0, customer: 0, lost: 0,
      };
      leads.forEach((l: { stage: string }) => {
        if (l.stage in pipe) pipe[l.stage as keyof PipelineData]++;
      });
      setPipeline(pipe);
      setTotalLeads(leads.length);

      // Waitlist
      setWaitlistCount(waitlistRes.count || 0);

      // Activity
      const activities: ActivityItem[] = (activityRes.data || []).map(
        (a: { id: string; action: string; details: string; created_at: string }) => {
          let parsed: Record<string, string> = {};
          try { parsed = JSON.parse(a.details || "{}"); } catch { /* */ }
          return {
            id: a.id,
            action: a.action,
            details: parsed.subject || parsed.to || a.details || "",
            created_at: a.created_at,
            lead_name: parsed.to || "",
          };
        }
      );
      setRecentActivity(activities);

      // Total emails
      const totalEmailsRes = await supabase
        .from("lead_activity")
        .select("id", { count: "exact", head: true })
        .eq("action", "email_sent");
      setEmailsSent(totalEmailsRes.count || 0);

      // NEXUS
      if (nexusRes.data) {
        setNexus(nexusRes.data as unknown as NexusReport);
      }

      // Today stats
      setLeadsToday(todayLeadsRes.count || 0);
      setEmailsToday(todayActivityRes.count || 0);

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, []);

  // Initial load with staggered reveal
  useEffect(() => {
    setMounted(true);
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 600);
  };

  const total = totalLeads || 1;
  const conversionRate =
    totalLeads > 0
      ? ((pipeline.customer / totalLeads) * 100).toFixed(1)
      : "0.0";
  const replyRate =
    totalLeads > 0
      ? (((pipeline.replied + pipeline.trial + pipeline.customer) / totalLeads) * 100).toFixed(1)
      : "0.0";

  const nexusScore = nexus?.overall_score || 0;
  const nexusHealth = nexus?.system_health || "UNKNOWN";
  const nexusColor =
    nexusHealth === "GREEN"
      ? "#00e87b"
      : nexusHealth === "YELLOW"
      ? "#ffaa00"
      : nexusHealth === "RED"
      ? "#ff4444"
      : "#666";

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // â”€â”€â”€ Boot Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-6 animate-pulse">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-[#00e87b]/10 border border-[#00e87b]/30 flex items-center justify-center">
              <Zap className="w-10 h-10 text-[#00e87b] animate-bounce" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl border border-[#00e87b]/20 animate-ping" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Initializing Systems</h2>
            <p className="text-[#555] text-sm mt-1 font-mono">connecting to supabase...</p>
          </div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#00e87b]"
                style={{
                  animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* â”€â”€â”€ Animated Grid Background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#00e87b 1px, transparent 1px), linear-gradient(90deg, #00e87b 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            animation: "grid-drift 20s linear infinite",
          }}
        />
        {/* Corner glow */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#00e87b]/[0.02] rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#00e87b]/[0.015] rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
      </div>

      {/* â”€â”€â”€ Top Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#1a1a1a]">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00e87b] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-lg">CashPulse</span>
            </Link>
            <span className="text-[#333] text-lg">/</span>
            <span className="text-[#666] text-sm font-medium">Command Center</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#555]">
              <PulseDot color={nexusColor} />
              <span>NEXUS {nexusHealth}</span>
            </div>
            <div className="text-xs text-[#444] font-mono">
              {lastRefresh.toLocaleTimeString()}
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-[#1a1a1a] transition"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#666] ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* â”€â”€â”€ Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="max-w-[1400px] mx-auto px-6 py-8 relative">
        {/* Hero Stat Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Leads",
              value: totalLeads,
              icon: Users,
              sub: `+${leadsToday} today`,
              subUp: leadsToday > 0,
              delay: 0,
            },
            {
              label: "Emails Sent",
              value: emailsSent,
              icon: Mail,
              sub: `+${emailsToday} today`,
              subUp: emailsToday > 0,
              delay: 100,
            },
            {
              label: "Waitlist",
              value: waitlistCount,
              icon: Globe,
              sub: "signups",
              subUp: waitlistCount > 0,
              delay: 200,
            },
            {
              label: "NEXUS Score",
              value: nexusScore,
              icon: Activity,
              sub: nexusHealth,
              subUp: nexusScore >= 60,
              delay: 300,
            },
          ].map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* â”€â”€â”€ Pipeline (2/3 width) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pipeline Funnel */}
            <Card title="Sales Pipeline" icon={Target} delay={400}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-4">
                <PipelineStage label="New" count={pipeline.new} total={total} color="#6366f1" delay={500} />
                <PipelineStage label="Contacted" count={pipeline.contacted} total={total} color="#f59e0b" delay={600} />
                <PipelineStage label="Replied" count={pipeline.replied} total={total} color="#a855f7" delay={700} />
                <PipelineStage label="Trial" count={pipeline.trial} total={total} color="#3b82f6" delay={800} />
                <PipelineStage label="Customer" count={pipeline.customer} total={total} color="#00e87b" delay={900} />
                <PipelineStage label="Lost" count={pipeline.lost} total={total} color="#ef4444" delay={1000} />
              </div>

              <div className="flex gap-6 mt-6 pt-4 border-t border-[#1a1a1a]">
                <div>
                  <div className="text-xs text-[#555] uppercase tracking-wider">Reply Rate</div>
                  <div className="text-2xl font-bold text-white font-mono">{replyRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-[#555] uppercase tracking-wider">Conversion</div>
                  <div className="text-2xl font-bold text-[#00e87b] font-mono">{conversionRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-[#555] uppercase tracking-wider">Total Pipeline</div>
                  <div className="text-2xl font-bold text-white font-mono">
                    <AnimatedNumber value={totalLeads} />
                  </div>
                </div>
              </div>
            </Card>

            {/* NEXUS Health */}
            <Card title="System Health â€” NEXUS" icon={BarChart3} delay={600}>
              {nexus?.domain_scores ? (
                <div className="space-y-4 mt-4">
                  {Object.entries(nexus.domain_scores).map(([domain, data], i) => (
                    <HealthBar
                      key={domain}
                      label={domain.replace(/_/g, " ")}
                      score={(data as { score: number }).score}
                      delay={i * 150}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-[#444] text-sm mt-4 py-8 text-center">
                  No NEXUS report yet. First evaluation runs at 8am.
                </div>
              )}
              {nexus?.timestamp && (
                <div className="text-xs text-[#444] mt-4 font-mono">
                  Last eval: {new Date(nexus.timestamp).toLocaleString()}
                </div>
              )}
            </Card>
          </div>

          {/* â”€â”€â”€ Sidebar (1/3 width) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card title="Quick Actions" icon={Zap} delay={500}>
              <div className="space-y-2 mt-4">
                <ActionButton
                  label="Scout New Leads"
                  href="/api/automate?action=scout"
                  method="GET"
                />
                <ActionButton
                  label="Send Sequences"
                  href="/api/automate?action=send-sequence"
                  method="GET"
                />
                <ActionButton
                  label="Run NEXUS Eval"
                  href="/api/nexus/eval"
                  method="POST"
                  headerKey="x-nexus-key"
                />
                <Link
                  href="/sales"
                  className="block w-full text-center py-2.5 rounded-xl bg-[#00e87b]/10 text-[#00e87b] text-sm font-medium hover:bg-[#00e87b]/20 transition border border-[#00e87b]/20"
                >
                  Open Sales Agent â†’
                </Link>
                <Link
                  href="/nexus"
                  className="block w-full text-center py-2.5 rounded-xl bg-[#1a1a1a] text-[#aaa] text-sm font-medium hover:bg-[#222] transition border border-white/[0.06]"
                >
                  NEXUS Console â†’
                </Link>
              </div>
            </Card>

            {/* Activity Feed */}
            <Card title="Live Activity" icon={Activity} delay={700}>
              <div className="space-y-0 mt-3 max-h-[400px] overflow-y-auto">
                {recentActivity.length > 0 ? (
                  recentActivity.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 py-2.5 border-b border-[#111] last:border-0 opacity-0 animate-fade-in"
                      style={{ animationDelay: `${800 + i * 80}ms`, animationFillMode: "forwards" }}
                    >
                      <div className="mt-1">
                        {item.action === "email_sent" ? (
                          <Mail className="w-3.5 h-3.5 text-[#00e87b]" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-[#555]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#ccc] truncate">
                          {item.action === "email_sent" ? "Email sent" : item.action}
                        </p>
                        <p className="text-[10px] text-[#555] truncate font-mono">
                          {item.details}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#444] whitespace-nowrap">
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[#444] text-sm py-8 text-center">
                    No activity yet. Scout some leads to start.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="flex items-center justify-center gap-6 mt-12 mb-8 text-xs text-[#444]">
          <Link href="/dashboard" className="hover:text-[#00e87b] transition">Dashboard</Link>
          <Link href="/sales" className="hover:text-[#00e87b] transition">Sales Agent</Link>
          <Link href="/nexus" className="hover:text-[#00e87b] transition">NEXUS</Link>
          <Link href="/voice" className="hover:text-[#00e87b] transition">Voice</Link>
          <Link href="/demo" className="hover:text-[#00e87b] transition">Demo</Link>
          <a href="https://github.com/abdellrahmanv/C_P" target="_blank" rel="noopener noreferrer" className="hover:text-[#00e87b] transition">GitHub</a>
        </div>
      </main>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SUB-COMPONENTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  subUp,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  sub: string;
  subUp: boolean;
  delay: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`bg-[#111]/80 backdrop-blur-sm border border-[#1a1a1a] rounded-2xl p-5 transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-95"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-[#00e87b]/5 border border-[#00e87b]/10">
          <Icon className="w-4 h-4 text-[#00e87b]" />
        </div>
        {subUp ? (
          <ArrowUpRight className="w-4 h-4 text-[#00e87b]" />
        ) : (
          <ArrowDownRight className="w-4 h-4 text-[#555]" />
        )}
      </div>
      <div className="text-3xl font-bold font-mono text-white mb-1">
        <AnimatedNumber value={value} duration={1500} />
      </div>
      <div className="text-xs text-[#666]">{label}</div>
      <div className={`text-[10px] mt-1 ${subUp ? "text-[#00e87b]" : "text-[#555]"}`}>
        {sub}
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  delay,
  children,
}: {
  title: string;
  icon: React.ElementType;
  delay: number;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`bg-[#111]/80 backdrop-blur-sm border border-[#1a1a1a] rounded-2xl p-6 transition-all duration-700 ease-out ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#00e87b]" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  href,
  method = "GET",
  headerKey,
}: {
  label: string;
  href: string;
  method?: string;
  headerKey?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const run = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: href, method, headerKey }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 3000);
  };

  return (
    <button
      onClick={run}
      disabled={state === "loading"}
      className={`w-full py-2.5 rounded-xl text-sm font-medium transition border ${
        state === "done"
          ? "bg-[#00e87b]/10 border-[#00e87b]/30 text-[#00e87b]"
          : state === "error"
          ? "bg-red-500/10 border-red-500/30 text-red-400"
          : "bg-[#1a1a1a] border-white/[0.06] text-[#aaa] hover:bg-[#222] hover:text-white"
      } disabled:opacity-50`}
    >
      {state === "loading" ? (
        <span className="inline-flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Running...
        </span>
      ) : state === "done" ? (
        "âœ“ Done"
      ) : state === "error" ? (
        "âœ— Failed"
      ) : (
        label
      )}
    </button>
  );
}
