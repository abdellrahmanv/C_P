'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { parseInvoices } from '@/lib/engine';

const STEPS = [
  { title: 'Your Company', desc: 'Tell us about your business' },
  { title: 'Upload Invoices', desc: 'Import your outstanding invoices' },
  { title: 'Choose Plan', desc: 'Start collecting â€” free trial included' },
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
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i <= step
                    ? 'bg-[#00e87b] text-black'
                    : 'bg-[#222] text-gray-500'
                }`}
              >
                {i < step ? 'âœ“' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${i < step ? 'bg-[#00e87b]' : 'bg-[#222]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-1">{STEPS[step].title}</h2>
          <p className="text-gray-400 mb-6">{STEPS[step].desc}</p>

          {/* Step 1: Company Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:border-[#00e87b] focus:outline-none transition"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:border-[#00e87b] focus:outline-none transition"
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
                <label className="block text-sm text-gray-400 mb-1">
                  How many overdue invoices do you have?
                </label>
                <select
                  value={invoiceCount}
                  onChange={(e) => setInvoiceCount(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white focus:border-[#00e87b] focus:outline-none transition"
                >
                  <option value="">Select range</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
              <button
                onClick={handleCompanySubmit}
                disabled={!companyName || loading}
                className="w-full bg-[#00e87b] text-black font-semibold py-3 rounded-lg hover:bg-[#00cc6a] transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Upload */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-white/[0.1] rounded-xl p-8 text-center hover:border-[#00e87b] transition cursor-pointer"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file?.name.endsWith('.csv')) handleFileUpload(file);
                }}
              >
                <div className="text-4xl mb-3">ðŸ“„</div>
                {uploadedCount > 0 ? (
                  <>
                    <p className="text-[#00e87b] font-medium mb-1">âœ“ {uploadedCount} invoices uploaded</p>
                    <p className="text-gray-500 text-sm">Click or drop to replace</p>
                  </>
                ) : (
                  <>
                    <p className="text-white font-medium mb-1">{loading ? 'Processing...' : 'Upload your CSV'}</p>
                    <p className="text-gray-500 text-sm">
                      Drag & drop or click to browse. Columns: customer, amount, due_date, email
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
                  className="flex-1 border border-white/[0.1] text-gray-400 font-medium py-3 rounded-lg hover:border-[#555] transition"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 bg-[#00e87b] text-black font-semibold py-3 rounded-lg hover:bg-[#00cc6a] transition disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Plan Selection */}
          {step === 2 && (
            <div className="space-y-4">
              {[
                { name: 'Starter', price: '$49/mo', features: ['Up to 50 invoices', 'Email reminders', 'Basic analytics'] },
                { name: 'Growth', price: '$149/mo', features: ['Up to 500 invoices', 'AI-powered emails', 'Priority follow-ups', 'Customer risk scoring'], popular: true },
                { name: 'Scale', price: '$349/mo', features: ['Unlimited invoices', 'Everything in Growth', 'Dedicated support', 'Custom integrations'] },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`border rounded-xl p-4 cursor-pointer transition ${
                    plan.popular
                      ? 'border-[#00e87b] bg-[#00e87b]/5'
                      : 'border-white/[0.06] hover:border-[#444]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-white font-semibold">{plan.name}</span>
                      {plan.popular && (
                        <span className="ml-2 text-xs bg-[#00e87b] text-black px-2 py-0.5 rounded-full font-medium">
                          Most Popular
                        </span>
                      )}
                    </div>
                    <span className="text-[#00e87b] font-bold">{plan.price}</span>
                  </div>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {plan.features.map((f) => (
                      <li key={f}>âœ“ {f}</li>
                    ))}
                  </ul>
                </div>
              ))}

              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full bg-[#00e87b] text-black font-semibold py-3 rounded-lg hover:bg-[#00cc6a] transition disabled:opacity-50"
              >
                {loading ? 'Setting up...' : 'Start Free Trial â†’'}
              </button>
              <button
                onClick={handleComplete}
                className="w-full text-gray-500 text-sm hover:text-gray-300 transition"
              >
                Skip â€” I&apos;ll choose later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
