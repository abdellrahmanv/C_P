"use client";

import { useState } from "react";
import {
  DollarSign,
  Clock,
  Mail,
  BarChart3,
  Upload,
  Zap,
  Shield,
  ArrowRight,
  Check,
  TrendingUp,
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
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#222]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00e87b] flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold">CashPulse</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-[#888] hover:text-white transition">Features</a>
            <a href="#pricing" className="text-sm text-[#888] hover:text-white transition">Pricing</a>
            <Link href="/login" className="text-sm text-[#888] hover:text-white transition">Log In</Link>
            <Link href="/login?mode=signup" className="text-sm bg-[#00e87b] text-black px-4 py-2 rounded-lg font-semibold hover:bg-[#00c966] transition">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full border border-[#00e87b]/30 bg-[#00e87b]/10 text-[#00e87b] text-sm mb-8">
            Stop losing money to late payments
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            You&apos;re owed money.
            <br />
            <span className="text-[#00e87b]">We get it back.</span>
          </h1>
          <p className="text-xl text-[#888] max-w-2xl mx-auto mb-10">
            CashPulse predicts which invoices will be paid late — before they&apos;re due — and automatically follows up with the right message at the right time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login?mode=signup" className="pulse-glow bg-[#00e87b] text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#00c966] transition flex items-center gap-2">
              Start Free — 14 Days <ArrowRight className="w-5 h-5" />
            </Link>
            <span className="text-[#888] text-sm">No credit card. 60-second setup.</span>
          </div>
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-[#00e87b]">$2.4M</div>
              <div className="text-sm text-[#888]">Recovered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00e87b]">12 days</div>
              <div className="text-sm text-[#888]">Faster payments</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00e87b]">94%</div>
              <div className="text-sm text-[#888]">Collection rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-[#222]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            Works in <span className="text-[#00e87b]">60 seconds</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Upload, step: "1", title: "Upload your invoices", desc: "Drop a CSV or paste from your spreadsheet. We read customer names, amounts, due dates." },
              { icon: BarChart3, step: "2", title: "See your money at risk", desc: "AI instantly shows which invoices will be paid late, how much is at risk, and your top risky customers." },
              { icon: Mail, step: "3", title: "Auto-collect", desc: "Personalized follow-up emails sent automatically — friendly reminders to firm escalations. You approve, we send." },
            ].map((item) => (
              <div key={item.step} className="bg-[#111] border border-[#222] rounded-2xl p-8 hover:border-[#00e87b]/50 transition">
                <div className="w-12 h-12 rounded-xl bg-[#00e87b]/10 flex items-center justify-center mb-6">
                  <item.icon className="w-6 h-6 text-[#00e87b]" />
                </div>
                <div className="text-sm text-[#00e87b] font-mono mb-2">Step {item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-[#888]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-[#222]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything you need to <span className="text-[#00e87b]">get paid faster</span>
          </h2>
          <p className="text-[#888] text-center mb-16 max-w-xl mx-auto">Built for B2B companies tired of chasing invoices manually.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: TrendingUp, title: "Late Payment Prediction", desc: "AI analyzes patterns and predicts which invoices will be paid late — before the due date arrives." },
              { icon: Mail, title: "Smart Follow-Up Sequences", desc: "4-stage escalation from friendly reminder to final notice. Every email personalized to the customer." },
              { icon: BarChart3, title: "Real-Time Dashboard", desc: "Total outstanding, at-risk amount, overdue invoices, recovery rate — all in one view." },
              { icon: Zap, title: "Instant ROI Calculator", desc: "See exactly how much money CashPulse is recovering for you, updated daily." },
              { icon: Clock, title: "Aging Analysis", desc: "Breakdown by 0-30, 30-60, 60-90, 90+ days. Know where your money is stuck." },
              { icon: Shield, title: "Your Data, Your Control", desc: "CSV upload — no permanent access to your systems. Delete your data anytime." },
            ].map((feature) => (
              <div key={feature.title} className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#00e87b]/30 transition">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00e87b]/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-[#00e87b]" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-[#888]">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 border-t border-[#222]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple pricing. <span className="text-[#00e87b]">Massive ROI.</span>
          </h2>
          <p className="text-[#888] text-center mb-16">Pays for itself in the first week.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter", price: "$49", period: "/month", highlight: false,
                features: ["Up to 100 invoices/month", "Late payment predictions", "Email templates (manual send)", "Basic dashboard", "Email support"],
              },
              {
                name: "Growth", price: "$149", period: "/month", highlight: true,
                features: ["Up to 500 invoices/month", "Late payment predictions", "Auto-send follow-ups", "Full dashboard + aging", "ROI calculator", "Priority support"],
              },
              {
                name: "Scale", price: "$349", period: "/month", highlight: false,
                features: ["Unlimited invoices", "Late payment predictions", "Auto-send follow-ups", "Full dashboard + aging", "ROI calculator", "Phone script generator", "Dedicated support"],
              },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 ${plan.highlight ? "bg-[#00e87b]/5 border-2 border-[#00e87b] relative" : "bg-[#111] border border-[#222]"}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00e87b] text-black text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>
                )}
                <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[#888]">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-[#00e87b] flex-shrink-0" />
                      <span className="text-[#ccc]">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login?mode=signup" className={`block text-center py-3 rounded-xl font-semibold transition ${plan.highlight ? "bg-[#00e87b] text-black hover:bg-[#00c966]" : "bg-[#222] text-white hover:bg-[#333]"}`}>
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-[#888] text-sm mt-8">All plans include a 14-day free trial. No credit card required. Cancel anytime.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-[#222]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">How much are you owed right now?</h2>
          <p className="text-[#888] mb-8">Upload your invoices and find out in 60 seconds. Free.</p>
          <Link href="/login?mode=signup" className="inline-flex items-center gap-2 bg-[#00e87b] text-black px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#00c966] transition">
            See My Money <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Email Capture / Waitlist */}
      <section className="py-20 px-6 border-t border-[#222] bg-[#111]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Not ready to sign up?</h2>
          <p className="text-[#888] mb-8">Get early access updates, tips on collecting overdue invoices, and a free aging analysis template.</p>
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-xl px-5 py-3.5 text-white placeholder:text-[#555] focus:border-[#00e87b] focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={waitlistStatus === "loading"}
              className="bg-[#00e87b] text-black px-6 py-3.5 rounded-xl font-semibold hover:bg-[#00c966] transition disabled:opacity-50 whitespace-nowrap"
            >
              {waitlistStatus === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
          </form>
          {waitlistStatus === "success" && (
            <p className="mt-4 text-[#00e87b] text-sm">{waitlistMsg}</p>
          )}
          {waitlistStatus === "error" && (
            <p className="mt-4 text-red-400 text-sm">{waitlistMsg}</p>
          )}
          <p className="mt-4 text-[#555] text-xs">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#00e87b] flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold">CashPulse</span>
          </div>
          <div className="text-sm text-[#888]">&copy; {new Date().getFullYear()} CashPulse. Stop chasing. Start collecting.</div>
        </div>
      </footer>
    </div>
  );
}
