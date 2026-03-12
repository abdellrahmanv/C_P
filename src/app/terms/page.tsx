import Link from "next/link";
import { DollarSign } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-white/[0.06] px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#00e87b] flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight">CashPulse</span>
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-[#888] text-sm mb-10">Last updated: March 12, 2026</p>

        <div className="space-y-8 text-[#ccc] text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By creating an account or using CashPulse, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. Description of Service</h2>
            <p>CashPulse is a software-as-a-service platform that helps businesses manage accounts receivable through AI-powered risk scoring, automated follow-up email generation, and invoice analytics. You upload invoice data via CSV; CashPulse analyzes and provides collection tools.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Account Responsibilities</h2>
            <p>You are responsible for maintaining the security of your account credentials. You must provide accurate information when creating your account. You must be at least 18 years old to use CashPulse.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Free Trial &amp; Billing</h2>
            <p>New accounts receive a 14-day free trial. No credit card is required to start. After the trial, you may choose a paid plan to continue using the service. Payments are processed through PayPal. You may cancel your subscription at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Your Data</h2>
            <p>You retain ownership of all invoice data you upload. CashPulse processes your data solely to provide the service. We do not share your data with third parties for marketing purposes. You can request deletion of your data at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. AI-Generated Content</h2>
            <p>CashPulse uses AI to generate follow-up emails and risk scores. These are suggestions and tools &mdash; you are responsible for reviewing all AI-generated emails before sending them to your customers. CashPulse is not liable for the content of emails you approve and send.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>CashPulse is provided &ldquo;as is.&rdquo; We do not guarantee that the service will recover any specific amount of money or reduce your DSO by any specific amount. We are not liable for any indirect, incidental, or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Termination</h2>
            <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time by contacting support@cashpulse.app.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contact</h2>
            <p>Questions about these terms? Email <a href="mailto:support@cashpulse.app" className="text-[#00e87b] hover:underline">support@cashpulse.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
