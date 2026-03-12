import Logo from "@/components/Logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="border-b border-white/[0.06] px-6 h-16 flex items-center">
        <Logo textClass="text-lg font-bold tracking-tight" />
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-[#888] text-sm mb-10">Last updated: March 12, 2026</p>

        <div className="space-y-8 text-[#ccc] text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>When you create an account, we collect your email address and password (hashed). When you upload invoices, we process the CSV data you provide, which may include customer names, invoice amounts, due dates, and email addresses. We do not access your accounting software directly.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>We use your data to: provide the CashPulse service (risk scoring, email generation, dashboard analytics), send transactional emails (account confirmation, password reset), and improve our AI models. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Data Storage &amp; Security</h2>
            <p>Your data is stored on Supabase (PostgreSQL), hosted on AWS infrastructure. All data is encrypted in transit (TLS) and at rest. Passwords are hashed using bcrypt. We use row-level security policies to ensure users can only access their own data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Retention &amp; Deletion</h2>
            <p>You can delete your account and all associated data at any time by contacting support@cashpulse.app. Upon deletion, all invoice data, customer data, and profile information is permanently removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Third-Party Services</h2>
            <p>We use the following third-party services: Supabase (authentication &amp; database), Resend (transactional email delivery), Groq (AI text generation for follow-up emails), and Vercel (hosting). Each service has its own privacy policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Cookies</h2>
            <p>We use essential cookies for authentication (session tokens). We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Contact</h2>
            <p>For privacy-related questions, email <a href="mailto:support@cashpulse.app" className="text-[#00e87b] hover:underline">support@cashpulse.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
