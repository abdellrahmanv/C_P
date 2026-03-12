"use client";

import { useState } from "react";
import {
  DollarSign,
  ArrowRight,
  Check,
  Upload,
  BarChart3,
  Mail,
  TrendingUp,
  Zap,
  Clock,
  Shield,
  Brain,
  Phone,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [waitlistMsg, setWaitlistMsg] = useState("");

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail) return;
    setWaitlistStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setWaitlistStatus("success");
        setWaitlistMsg(data.message || "You're on the list!");
        setWaitlistEmail("");
      } else {
        setWaitlistStatus("error");
        setWaitlistMsg(data.error || "Something went wrong");
      }
    } catch {
      setWaitlistStatus("error");
      setWaitlistMsg("Network error. Try again.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ═══════════════ NAV ═══════════════ */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00e87b] flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-black" />
            </div>
            <span className="text-lg font-bold tracking-tight">CashPulse</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            <a href="#how" className="px-3 py-2 text-sm text-[#999] hover:text-white transition rounded-lg hover:bg-white/[0.04]">How it Works</a>
            <a href="#features" className="px-3 py-2 text-sm text-[#999] hover:text-white transition rounded-lg hover:bg-white/[0.04]">Features</a>
            <a href="#pricing" className="px-3 py-2 text-sm text-[#999] hover:text-white transition rounded-lg hover:bg-white/[0.04]">Pricing</a>
            <Link href="/demo" className="px-3 py-2 text-sm text-[#999] hover:text-white transition rounded-lg hover:bg-white/[0.04]">Live Demo</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#999] hover:text-white transition hidden sm:block">Log in</Link>
            <Link href="/login?mode=signup" className="text-sm bg-white text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#e5e5e5] transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="pt-36 pb-24 px-6 relative overflow-hidden">
        {/* Gradient orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#00e87b]/[0.07] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Link href="/demo" className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-[#999] text-sm mb-8 hover:border-[#00e87b]/30 hover:text-[#00e87b] transition group">
            See CashPulse in action <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <h1 className="text-5xl md:text-[4.5rem] font-bold leading-[1.08] tracking-tight mb-6">
            Accounts receivable
            <br />
            that <span className="text-[#00e87b]">collects itself</span>
          </h1>
          <p className="text-lg md:text-xl text-[#888] max-w-2xl mx-auto mb-10 leading-relaxed">
            CashPulse uses AI to predict late payments, automate follow-ups, and recover outstanding invoices — so your finance team can focus on growth, not collections.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?mode=signup" className="bg-[#00e87b] text-black px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-[#00d46f] transition inline-flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/demo" className="border border-white/10 bg-white/[0.03] px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-white/[0.06] transition text-center">
              View Demo
            </Link>
          </div>
          <p className="text-[#555] text-sm mt-4">No credit card required &middot; 14-day free trial &middot; Cancel anytime</p>
        </div>
      </section>

      {/* ═══════════════ SOCIAL PROOF — LOGOS ═══════════════ */}
      <section className="py-12 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-medium tracking-[0.2em] uppercase text-[#555] mb-8">Trusted by finance teams at</p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-40">
            {["Meridian Supply Co.", "Atlas Logistics", "Vance & Partners", "Helix Manufacturing", "NovaTech Solutions", "Crane & Whitfield"].map((name) => (
              <span key={name} className="text-sm font-semibold tracking-wide text-white/80 whitespace-nowrap">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ KEY METRICS ═══════════════ */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "37%", label: "Average DSO reduction" },
            { value: "2.4x", label: "Faster collection rate" },
            { value: "94%", label: "Invoice recovery rate" },
            { value: "<60s", label: "Setup time to first insight" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl md:text-4xl font-bold text-[#00e87b] mb-2">{stat.value}</div>
              <div className="text-sm text-[#666]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="how" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#00e87b] text-center mb-4">How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
            From invoice upload to cash in hand
          </h2>
          <p className="text-[#888] text-center max-w-xl mx-auto mb-16">Three steps. No integrations required. Start recovering money in under a minute.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Upload, step: "01", title: "Upload invoices",
                desc: "Drop a CSV export from QuickBooks, Xero, FreshBooks, or any spreadsheet. We parse customer names, amounts, due dates, and status automatically.",
              },
              {
                icon: Brain, step: "02", title: "AI analyzes risk",
                desc: "Our engine scores each invoice by days overdue, amount, aging patterns, and customer history. You see exactly which invoices need attention first.",
              },
              {
                icon: Mail, step: "03", title: "Automated collection",
                desc: "AI-generated follow-up emails — from friendly reminders to firm escalations — are personalized per customer. You approve, CashPulse sends.",
              },
            ].map((item) => (
              <div key={item.step} className="group relative bg-[#111] border border-white/[0.06] rounded-2xl p-8 hover:border-[#00e87b]/30 transition-all duration-300">
                <div className="text-xs font-mono text-[#00e87b]/60 mb-6">{item.step}</div>
                <div className="w-11 h-11 rounded-xl bg-[#00e87b]/10 flex items-center justify-center mb-5">
                  <item.icon className="w-5 h-5 text-[#00e87b]" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <p className="text-sm text-[#888] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRODUCT PREVIEW ═══════════════ */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#00e87b] text-center mb-4">Platform</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            One dashboard for your entire receivables pipeline
          </h2>
          {/* Mock UI Preview */}
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06]">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              <span className="ml-3 text-xs text-[#555]">app.cashpulse.ai/dashboard</span>
            </div>
            <div className="p-6 md:p-8">
              {/* Metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Outstanding", value: "$284,750", color: "#fff" },
                  { label: "At Risk", value: "$67,200", color: "#ff6b6b" },
                  { label: "Recovered This Month", value: "$42,100", color: "#00e87b" },
                  { label: "Avg. Days to Pay", value: "18 days", color: "#00e87b" },
                ].map((m) => (
                  <div key={m.label} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                    <div className="text-xs text-[#666] mb-1">{m.label}</div>
                    <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {/* Mock table */}
              <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="grid grid-cols-5 text-xs text-[#555] font-medium px-4 py-3 border-b border-white/[0.04]">
                  <span>Customer</span><span>Invoice</span><span className="text-right">Amount</span><span className="text-right">Due Date</span><span className="text-right">Risk</span>
                </div>
                {[
                  { name: "Helix Mfg.", inv: "INV-1847", amount: "$24,500", due: "Feb 28", risk: "87", riskColor: "#ff6b6b" },
                  { name: "Atlas Logistics", inv: "INV-1832", amount: "$18,200", due: "Mar 05", risk: "62", riskColor: "#ffbd2e" },
                  { name: "NovaTech", inv: "INV-1851", amount: "$12,800", due: "Mar 12", risk: "34", riskColor: "#00e87b" },
                  { name: "Crane & Whitfield", inv: "INV-1849", amount: "$8,400", due: "Mar 18", risk: "21", riskColor: "#00e87b" },
                ].map((row) => (
                  <div key={row.inv} className="grid grid-cols-5 text-sm px-4 py-3 border-b border-white/[0.03] last:border-0">
                    <span className="text-white font-medium">{row.name}</span>
                    <span className="text-[#666] font-mono text-xs">{row.inv}</span>
                    <span className="text-right text-white">{row.amount}</span>
                    <span className="text-right text-[#666]">{row.due}</span>
                    <span className="text-right font-semibold" style={{ color: row.riskColor }}>{row.risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section id="features" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#00e87b] text-center mb-4">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
            Everything you need to collect faster
          </h2>
          <p className="text-[#888] text-center max-w-xl mx-auto mb-16">Purpose-built for B2B finance teams who want to reduce DSO and eliminate manual follow-ups.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: TrendingUp, title: "Payment Prediction", desc: "AI risk scores every invoice by amount, age, and customer patterns. Know which invoices need attention before they become problems." },
              { icon: Mail, title: "Smart Sequences", desc: "4-stage automated escalation — from gentle reminder to final notice. Every email is written by AI and personalized per customer relationship." },
              { icon: BarChart3, title: "Live Dashboard", desc: "Total outstanding, at-risk amount, aging breakdown, collection rate, and ROI — all in real time, all in one screen." },
              { icon: Phone, title: "Voice Scripts", desc: "AI generates professional collection call scripts with talking points, objection handling, and outcome tracking for your team." },
              { icon: Clock, title: "Aging Analysis", desc: "Visual breakdown by 0–30, 30–60, 60–90, and 90+ days. Instantly see where your money is stuck and prioritize recovery." },
              { icon: Shield, title: "Privacy-First Design", desc: "CSV upload — no permanent connections to your ERP or accounting software. Your data is encrypted, and you can delete it anytime." },
            ].map((f) => (
              <div key={f.title} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 hover:border-[#00e87b]/20 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-[#00e87b]/10 flex items-center justify-center mb-4 group-hover:bg-[#00e87b]/15 transition">
                  <f.icon className="w-5 h-5 text-[#00e87b]" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[#888] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#00e87b] text-center mb-4">What our users say</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight">
            Teams collect faster with CashPulse
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "We cut our DSO from 52 days to 31 days in the first quarter. The AI follow-ups feel personal — our customers actually respond to them.",
                name: "Sarah Chen",
                title: "VP Finance, Helix Manufacturing",
              },
              {
                quote: "Before CashPulse, we had $180K sitting overdue. Within 6 weeks, we recovered $140K of it. The risk scoring is scarily accurate.",
                name: "Marcus Webb",
                title: "Controller, Atlas Logistics",
              },
              {
                quote: "I used to spend 15 hours a week chasing invoices. Now it takes me 2 hours. CashPulse basically automates the work I hated doing.",
                name: "Priya Patel",
                title: "AR Manager, NovaTech Solutions",
              },
            ].map((t) => (
              <div key={t.name} className="bg-[#111] border border-white/[0.06] rounded-2xl p-6 flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-[#00e87b]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-sm text-[#ccc] leading-relaxed flex-1 mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-[#666]">{t.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ INTEGRATIONS ═══════════════ */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#00e87b] mb-4">Works with your stack</p>
          <h2 className="text-2xl font-bold mb-4 tracking-tight">Export from anywhere, import into CashPulse</h2>
          <p className="text-[#888] max-w-lg mx-auto mb-10 text-sm">CashPulse works with any CSV export. No API keys, no OAuth flows, no IT tickets.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {["QuickBooks", "Xero", "FreshBooks", "Sage", "NetSuite", "Wave", "Zoho Invoice", "Excel / CSV"].map((name) => (
              <div key={name} className="px-5 py-2.5 bg-[#111] border border-white/[0.06] rounded-xl text-sm text-[#999] font-medium">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRICING ═══════════════ */}
      <section id="pricing" className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#00e87b] text-center mb-4">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 tracking-tight">
            Plans that scale with your receivables
          </h2>
          <p className="text-[#888] text-center mb-16">Start free. Upgrade when you&apos;re ready. Every plan pays for itself.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter", price: "$49", period: "/mo", highlight: false,
                desc: "For small teams getting started with AR automation.",
                features: ["Up to 100 invoices/month", "AI risk scoring", "Email templates (manual send)", "Basic dashboard & aging", "Email support"],
              },
              {
                name: "Growth", price: "$149", period: "/mo", highlight: true,
                desc: "For growing companies that want full automation.",
                features: ["Up to 500 invoices/month", "AI risk scoring", "Automated follow-up sequences", "Full dashboard + aging + ROI", "Voice call script generator", "Priority support"],
              },
              {
                name: "Scale", price: "$349", period: "/mo", highlight: false,
                desc: "For finance teams managing high-volume receivables.",
                features: ["Unlimited invoices", "AI risk scoring", "Automated follow-up sequences", "Full dashboard + aging + ROI", "Voice call scripts + AI audio", "Custom email branding", "Dedicated account manager"],
              },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 flex flex-col ${plan.highlight ? "bg-[#00e87b]/[0.04] border-2 border-[#00e87b]/60 relative" : "bg-[#111] border border-white/[0.06]"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00e87b] text-black text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <p className="text-xs text-[#888] mb-5">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[#888] text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-[#00e87b] flex-shrink-0 mt-0.5" />
                      <span className="text-[#ccc]">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login?mode=signup" className={`block text-center py-3 rounded-xl font-semibold text-sm transition ${plan.highlight ? "bg-[#00e87b] text-black hover:bg-[#00d46f]" : "bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.06]"}`}>
                  Start 14-Day Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-[#555] text-sm mt-8">All plans include a 14-day free trial. No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* ═══════════════ BOTTOM CTA ═══════════════ */}
      <section className="py-24 px-6 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#00e87b]/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Ready to stop chasing invoices?</h2>
          <p className="text-[#888] mb-8 text-lg">Upload your invoices and see your AR risk score in under 60 seconds.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?mode=signup" className="bg-[#00e87b] text-black px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-[#00d46f] transition inline-flex items-center justify-center gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/demo" className="border border-white/10 bg-white/[0.03] px-7 py-3.5 rounded-xl text-base font-semibold hover:bg-white/[0.06] transition text-center">
              Try the Demo
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ WAITLIST / EMAIL CAPTURE ═══════════════ */}
      <section className="py-16 px-6 border-t border-white/[0.04] bg-[#111]/50">
        <div className="max-w-lg mx-auto text-center">
          <Zap className="w-5 h-5 text-[#00e87b] mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Stay in the loop</h3>
          <p className="text-sm text-[#888] mb-6">Get product updates, AR tips, and a free aging analysis template.</p>
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="flex-1 bg-[#0a0a0a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#555] focus:border-[#00e87b]/50 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={waitlistStatus === "loading"}
              className="bg-[#00e87b] text-black px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#00d46f] transition disabled:opacity-50 whitespace-nowrap"
            >
              {waitlistStatus === "loading" ? "Joining..." : "Subscribe"}
            </button>
          </form>
          {waitlistStatus === "success" && <p className="mt-3 text-[#00e87b] text-sm">{waitlistMsg}</p>}
          {waitlistStatus === "error" && <p className="mt-3 text-red-400 text-sm">{waitlistMsg}</p>}
          <p className="mt-3 text-[#444] text-xs">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="border-t border-white/[0.04] pt-16 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Logo column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#00e87b] flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-black" />
                </div>
                <span className="font-bold">CashPulse</span>
              </div>
              <p className="text-xs text-[#555] leading-relaxed">AI-powered accounts receivable automation for B2B companies.</p>
            </div>
            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">Product</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Demo", href: "/demo" },
                  { label: "Pricing", href: "#pricing" },
                  { label: "Voice Scripts", href: "/voice" },
                ].map((l) => (
                  <li key={l.label}><Link href={l.href} className="text-sm text-[#666] hover:text-white transition">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            {/* Resources */}
            <div>
              <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {["How it Works", "Integrations", "FAQ", "Blog"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-[#666] hover:text-white transition">{l}</a></li>
                ))}
              </ul>
            </div>
            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2.5">
                {["About", "Careers", "Contact", "Press"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-[#666] hover:text-white transition">{l}</a></li>
                ))}
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {["Privacy Policy", "Terms of Service", "Security", "DPA"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-[#666] hover:text-white transition">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.04] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#555]">&copy; {new Date().getFullYear()} CashPulse, Inc. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="https://github.com/abdellrahmanv/C_P" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
