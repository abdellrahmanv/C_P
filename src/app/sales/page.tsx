"use client";

import { useState, useCallback, useEffect } from "react";
import {
  DollarSign,
  Users,
  Mail,
  Search,
  Send,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  Target,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Zap,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Download,
} from "lucide-react";
import Link from "next/link";
import type { Lead, SalesMetrics } from "@/lib/sales-types";
import {
  generateMockLeads,
  getColdEmailSequence,
  calculateSalesMetrics,
} from "@/lib/sales-engine";
import { supabase } from "@/lib/supabase";

type ViewType = "pipeline" | "leads" | "sequences" | "settings";

export default function SalesAgent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("pipeline");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activityLog, setActivityLog] = useState<string[]>([]);

  // Settings
  const [apolloKey, setApolloKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [senderName, setSenderName] = useState("CashPulse");
  const [dailyLimit, setDailyLimit] = useState(100);

  // Load leads from Supabase on mount, fallback to mock data
  useEffect(() => {
    async function loadLeads() {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .order("score", { ascending: false })
          .limit(200);

        if (!error && data && data.length > 0) {
          const dbLeads: Lead[] = data.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            companyName: (row.company_name as string) || "Unknown",
            contactName: (row.contact_name as string) || "Unknown",
            contactTitle: (row.contact_title as string) || "",
            email: (row.contact_email as string) || "",
            industry: (row.industry as string) || "",
            employeeCount: (row.employee_count as number) || 0,
            website: (row.website as string) || "",
            source: ((row.source as string) || "apollo") as Lead["source"],
            status: (row.stage as Lead["status"]) || "new",
            score: (row.score as number) || 0,
            sequenceStep: (row.sequence_step as number) || 0,
            notes: (row.notes as string) || "",
            createdAt: (row.created_at as string) || new Date().toISOString(),
            lastContactedAt: (row.last_contacted_at as string) || undefined,
            tags: [],
          }));
          setLeads(dbLeads);
          setMetrics(calculateSalesMetrics(dbLeads));
          return;
        }
      } catch {
        // fallback to mock
      }
      const demoLeads = generateMockLeads(50);
      setLeads(demoLeads);
      setMetrics(calculateSalesMetrics(demoLeads));
    }
    loadLeads();
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 100));
  }, []);

  // Scout for new leads
  const handleScout = useCallback(async () => {
    setIsLoading(true);
    addLog("ðŸ” Scouting for new leads...");

    try {
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apolloKey }),
      });
      const data = await response.json();

      if (data.success) {
        addLog(`âœ… Found ${data.count} leads, ${data.saved} new saved (${data.source})`);

        // Reload from Supabase to get persisted data
        const { data: dbLeads } = await supabase
          .from("leads")
          .select("*")
          .order("score", { ascending: false })
          .limit(200);

        if (dbLeads && dbLeads.length > 0) {
          const mapped: Lead[] = dbLeads.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            companyName: (row.company_name as string) || "Unknown",
            contactName: (row.contact_name as string) || "Unknown",
            contactTitle: (row.contact_title as string) || "",
            email: (row.contact_email as string) || "",
            industry: (row.industry as string) || "",
            employeeCount: (row.employee_count as number) || 0,
            website: (row.website as string) || "",
            source: ((row.source as string) || "apollo") as Lead["source"],
            status: (row.stage as Lead["status"]) || "new",
            score: (row.score as number) || 0,
            sequenceStep: (row.sequence_step as number) || 0,
            notes: (row.notes as string) || "",
            createdAt: (row.created_at as string) || new Date().toISOString(),
            lastContactedAt: (row.last_contacted_at as string) || undefined,
            tags: [],
          }));
          setLeads(mapped);
          setMetrics(calculateSalesMetrics(mapped));
        }
      }
    } catch {
      addLog("âŒ Scout failed â€” check connection");
    }

    setIsLoading(false);
  }, [apolloKey, addLog]);

  // Send cold email to a specific lead
  const handleSendEmail = useCallback(
    async (lead: Lead) => {
      const sequence = getColdEmailSequence(lead, senderName);
      const step = sequence[lead.sequenceStep] || sequence[0];

      addLog(`ðŸ“§ Sending email to ${lead.contactName} @ ${lead.companyName} (Step ${step.step})...`);

      try {
        const response = await fetch("/api/cold-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead,
            subject: step.subject,
            emailBody: step.body,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Update lead
          const updatedLeads = leads.map((l) =>
            l.id === lead.id
              ? {
                  ...l,
                  sequenceStep: l.sequenceStep + 1,
                  lastContactedAt: new Date().toISOString(),
                  status: l.status === "new" ? ("contacted" as const) : l.status,
                }
              : l
          );
          setLeads(updatedLeads);
          setMetrics(calculateSalesMetrics(updatedLeads));
          addLog(`âœ… Email sent to ${lead.contactName} (${data.mode || "live"}, personalized: ${data.personalized || false})`);
        }
      } catch {
        addLog(`âŒ Failed to send email to ${lead.contactName}`);
      }
    },
    [leads, senderName, addLog]
  );

  // Auto-run: send next sequence email to all due leads
  const handleAutoRun = useCallback(async () => {
    const today = new Date();
    const dueLeads = leads
      .filter((l) => l.status === "new" || l.status === "contacted")
      .filter((l) => l.sequenceStep < 5)
      .filter((l) => {
        if (!l.lastContactedAt) return true;
        const lastContact = new Date(l.lastContactedAt);
        const daysSince = Math.floor((today.getTime() - lastContact.getTime()) / 86400000);
        const sequence = getColdEmailSequence(l, senderName);
        const nextStep = sequence[l.sequenceStep];
        return nextStep && daysSince >= nextStep.delayDays;
      })
      .slice(0, dailyLimit);

    addLog(`ðŸš€ Auto-run started: ${dueLeads.length} leads ready`);

    for (const lead of dueLeads) {
      await handleSendEmail(lead);
      // Small delay between sends
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    addLog(`âœ… Auto-run complete: processed ${dueLeads.length} leads`);
  }, [leads, senderName, dailyLimit, handleSendEmail, addLog]);

  // Toggle agent on/off
  const toggleAgent = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      addLog("â¸ Sales agent paused");
    } else {
      setIsRunning(true);
      addLog("â–¶ Sales agent started");
      handleAutoRun();
    }
  }, [isRunning, handleAutoRun, addLog]);

  // Filter leads
  const filteredLeads = leads
    .filter((l) => filterStatus === "all" || l.status === filterStatus)
    .filter(
      (l) =>
        !searchQuery ||
        l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.industry.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.score - a.score);

  const statusColor = (status: string) => {
    switch (status) {
      case "customer": return "bg-green-500/10 text-green-400 border-green-500/30";
      case "trial": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "replied": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "contacted": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "lost": return "bg-red-500/10 text-red-400 border-red-500/30";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00e87b] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold">CashPulse</span>
            </Link>
            <span className="text-white/[0.15]">|</span>
            <span className="text-sm text-[#888]">Sales Agent</span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${isRunning ? "bg-green-500/10 text-green-400" : "bg-white/[0.04] text-[#888]"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-green-400 animate-pulse" : "bg-[#555]"}`} />
              {isRunning ? "Running" : "Paused"}
            </div>
          </div>
          <button
            onClick={toggleAgent}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              isRunning
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-[#00e87b] text-black hover:bg-[#00c966]"
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? "Stop Agent" : "Start Agent"}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <MetricCard icon={Users} label="Total Leads" value={metrics.totalLeads} color="#00e87b" />
            <MetricCard icon={Mail} label="Contacted" value={metrics.contacted} sub={`${metrics.replyRate}% reply rate`} color="#ffaa00" />
            <MetricCard icon={Target} label="Replied" value={metrics.replied} color="#a855f7" />
            <MetricCard icon={Zap} label="Trials" value={metrics.trials} sub={`${metrics.trialRate}% trial rate`} color="#3b82f6" />
            <MetricCard icon={DollarSign} label="Customers" value={metrics.customers} sub={`$${metrics.revenue}/mo`} color="#00e87b" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#111] rounded-xl p-1 border border-white/[0.06] overflow-x-auto">
          {([
            { id: "pipeline", label: "Pipeline", icon: BarChart3 },
            { id: "leads", label: "All Leads", icon: Users },
            { id: "sequences", label: "Email Sequences", icon: Mail },
            { id: "settings", label: "Settings", icon: Zap },
          ] as { id: ViewType; label: string; icon: typeof BarChart3 }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeView === tab.id ? "bg-[#00e87b] text-black" : "text-[#888] hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pipeline View */}
        {activeView === "pipeline" && (
          <div className="grid md:grid-cols-5 gap-4">
            {(["new", "contacted", "replied", "trial", "customer"] as const).map((status) => {
              const stageLeads = leads.filter((l) => l.status === status);
              const stageLabels = {
                new: "New Leads",
                contacted: "Contacted",
                replied: "Replied",
                trial: "In Trial",
                customer: "Customer ðŸ’°",
              };
              return (
                <div key={status} className="bg-[#111] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-sm">{stageLabels[status]}</h3>
                    <span className="text-xs bg-[#222] px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {stageLeads.slice(0, 15).map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="bg-[#0a0a0a] rounded-xl p-3 cursor-pointer hover:border-[#00e87b]/50 border border-transparent transition"
                      >
                        <div className="font-medium text-xs truncate">{lead.companyName}</div>
                        <div className="text-xs text-[#888] truncate">{lead.contactName}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-[#555]">{lead.contactTitle}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${lead.score >= 60 ? "bg-green-500/10 text-green-400" : lead.score >= 40 ? "bg-yellow-500/10 text-yellow-400" : "bg-[#222] text-[#888]"}`}>
                            {lead.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {status === "new" && (
                    <button
                      onClick={handleScout}
                      disabled={isLoading}
                      className="w-full mt-3 bg-[#222] text-sm py-2 rounded-lg hover:bg-[#333] transition flex items-center justify-center gap-2"
                    >
                      <Search className="w-3 h-3" />
                      {isLoading ? "Scouting..." : "Find More Leads"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* All Leads View */}
        {activeView === "leads" && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search leads..."
                    className="w-full bg-[#111] border border-white/[0.1] rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-[#00e87b] focus:outline-none"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#111] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm focus:border-[#00e87b] focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="replied">Replied</option>
                <option value="trial">Trial</option>
                <option value="customer">Customer</option>
                <option value="lost">Lost</option>
              </select>
              <button
                onClick={handleScout}
                disabled={isLoading}
                className="bg-[#00e87b] text-black px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#00c966] transition flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {isLoading ? "Scouting..." : "Scout New Leads"}
              </button>
            </div>

            {/* Lead table */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Company</th>
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Contact</th>
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Industry</th>
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Size</th>
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Score</th>
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Step</th>
                      <th className="px-4 py-3 text-left text-[#888] font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-white/[0.06]/50 hover:bg-[#1a1a1a] transition">
                        <td className="px-4 py-3">
                          <div className="font-medium">{lead.companyName}</div>
                          <div className="text-xs text-[#555]">{lead.website}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{lead.contactName}</div>
                          <div className="text-xs text-[#888]">{lead.contactTitle}</div>
                        </td>
                        <td className="px-4 py-3 text-[#888]">{lead.industry}</td>
                        <td className="px-4 py-3 text-[#888]">{lead.employeeCount}</td>
                        <td className="px-4 py-3">
                          <span className={`font-mono font-bold ${lead.score >= 60 ? "text-green-400" : lead.score >= 40 ? "text-yellow-400" : "text-[#888]"}`}>
                            {lead.score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border ${statusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#888]">{lead.sequenceStep}/5</td>
                        <td className="px-4 py-3">
                          {(lead.status === "new" || lead.status === "contacted") && lead.sequenceStep < 5 && (
                            <button
                              onClick={() => handleSendEmail(lead)}
                              className="text-xs bg-[#00e87b]/10 text-[#00e87b] px-3 py-1.5 rounded-lg hover:bg-[#00e87b]/20 transition flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              Send
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Sequences View */}
        {activeView === "sequences" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sequence preview */}
            <div className="space-y-4">
              <h3 className="font-bold mb-4">5-Email Cold Sequence</h3>
              {getColdEmailSequence(
                {
                  id: "preview",
                  companyName: "{Company}",
                  contactName: "{First Name}",
                  contactTitle: "CFO",
                  email: "preview@example.com",
                  industry: "{Industry}",
                  employeeCount: 100,
                  source: "apollo",
                  status: "new",
                  score: 75,
                  sequenceStep: 0,
                  notes: "",
                  createdAt: new Date().toISOString(),
                  tags: [],
                },
                senderName
              ).map((step) => (
                <div key={step.step} className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        step.type === "initial" ? "bg-blue-500/10 text-blue-400" :
                        step.type === "followup" ? "bg-yellow-500/10 text-yellow-400" :
                        step.type === "value" ? "bg-purple-500/10 text-purple-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {step.type}
                      </span>
                      <span className="text-sm font-medium">Step {step.step}</span>
                    </div>
                    <span className="text-xs text-[#888]">
                      {step.delayDays === 0 ? "Immediate" : `+${step.delayDays} days`}
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-2 text-[#ccc]">{step.subject}</div>
                  <pre className="text-xs text-[#888] whitespace-pre-wrap font-sans max-h-32 overflow-y-auto">
                    {step.body}
                  </pre>
                </div>
              ))}
            </div>

            {/* Activity log */}
            <div>
              <h3 className="font-bold mb-4">Activity Log</h3>
              <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5">
                <div className="space-y-2 max-h-[600px] overflow-y-auto font-mono text-xs">
                  {activityLog.length === 0 ? (
                    <p className="text-[#555]">No activity yet. Start the agent or send an email.</p>
                  ) : (
                    activityLog.map((log, i) => (
                      <div key={i} className="text-[#888] py-1 border-b border-white/[0.06]/50">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={handleAutoRun}
                  className="w-full bg-[#00e87b] text-black py-3 rounded-xl font-semibold hover:bg-[#00c966] transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Run All Due Sequences Now
                </button>
                <button
                  onClick={handleScout}
                  disabled={isLoading}
                  className="w-full bg-[#222] py-3 rounded-xl font-semibold hover:bg-[#333] transition flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {isLoading ? "Scouting..." : "Scout 50 New Leads"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings View */}
        {activeView === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-bold mb-6">API Keys</h3>
              <p className="text-sm text-[#888] mb-6">
                All APIs have free tiers. The agent works in demo mode without keys.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#888] mb-1 block">
                    Apollo.io API Key{" "}
                    <a href="https://app.apollo.io/#/settings/integrations/api" target="_blank" rel="noopener noreferrer" className="text-[#00e87b] hover:underline">
                      (get free key)
                    </a>
                  </label>
                  <input
                    type="password"
                    value={apolloKey}
                    onChange={(e) => setApolloKey(e.target.value)}
                    placeholder="10,000 leads/month free"
                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm focus:border-[#00e87b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#888] mb-1 block">
                    Groq API Key{" "}
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[#00e87b] hover:underline">
                      (get free key)
                    </a>
                  </label>
                  <input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="Free Llama 3.1 70B for email personalization"
                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm focus:border-[#00e87b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#888] mb-1 block">
                    Resend API Key{" "}
                    <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#00e87b] hover:underline">
                      (get free key)
                    </a>
                  </label>
                  <input
                    type="password"
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    placeholder="3,000 emails/month free"
                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm focus:border-[#00e87b] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-bold mb-6">Agent Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#888] mb-1 block">Sender Name (appears in emails)</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm focus:border-[#00e87b] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#888] mb-1 block">Daily email limit</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(parseInt(e.target.value) || 100)}
                    min={1}
                    max={500}
                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-sm focus:border-[#00e87b] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-bold mb-4">PayPal Setup</h3>
              <p className="text-sm text-[#888] mb-4">
                Create subscription plans in your PayPal Developer Dashboard.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">1.</span>
                  <div>
                    <p className="font-medium">Go to <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="text-[#00e87b] hover:underline">developer.paypal.com</a></p>
                    <p className="text-[#888] text-xs">Create a business app to get Client ID and Secret</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">2.</span>
                  <div>
                    <p className="font-medium">Create 3 Subscription Plans</p>
                    <p className="text-[#888] text-xs">Starter ($49/mo), Growth ($149/mo), Scale ($349/mo)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">3.</span>
                  <div>
                    <p className="font-medium">Add Plan IDs to .env.local</p>
                    <p className="text-[#888] text-xs font-mono">PAYPAL_STARTER_PLAN_ID=P-xxxxx</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">4.</span>
                  <div>
                    <p className="font-medium">Set webhook URL</p>
                    <p className="text-[#888] text-xs font-mono">https://your-domain.com/api/paypal</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-bold mb-4">Deploy to Vercel (Free)</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">1.</span>
                  <div>
                    <p className="font-medium">Push to GitHub</p>
                    <p className="text-[#888] text-xs font-mono">git remote add origin your-repo.git && git push</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">2.</span>
                  <div>
                    <p className="font-medium">Import on Vercel</p>
                    <p className="text-[#888] text-xs">Connect your GitHub repo at <a href="https://vercel.com/new" target="_blank" rel="noopener noreferrer" className="text-[#00e87b]">vercel.com/new</a></p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">3.</span>
                  <div>
                    <p className="font-medium">Add Environment Variables</p>
                    <p className="text-[#888] text-xs">RESEND_API_KEY, APOLLO_API_KEY, GROQ_API_KEY, PAYPAL keys</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-xl">
                  <span className="text-[#00e87b] font-bold">4.</span>
                  <div>
                    <p className="font-medium">Set up Vercel Cron (free)</p>
                    <p className="text-[#888] text-xs">Auto-run scout & sequences daily â€” add vercel.json cron config</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{selectedLead.companyName}</h3>
                  <p className="text-[#888]">{selectedLead.contactName} Â· {selectedLead.contactTitle}</p>
                </div>
                <button onClick={() => setSelectedLead(null)} className="text-[#888] hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#0a0a0a] rounded-xl p-3">
                  <div className="text-xs text-[#888]">Score</div>
                  <div className="text-lg font-bold text-[#00e87b]">{selectedLead.score}/100</div>
                </div>
                <div className="bg-[#0a0a0a] rounded-xl p-3">
                  <div className="text-xs text-[#888]">Status</div>
                  <div className="text-lg font-bold capitalize">{selectedLead.status}</div>
                </div>
                <div className="bg-[#0a0a0a] rounded-xl p-3">
                  <div className="text-xs text-[#888]">Industry</div>
                  <div className="text-sm font-medium">{selectedLead.industry}</div>
                </div>
                <div className="bg-[#0a0a0a] rounded-xl p-3">
                  <div className="text-xs text-[#888]">Employees</div>
                  <div className="text-sm font-medium">{selectedLead.employeeCount}</div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="text-sm"><span className="text-[#888]">Email:</span> <span className="text-[#ccc]">{selectedLead.email}</span></div>
                {selectedLead.website && (
                  <div className="text-sm"><span className="text-[#888]">Website:</span> <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-[#00e87b] hover:underline">{selectedLead.website}</a></div>
                )}
                <div className="text-sm"><span className="text-[#888]">Sequence Step:</span> <span className="text-[#ccc]">{selectedLead.sequenceStep}/5</span></div>
                {selectedLead.lastContactedAt && (
                  <div className="text-sm"><span className="text-[#888]">Last Contacted:</span> <span className="text-[#ccc]">{new Date(selectedLead.lastContactedAt).toLocaleDateString()}</span></div>
                )}
              </div>

              <div className="flex gap-3">
                {(selectedLead.status === "new" || selectedLead.status === "contacted") && selectedLead.sequenceStep < 5 && (
                  <button
                    onClick={() => { handleSendEmail(selectedLead); setSelectedLead(null); }}
                    className="flex-1 bg-[#00e87b] text-black py-2.5 rounded-xl font-semibold hover:bg-[#00c966] transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Next Email
                  </button>
                )}
                <button
                  onClick={() => {
                    setLeads((prev) =>
                      prev.map((l) =>
                        l.id === selectedLead.id ? { ...l, status: "replied" as const } : l
                      )
                    );
                    setSelectedLead(null);
                  }}
                  className="flex-1 bg-[#222] py-2.5 rounded-xl font-semibold hover:bg-[#333] transition"
                >
                  Mark as Replied
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-[#888] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-[#888] mt-1">{sub}</div>}
    </div>
  );
}
