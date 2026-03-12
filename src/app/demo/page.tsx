'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import Papa from 'papaparse';
import {
  parseInvoices,
  calculateStats,
  calculateAging,
  getCustomerRisks,
  generateEmailTemplates,
  generateSampleCSV,
  formatCurrency,
} from '@/lib/engine';
import type { Invoice, DashboardStats, AgingBucket, CustomerRisk, EmailTemplate } from '@/lib/types';

interface DemoEmail extends EmailTemplate {
  customerName: string;
  amount: number;
}

export default function DemoPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [risks, setRisks] = useState<CustomerRisk[]>([]);
  const [emails, setEmails] = useState<DemoEmail[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'emails'>('overview');

  useEffect(() => {
    // Auto-load demo data on mount
    const csv = generateSampleCSV();
    const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });
    const parsed = parseInvoices(data as Record<string, string>[]);
    setInvoices(parsed);
    setStats(calculateStats(parsed));
    setAging(calculateAging(parsed));
    setRisks(getCustomerRisks(parsed));
    // Generate sample emails from first few overdue invoices
    const sampleEmails: DemoEmail[] = [];
    for (const inv of parsed.slice(0, 5)) {
      const templates = generateEmailTemplates(
        inv.customerName,
        inv.invoiceNumber,
        inv.amount,
        inv.dueDate,
        'Demo Corp'
      );
      if (templates.length > 0) {
        sampleEmails.push({ ...templates[0], customerName: inv.customerName, amount: inv.amount });
      }
    }
    setEmails(sampleEmails);
    setLoaded(true);
  }, []);

  if (!loaded || !stats) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#00e87b] text-xl animate-pulse">Loading demo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Bar */}
      <div className="bg-[#00e87b] text-black text-center py-2 text-sm font-medium">
        🎯 This is a live demo with sample data.{' '}
        <Link href="/login" className="underline font-bold">
          Sign up free
        </Link>{' '}
        to use with your real invoices.
      </div>

      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo textClass="font-bold text-lg" />
          <span className="text-xs bg-white/[0.06] text-gray-400 px-2 py-0.5 rounded-full ml-2">DEMO</span>
        </div>
        <Link
          href="/login"
          className="bg-[#00e87b] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#00cc6a] transition text-sm"
        >
          Start Free Trial →
        </Link>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Outstanding', value: formatCurrency(stats.totalOutstanding), color: 'text-white' },
            { label: 'At Risk', value: formatCurrency(stats.totalAtRisk), color: 'text-yellow-400' },
            { label: 'Overdue', value: formatCurrency(stats.totalOverdue), color: 'text-red-400' },
            { label: 'Recovered', value: formatCurrency(stats.recoveredThisMonth), color: 'text-[#00e87b]' },
          ].map((card) => (
            <div key={card.label} className="bg-[#111] border border-white/[0.06] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111] rounded-lg p-1 mb-6 w-fit">
          {(['overview', 'invoices', 'emails'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeTab === tab
                  ? 'bg-[#00e87b] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'overview' ? '📊 Overview' : tab === 'invoices' ? '📄 Invoices' : '✉️ AI Emails'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Aging Chart */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Aging Breakdown</h3>
              <div className="space-y-3">
                {aging.map((bucket) => {
                  const maxAmount = Math.max(...aging.map((a) => a.amount));
                  const pct = maxAmount > 0 ? (bucket.amount / maxAmount) * 100 : 0;
                  return (
                    <div key={bucket.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{bucket.label}</span>
                        <span className="text-white font-medium">
                          {formatCurrency(bucket.amount)} ({bucket.count})
                        </span>
                      </div>
                      <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: bucket.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Risks */}
            <div className="bg-[#111] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Risk Scores</h3>
              <div className="space-y-3">
                {risks.slice(0, 6).map((r) => (
                  <div key={r.name} className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-gray-500">
                        {r.invoiceCount} invoice{r.invoiceCount > 1 ? 's' : ''} · {formatCurrency(r.totalOwed)}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        r.riskLevel === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : r.riskLevel === 'high'
                          ? 'bg-orange-500/20 text-orange-400'
                          : r.riskLevel === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {r.riskScore.toFixed(0)}% risk
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-gray-500 text-left">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 15).map((inv, i) => {
                  const daysOverdue = Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                    )
                  );
                  return (
                    <tr
                      key={i}
                      className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition"
                    >
                      <td className="px-4 py-3 text-white font-mono">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-white">{inv.customerName}</td>
                      <td className="px-4 py-3 text-white font-medium">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{inv.dueDate}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            daysOverdue > 30
                              ? 'bg-red-500/20 text-red-400'
                              : daysOverdue > 0
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {daysOverdue > 0 ? `${daysOverdue}d overdue` : 'Current'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${inv.riskScore}%`,
                              backgroundColor:
                                inv.riskScore > 70
                                  ? '#ef4444'
                                  : inv.riskScore > 40
                                  ? '#eab308'
                                  : '#22c55e',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm mb-2">
              CashPulse AI generates personalized collection emails for each overdue invoice.
              Here&apos;s what it would send:
            </p>
            {emails.slice(0, 5).map((email, i) => (
              <div key={i} className="bg-[#111] border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                        email.stage === 'reminder'
                          ? 'bg-blue-500/20 text-blue-400'
                          : email.stage === 'followup'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : email.stage === 'escalation'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {email.stage.toUpperCase()}
                    </span>
                    <span className="text-gray-500 text-sm">
                      To: {email.customerName}
                    </span>
                  </div>
                  <span className="text-gray-600 text-xs">
                    {formatCurrency(email.amount)} overdue
                  </span>
                </div>
                <p className="text-white font-medium text-sm mb-2">
                  Subject: {email.subject}
                </p>
                <div className="text-gray-400 text-sm whitespace-pre-line bg-[#0a0a0a] rounded-lg p-3 border border-[#1a1a1a]">
                  {email.body}
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs bg-[#00e87b] text-black px-3 py-1.5 rounded font-medium opacity-50 cursor-not-allowed">
                    ✓ Send
                  </button>
                  <button className="text-xs border border-white/[0.1] text-gray-400 px-3 py-1.5 rounded opacity-50 cursor-not-allowed">
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA at bottom */}
        <div className="mt-12 text-center bg-gradient-to-r from-[#00e87b]/10 to-transparent border border-[#00e87b]/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-2">Like what you see?</h2>
          <p className="text-gray-400 mb-6">
            Upload your real invoices and start collecting in minutes. Free trial, no credit card.
          </p>
          <Link
            href="/login"
            className="inline-block bg-[#00e87b] text-black font-bold px-8 py-3 rounded-lg hover:bg-[#00cc6a] transition text-lg"
          >
            Start Free Trial →
          </Link>
        </div>
      </div>
    </div>
  );
}
