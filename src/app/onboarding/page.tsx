'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { parseInvoices } from '@/lib/engine';

const STEPS = [
  { title: 'Your Company', desc: 'Tell us about your business' },
  { title: 'Upload Invoices', desc: 'Import your outstanding invoices' },
  { title: 'Choose Plan', desc: 'Start collecting — free trial included' },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [invoiceCount, setInvoiceCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const parsed = parseInvoices(rows);
        const { data: { user } } = await supabase.auth.getUser();
        if (user && parsed.length > 0) {
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
          setUploadedCount(parsed.length);
        }
        setLoading(false);
      },
    });
  }

  async function handleCompanySubmit() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        company_name: companyName,
        industry: industry,
        invoice_volume: invoiceCount,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
    }
    setLoading(false);
    setStep(1);
  }

  async function handleComplete() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        onboarded: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
    }
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-9 h-9 bg-[#00e87b] rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span className="text-[22px] font-semibold text-white tracking-tight">CashPulse</span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8 px-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 transition-colors ${
                  i < step ? 'bg-[#00e87b] text-black' : i === step ? 'bg-[#00e87b] text-black' : 'bg-white/[0.06] text-[#666]'
                }`}>
                  {i < step ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : i + 1}
                </div>
                <span className={`text-[12px] font-medium hidden sm:block ${i <= step ? 'text-white' : 'text-[#555]'}`}>{s.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-[2px] shrink-0 ${i < step ? 'bg-[#00e87b]' : 'bg-white/[0.06]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8">
          <h2 className="text-[22px] font-semibold text-white mb-1">{STEPS[step].title}</h2>
          <p className="text-[14px] text-[#888] mb-7">{STEPS[step].desc}</p>

          {/* Step 1: Company Info */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-medium text-[#ccc] mb-1.5">Company name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[15px] focus:border-[#00e87b] focus:ring-1 focus:ring-[#00e87b]/30 focus:outline-none transition placeholder:text-[#555]"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#ccc] mb-1.5">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[15px] focus:border-[#00e87b] focus:ring-1 focus:ring-[#00e87b]/30 focus:outline-none transition appearance-none"
                >
                  <option value="">Select industry</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="wholesale">Wholesale / Distribution</option>
                  <option value="construction">Construction</option>
                  <option value="professional_services">Professional Services</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="technology">Technology</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#ccc] mb-1.5">
                  Outstanding overdue invoices
                </label>
                <select
                  value={invoiceCount}
                  onChange={(e) => setInvoiceCount(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[15px] focus:border-[#00e87b] focus:ring-1 focus:ring-[#00e87b]/30 focus:outline-none transition appearance-none"
                >
                  <option value="">Select range</option>
                  <option value="1-10">1 &ndash; 10</option>
                  <option value="11-50">11 &ndash; 50</option>
                  <option value="51-200">51 &ndash; 200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
              <button
                onClick={handleCompanySubmit}
                disabled={!companyName || loading}
                className="w-full bg-[#00e87b] text-black font-semibold py-3 rounded-lg text-[15px] hover:bg-[#00c966] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 1 && (
            <div className="space-y-5">
              <div
                className="border-2 border-dashed border-white/[0.1] rounded-xl p-10 text-center hover:border-[#00e87b]/50 transition-colors cursor-pointer group"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file?.name.endsWith('.csv')) handleFileUpload(file);
                }}
              >
                {uploadedCount > 0 ? (
                  <>
                    <div className="w-12 h-12 bg-[#00e87b]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e87b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p className="text-[#00e87b] font-medium text-[15px] mb-1">{uploadedCount} invoices uploaded</p>
                    <p className="text-[#666] text-[13px]">Click or drop to replace</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white/[0.04] rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-white/[0.06] transition">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className="text-white font-medium text-[15px] mb-1">{loading ? 'Processing...' : 'Upload your CSV'}</p>
                    <p className="text-[#666] text-[13px]">
                      Drag &amp; drop or click to browse
                    </p>
                    <p className="text-[#555] text-[12px] mt-2">
                      Required columns: customer_name, amount, due_date
                    </p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-white/[0.1] text-[#888] font-medium py-3 rounded-lg text-[15px] hover:border-white/[0.2] hover:text-white transition"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 bg-[#00e87b] text-black font-semibold py-3 rounded-lg text-[15px] hover:bg-[#00c966] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 2 && (
            <div className="space-y-3">
              {[
                { name: 'Starter', price: '$49', desc: 'For small teams getting started', features: ['Up to 50 invoices', 'Email reminders', 'Basic analytics'] },
                { name: 'Growth', price: '$149', desc: 'Everything you need to collect faster', features: ['Up to 500 invoices', 'AI-powered follow-ups', 'Risk scoring & predictions', 'Priority email sequences'], popular: true },
                { name: 'Scale', price: '$349', desc: 'For growing finance teams', features: ['Unlimited invoices', 'Everything in Growth', 'Dedicated support', 'Custom integrations'] },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`border rounded-xl p-5 cursor-pointer transition-colors ${
                    plan.popular
                      ? 'border-[#00e87b]/40 bg-[#00e87b]/[0.03]'
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-[15px]">{plan.name}</span>
                        {plan.popular && (
                          <span className="text-[10px] uppercase tracking-wider bg-[#00e87b] text-black px-2 py-0.5 rounded font-semibold">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#888] mt-0.5">{plan.desc}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-white font-semibold text-[18px]">{plan.price}</span>
                      <span className="text-[#888] text-[13px]">/mo</span>
                    </div>
                  </div>
                  <ul className="text-[13px] text-[#888] space-y-1 mt-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e87b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="pt-2">
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="w-full bg-[#00e87b] text-black font-semibold py-3 rounded-lg text-[15px] hover:bg-[#00c966] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Setting up...' : 'Start 14-day free trial'}
                </button>
                <button
                  onClick={handleComplete}
                  className="w-full text-[#666] text-[13px] mt-3 hover:text-[#888] transition"
                >
                  Skip &mdash; I&apos;ll choose later
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[12px] text-[#555] mt-6">
          No credit card required &middot; Cancel anytime
        </p>
      </div>
    </div>
  );
}
