"use client";

import { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import {
  DollarSign,
  Upload,
  AlertTriangle,
  Clock,
  TrendingUp,
  Mail,
  Download,
  BarChart3,
  Users,
  FileText,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  parseInvoices,
  calculateStats,
  calculateAging,
  getCustomerRisks,
  generateFollowUpActions,
  generateEmailTemplates,
  formatCurrency,
  generateSampleCSV,
} from "@/lib/engine";
import type {
  Invoice,
  DashboardStats,
  AgingBucket,
  CustomerRisk,
  FollowUpAction,
} from "@/lib/types";

type TabType = "overview" | "invoices" | "customers" | "emails" | "roi";

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [customerRisks, setCustomerRisks] = useState<CustomerRisk[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpAction[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Invoice>("riskScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const processData = useCallback(
    (rows: Record<string, string>[], persist = true) => {
      setIsLoading(true);
      setTimeout(async () => {
        const parsed = parseInvoices(rows);
        setInvoices(parsed);
        setStats(calculateStats(parsed));
        setAging(calculateAging(parsed));
        setCustomerRisks(getCustomerRisks(parsed));
        setFollowUps(generateFollowUpActions(parsed, companyName || "Your Company"));
        setIsLoading(false);
        setActiveTab("overview");

        // Persist to Supabase
        if (persist) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Clear old invoices for this user, then insert new
            await supabase.from("invoices").delete().eq("user_id", user.id);
            const inserts = parsed.map((inv) => ({
              user_id: user.id,
              invoice_number: inv.invoiceNumber,
              customer_name: inv.customerName,
              customer_email: inv.customerEmail,
              amount: inv.amount,
              due_date: inv.dueDate,
              status: inv.status,
              risk_score: inv.riskScore,
              risk_level: inv.riskLevel,
              days_past_due: inv.daysPastDue,
            }));
            await supabase.from("invoices").insert(inserts);
          }
        }
      }, 300);
    },
    [companyName]
  );

  // Load saved invoices on mount
  useEffect(() => {
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        // Convert DB rows back to the format parseInvoices expects
        const rows = data.map((d) => ({
          customer_name: d.customer_name || "",
          invoice_number: d.invoice_number || "",
          amount: String(d.amount || 0),
          due_date: d.due_date || "",
          status: d.status || "",
          email: d.customer_email || "",
        }));
        processData(rows, false);
      }
    }
    loadSaved();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = useCallback(
    (file: File) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processData(results.data as Record<string, string>[]);
        },
      });
    },
    [processData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  const handleDemoData = useCallback(() => {
    const csv = generateSampleCSV();
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
    processData(parsed.data as Record<string, string>[]);
  }, [processData]);

  const downloadSampleCSV = useCallback(() => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cashpulse-sample-invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const sortedInvoices = [...invoices].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return sortDir === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const toggleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const riskColor = (level: string) => {
    switch (level) {
      case "critical": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const riskBg = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/10 border-red-500/30";
      case "high": return "bg-orange-500/10 border-orange-500/30";
      case "medium": return "bg-yellow-500/10 border-yellow-500/30";
      case "low": return "bg-green-500/10 border-green-500/30";
      default: return "bg-gray-500/10 border-gray-500/30";
    }
  };

  // Upload screen
  if (invoices.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
        {/* Gradient orb */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00e87b]/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <nav className="border-b border-white/[0.06] px-6 py-4 relative">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00e87b] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold">CashPulse</span>
            </Link>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-20 relative">
          <h1 className="text-3xl font-bold mb-2">Upload your invoices</h1>
          <p className="text-[#888] mb-8">
            Drop a CSV file with your invoice data. We&apos;ll show you exactly
            where your money is — in 60 seconds.
          </p>

          <div className="mb-6">
            <label className="text-sm text-[#888] mb-2 block">Your company name (for email templates)</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder-[#555] focus:border-[#00e87b] focus:outline-none transition"
            />
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
              dragOver
                ? "border-[#00e87b] bg-[#00e87b]/5 scale-[1.01]"
                : "border-white/[0.1] hover:border-white/[0.2]"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".csv";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFileUpload(file);
              };
              input.click();
            }}
          >
            <Upload className="w-12 h-12 text-[#555] mx-auto mb-4" />
            <p className="text-lg mb-2">
              Drop your CSV file here or{" "}
              <span className="text-[#00e87b]">click to browse</span>
            </p>
            <p className="text-sm text-[#888]">
              Columns: customer_name, invoice_number, amount, due_date, status, email
            </p>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleDemoData}
              className="flex-1 bg-[#111] border border-white/[0.06] rounded-xl px-6 py-3 text-sm hover:border-[#00e87b] transition-colors flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Try with demo data
            </button>
            <button
              onClick={downloadSampleCSV}
              className="flex-1 bg-[#111] border border-white/[0.06] rounded-xl px-6 py-3 text-sm hover:border-[#00e87b] transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download sample CSV
            </button>
          </div>

          <div className="mt-12 bg-[#111] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="font-bold mb-3">Expected CSV format:</h3>
            <code className="text-xs text-[#888] block overflow-x-auto whitespace-pre">
{`customer_name,invoice_number,amount,due_date,issue_date,status,email
Acme Corp,INV-001,15000,2026-02-15,2026-01-15,unpaid,ar@acme.com
Beta LLC,INV-002,8500,2026-03-01,2026-02-01,paid,billing@beta.com`}
            </code>
            <p className="text-xs text-[#888] mt-3">
              Flexible column names supported. Minimum: customer name, amount, due date.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/[0.1] border-t-[#00e87b] rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-bold mb-2">Analyzing your invoices...</h2>
          <p className="text-[#888]">Predicting late payments and calculating risk scores</p>
        </div>
      </div>
    );
  }

  // Dashboard
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
            <span className="text-sm text-[#888]">{invoices.length} invoices loaded</span>
          </div>
          <button
            onClick={() => {
              setInvoices([]);
              setStats(null);
            }}
            className="text-sm text-[#888] hover:text-white transition flex items-center gap-1"
          >
            <Upload className="w-4 h-4" /> New Upload
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stat Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Outstanding"
              value={formatCurrency(stats.totalOutstanding)}
              icon={DollarSign}
              color="#00e87b"
            />
            <StatCard
              label="At Risk (High+)"
              value={formatCurrency(stats.totalAtRisk)}
              icon={AlertTriangle}
              color="#ff4444"
              sub={`${stats.atRiskCount} invoices`}
            />
            <StatCard
              label="Overdue"
              value={formatCurrency(stats.totalOverdue)}
              icon={Clock}
              color="#ffaa00"
              sub={`${stats.overdueCount} invoices, avg ${stats.avgDaysToPayment} days`}
            />
            <StatCard
              label="Est. Recoverable"
              value={formatCurrency(stats.recoveredThisMonth)}
              icon={TrendingUp}
              color="#00e87b"
              sub="with auto follow-ups"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#111] rounded-xl p-1 border border-white/[0.06] overflow-x-auto">
          {(
            [
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "invoices", label: "Invoices", icon: FileText },
              { id: "customers", label: "Customers", icon: Users },
              { id: "emails", label: "Follow-Ups", icon: Mail },
              { id: "roi", label: "ROI", icon: TrendingUp },
            ] as { id: TabType; label: string; icon: typeof BarChart3 }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#00e87b] text-black"
                  : "text-[#888] hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Aging Chart */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-bold mb-6">Aging Analysis</h3>
              <div className="space-y-4">
                {aging.map((bucket) => {
                  const maxAmount = Math.max(...aging.map((b) => b.amount));
                  const width = maxAmount > 0 ? (bucket.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={bucket.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#ccc]">{bucket.label}</span>
                        <span className="font-mono">
                          {formatCurrency(bucket.amount)}{" "}
                          <span className="text-[#888]">({bucket.count})</span>
                        </span>
                      </div>
                      <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${width}%`,
                            backgroundColor: bucket.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Risky Customers */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6">
              <h3 className="font-bold mb-6">Top Risky Customers</h3>
              <div className="space-y-3">
                {customerRisks.slice(0, 8).map((customer) => (
                  <div
                    key={customer.name}
                    className={`flex items-center justify-between p-3 rounded-xl border ${riskBg(customer.riskLevel)}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{customer.name}</div>
                      <div className="text-xs text-[#888]">
                        {customer.invoiceCount} invoice{customer.invoiceCount > 1 ? "s" : ""} · avg {customer.avgDaysLate} days late
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{formatCurrency(customer.totalOwed)}</div>
                      <div className={`text-xs font-medium uppercase ${riskColor(customer.riskLevel)}`}>
                        {customer.riskLevel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 md:col-span-2">
              <h3 className="font-bold mb-4">Recommended Actions</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab("emails")}
                  className="bg-[#00e87b]/10 border border-[#00e87b]/30 rounded-xl p-4 text-left hover:border-[#00e87b] transition"
                >
                  <Mail className="w-5 h-5 text-[#00e87b] mb-2" />
                  <div className="font-medium text-sm">Send Follow-Ups</div>
                  <div className="text-xs text-[#888] mt-1">
                    {followUps.filter((f) => !f.sent).length} emails ready to send
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("customers")}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-left hover:border-red-500 transition"
                >
                  <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
                  <div className="font-medium text-sm">Review High Risk</div>
                  <div className="text-xs text-[#888] mt-1">
                    {customerRisks.filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").length} customers need attention
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("roi")}
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-left hover:border-yellow-500 transition"
                >
                  <TrendingUp className="w-5 h-5 text-yellow-500 mb-2" />
                  <div className="font-medium text-sm">See Your ROI</div>
                  <div className="text-xs text-[#888] mt-1">
                    How much CashPulse saves you
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {[
                      { key: "customerName", label: "Customer" },
                      { key: "invoiceNumber", label: "Invoice #" },
                      { key: "amount", label: "Amount" },
                      { key: "dueDate", label: "Due Date" },
                      { key: "daysPastDue", label: "Days Late" },
                      { key: "riskScore", label: "Risk" },
                      { key: "status", label: "Status" },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key as keyof Invoice)}
                        className="px-4 py-3 text-left text-[#888] font-medium cursor-pointer hover:text-white transition"
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortField === col.key &&
                            (sortDir === "desc" ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronUp className="w-3 h-3" />
                            ))}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition"
                    >
                      <td className="px-4 py-3 font-medium">{inv.customerName}</td>
                      <td className="px-4 py-3 text-[#888] font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(inv.amount)}</td>
                      <td className="px-4 py-3 text-[#888]">{inv.dueDate}</td>
                      <td className="px-4 py-3">
                        {inv.daysPastDue > 0 ? (
                          <span className="text-red-400">{inv.daysPastDue}d</span>
                        ) : (
                          <span className="text-green-400">On time</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${inv.riskScore}%`,
                                backgroundColor:
                                  inv.riskScore >= 75 ? "#ff4444" :
                                  inv.riskScore >= 50 ? "#ff8800" :
                                  inv.riskScore >= 25 ? "#ffaa00" : "#00e87b",
                              }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${riskColor(inv.riskLevel)}`}>
                            {inv.riskScore}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            inv.status === "paid"
                              ? "bg-green-500/10 text-green-400"
                              : inv.status === "overdue"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "customers" && (
          <div className="space-y-4">
            {customerRisks.map((customer) => (
              <div
                key={customer.name}
                className={`bg-[#111] border rounded-2xl p-6 ${riskBg(customer.riskLevel)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">{customer.name}</h3>
                    {customer.email && (
                      <p className="text-sm text-[#888]">{customer.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatCurrency(customer.totalOwed)}</div>
                    <div className={`text-sm font-medium uppercase ${riskColor(customer.riskLevel)}`}>
                      {customer.riskLevel} risk
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#0a0a0a] rounded-xl p-3">
                    <div className="text-xs text-[#888]">Invoices</div>
                    <div className="text-lg font-bold">{customer.invoiceCount}</div>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-xl p-3">
                    <div className="text-xs text-[#888]">Avg Days Late</div>
                    <div className="text-lg font-bold">{customer.avgDaysLate}</div>
                  </div>
                  <div className="bg-[#0a0a0a] rounded-xl p-3">
                    <div className="text-xs text-[#888]">Risk Score</div>
                    <div className="text-lg font-bold">{customer.riskScore}/100</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "emails" && (
          <div className="space-y-4">
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 mb-6">
              <h3 className="font-bold mb-2">Auto Follow-Up Queue</h3>
              <p className="text-sm text-[#888] mb-4">
                Personalized emails ready to send. Review and approve each one.
              </p>
              <div className="text-sm text-[#888]">
                {followUps.filter((f) => !f.sent).length} emails pending ·{" "}
                {followUps.filter((f) => f.sent).length} sent
              </div>
            </div>

            {followUps.filter((f) => !f.sent).map((action, idx) => (
              <div
                key={`${action.invoiceId}-${action.stage}-${idx}`}
                className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition"
                  onClick={() =>
                    setExpandedEmail(
                      expandedEmail === `${action.invoiceId}-${action.stage}`
                        ? null
                        : `${action.invoiceId}-${action.stage}`
                    )
                  }
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        action.stage === "final" ? "bg-red-500" :
                        action.stage === "escalation" ? "bg-orange-500" :
                        action.stage === "followup" ? "bg-yellow-500" : "bg-green-500"
                      }`}
                    />
                    <div>
                      <div className="font-medium text-sm">{action.customerName}</div>
                      <div className="text-xs text-[#888]">
                        {action.stage.charAt(0).toUpperCase() + action.stage.slice(1)} · {formatCurrency(action.amount)} · Scheduled: {action.scheduledDate}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#888] transition ${
                      expandedEmail === `${action.invoiceId}-${action.stage}` ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {expandedEmail === `${action.invoiceId}-${action.stage}` && (
                  <div className="border-t border-white/[0.06] p-4 bg-[#0a0a0a]">
                    <div className="mb-3">
                      <span className="text-xs text-[#888]">To:</span>
                      <span className="text-sm ml-2">
                        {action.customerEmail || `${action.customerName.toLowerCase().replace(/\s+/g, ".")}@company.com`}
                      </span>
                    </div>
                    <div className="mb-3">
                      <span className="text-xs text-[#888]">Subject:</span>
                      <span className="text-sm ml-2 font-medium">{action.template.subject}</span>
                    </div>
                    <div className="bg-[#111] rounded-xl p-4 mb-4">
                      <pre className="text-sm text-[#ccc] whitespace-pre-wrap font-sans">
                        {action.template.body}
                      </pre>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          const to = action.customerEmail || `${action.customerName.toLowerCase().replace(/\s+/g, ".")}@company.com`;
                          const res = await fetch("/api/send-email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ to, subject: action.template.subject, body: action.template.body }),
                          });
                          if (res.ok) {
                            setFollowUps((prev) => prev.map((f, fi) => fi === followUps.indexOf(action) ? { ...f, sent: true } : f));
                          }
                        }}
                        className="bg-[#00e87b] text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#00c966] transition"
                      >
                        Approve & Send
                      </button>
                      <button
                        onClick={() => setExpandedEmail(null)}
                        className="bg-white/[0.06] text-white px-4 py-2 rounded-lg text-sm hover:bg-white/[0.1] transition"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setFollowUps((prev) => prev.map((f, fi) => fi === followUps.indexOf(action) ? { ...f, sent: true } : f));
                        }}
                        className="bg-white/[0.06] text-[#888] px-4 py-2 rounded-lg text-sm hover:bg-white/[0.1] transition"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "roi" && stats && (
          <div className="space-y-6">
            <div className="bg-[#111] border border-[#00e87b]/20 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">Your CashPulse ROI</h3>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm text-[#888] mb-4 uppercase tracking-wider">Without CashPulse</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[#888]">Late invoices per month</span>
                      <span className="font-mono">{stats.overdueCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#888]">Money stuck in overdue</span>
                      <span className="font-mono text-red-400">{formatCurrency(stats.totalOverdue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#888]">Hours/week chasing invoices</span>
                      <span className="font-mono">8-12 hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#888]">Annual cash flow gap</span>
                      <span className="font-mono text-red-400">{formatCurrency(stats.totalOverdue * 4)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm text-[#00e87b] mb-4 uppercase tracking-wider">With CashPulse</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[#888]">Predicted late — caught early</span>
                      <span className="font-mono text-[#00e87b]">{stats.atRiskCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#888]">Estimated monthly recovery</span>
                      <span className="font-mono text-[#00e87b]">{formatCurrency(stats.totalAtRisk * 0.6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#888]">Hours saved/week</span>
                      <span className="font-mono text-[#00e87b]">6-10 hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#888]">Annual cash improvement</span>
                      <span className="font-mono text-[#00e87b]">{formatCurrency(stats.totalAtRisk * 0.6 * 12)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.06]">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <div className="text-sm text-[#888]">CashPulse cost</div>
                    <div className="text-xl font-bold">$149/month</div>
                  </div>
                  <div className="text-4xl font-bold text-[#00e87b]">→</div>
                  <div>
                    <div className="text-sm text-[#888]">Estimated monthly recovery</div>
                    <div className="text-xl font-bold text-[#00e87b]">
                      {formatCurrency(stats.totalAtRisk * 0.6)}
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-[#00e87b]">=</div>
                  <div>
                    <div className="text-sm text-[#888]">ROI</div>
                    <div className="text-3xl font-bold text-[#00e87b]">
                      {Math.round((stats.totalAtRisk * 0.6) / 149)}x
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PayPal CTA */}
            <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8 text-center">
              <h3 className="text-xl font-bold mb-2">Ready to stop chasing?</h3>
              <p className="text-[#888] mb-6">
                Start your Growth plan — auto follow-ups, predictions, and ROI tracking.
              </p>
              <div className="inline-flex flex-col items-center gap-3">
                <a
                  href="https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=YOUR_PLAN_ID"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#0070ba] text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#005ea6] transition flex items-center gap-3"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.613 1.862 1.09 5.333-.589 7.896-1.878 2.868-5.307 4.087-8.507 4.087H9.93l-1.286 8.124a.641.641 0 0 0 .633.74h3.564c.459 0 .85-.334.922-.788l.038-.2.73-4.627.047-.256a.929.929 0 0 1 .917-.788h.578c3.746 0 6.68-1.522 7.535-5.928.357-1.838.173-3.371-.786-4.45a3.72 3.72 0 0 0-.604-.469z" />
                  </svg>
                  Subscribe with PayPal — $149/mo
                </a>
                <span className="text-xs text-[#888]">14-day free trial · Cancel anytime</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-[#888] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-xs text-[#888] mt-1">{sub}</div>}
    </div>
  );
}
