// ============================================
// CashPulse Sales Agent Engine
// ============================================
// Scout → Writer → Sender → Closer
// All using free APIs
// ============================================

import type { Lead, ColdEmailSequence, SalesMetrics, ApolloSearchParams } from "./sales-types";

// ============================================
// COLD EMAIL SEQUENCES
// ============================================

export function getColdEmailSequence(
  lead: Lead,
  senderName: string = "CashPulse"
): ColdEmailSequence[] {
  const { companyName, contactName, industry, employeeCount } = lead;
  const firstName = contactName.split(" ")[0];

  // Estimate their AR problem size based on employee count
  const estimatedAR = employeeCount < 50
    ? "$30K-$80K"
    : employeeCount < 200
    ? "$80K-$250K"
    : "$250K-$1M+";

  return [
    {
      step: 1,
      delayDays: 0,
      type: "initial",
      subject: `${companyName} — quick question about your invoices`,
      body: `Hi ${firstName},

Quick question: do you know how much ${companyName} is owed right now in overdue invoices?

For ${industry} companies with ~${employeeCount} employees, it's usually ${estimatedAR} sitting in aging receivables at any given time.

We built CashPulse — it connects to your invoicing in 60 seconds and shows:
• Which invoices will be paid late (before the due date)
• What to say to each customer (auto-generated)
• How much you'll recover this month

Free 14-day trial. Upload a CSV. See your money.

Would that be useful for ${companyName}?

Best,
${senderName}`,
    },
    {
      step: 2,
      delayDays: 3,
      type: "followup",
      subject: `Re: ${companyName} — quick question about your invoices`,
      body: `Hi ${firstName},

Following up — one stat that might be relevant:

B2B companies using automated follow-ups collect payments 12 days faster on average. For a company your size, that's roughly ${estimatedAR} in cash flow freed up per quarter.

CashPulse does this automatically:
1. Upload your invoices (CSV or spreadsheet)
2. AI predicts which will be late
3. Personalized follow-up emails sent on your behalf

90-second setup. No contracts. Cancel anytime.

Worth a quick look? → https://cashpulse.io/dashboard

${senderName}`,
    },
    {
      step: 3,
      delayDays: 4,
      type: "value",
      subject: `How ${industry} companies recover $67K/quarter`,
      body: `Hi ${firstName},

I wanted to share something specific for ${industry}:

The average ${industry} company with ${employeeCount} employees has:
• 25% of invoices paid late (industry benchmark)
• ${estimatedAR} stuck in aging receivables
• 8-12 hours/week spent manually chasing payments

CashPulse predicts late payments before they happen and sends the right follow-up at the right time. Companies our size typically recover 60% of at-risk invoices within 30 days.

The ROI calculator in the trial shows your exact numbers with your real data.

Free trial: https://cashpulse.io/dashboard

${senderName}`,
    },
    {
      step: 4,
      delayDays: 5,
      type: "value",
      subject: `Quick demo for ${companyName}?`,
      body: `Hi ${firstName},

I know you're busy so I'll keep this short.

If you upload your invoice data to CashPulse, in 60 seconds you'll see:

✓ Exactly which customers will pay late this month
✓ How much money is at risk
✓ Auto-generated follow-up emails ready to send

No call needed. No sales pitch. Just upload and see.

If the numbers make sense, great. If not, delete your data and move on.

https://cashpulse.io/dashboard

${senderName}`,
    },
    {
      step: 5,
      delayDays: 7,
      type: "breakup",
      subject: `Closing the loop — ${companyName}`,
      body: `Hi ${firstName},

Last note from me on this.

If chasing late invoices isn't a problem for ${companyName}, I totally understand — ignore this and I won't email again.

But if you're spending hours every week following up on payments that should have arrived already, CashPulse fixes that in 60 seconds:

https://cashpulse.io/dashboard

Either way, wishing ${companyName} a great quarter.

${senderName}`,
    },
  ];
}

// ============================================
// LEAD SCORING
// ============================================

export function scoreLead(lead: Partial<Lead>): number {
  let score = 0;

  // Employee count (sweet spot: 20-500)
  const emp = lead.employeeCount || 0;
  if (emp >= 50 && emp <= 200) score += 30;
  else if (emp >= 20 && emp <= 500) score += 20;
  else if (emp >= 10) score += 10;

  // Title scoring
  const title = (lead.contactTitle || "").toLowerCase();
  if (title.includes("cfo") || title.includes("chief financial")) score += 25;
  else if (title.includes("controller") || title.includes("vp finance")) score += 22;
  else if (title.includes("accounts receivable") || title.includes("ar manager")) score += 20;
  else if (title.includes("finance") || title.includes("accounting")) score += 15;
  else if (title.includes("owner") || title.includes("ceo") || title.includes("president")) score += 18;
  else if (title.includes("office manager") || title.includes("bookkeeper")) score += 12;

  // Industry scoring (B2B heavy industries score higher)
  const industry = (lead.industry || "").toLowerCase();
  if (industry.includes("manufacturing") || industry.includes("wholesale")) score += 20;
  else if (industry.includes("distribution") || industry.includes("logistics")) score += 18;
  else if (industry.includes("construction") || industry.includes("professional services")) score += 16;
  else if (industry.includes("agency") || industry.includes("consulting")) score += 14;
  else if (industry.includes("saas") || industry.includes("software") || industry.includes("technology")) score += 12;
  else score += 8;

  // Has email
  if (lead.email) score += 10;

  // Has website
  if (lead.website) score += 5;

  return Math.min(100, score);
}

// ============================================
// APOLLO.IO INTEGRATION (Free Tier)
// ============================================

export async function searchApolloLeads(
  apiKey: string,
  params: ApolloSearchParams
): Promise<Lead[]> {
  if (!apiKey) {
    return generateMockLeads(50);
  }

  try {
    const response = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q_organization_domains: [],
        page: 1,
        per_page: 50,
        person_titles: params.titles,
        organization_industry_tag_ids: [],
        organization_num_employees_ranges: [
          `${params.employeeRange.min},${params.employeeRange.max}`,
        ],
        person_locations: params.locations,
      }),
    });

    if (!response.ok) {
      console.error("Apollo API error:", response.status);
      return generateMockLeads(50);
    }

    const data = await response.json();

    return (data.people || []).map((person: Record<string, unknown>): Lead => {
      const org = person.organization as Record<string, unknown> | undefined;
      return {
        id: generateId(),
        companyName: (org?.name as string) || "Unknown",
        contactName: (person.name as string) || "Unknown",
        contactTitle: (person.title as string) || "",
        email: (person.email as string) || "",
        industry: (org?.industry as string) || "",
        employeeCount: (org?.estimated_num_employees as number) || 0,
        website: (org?.website_url as string) || "",
        source: "apollo",
        status: "new",
        score: 0,
        sequenceStep: 0,
        notes: "",
        createdAt: new Date().toISOString(),
        tags: [],
      };
    }).map((lead: Lead) => ({
      ...lead,
      score: scoreLead(lead),
    }));
  } catch (error) {
    console.error("Apollo search failed:", error);
    return generateMockLeads(50);
  }
}

// ============================================
// GROQ AI EMAIL PERSONALIZATION
// ============================================

export async function personalizeEmail(
  groqApiKey: string,
  template: string,
  lead: Lead
): Promise<string> {
  if (!groqApiKey) {
    return template; // Return template as-is if no API key
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an email personalization assistant for CashPulse, an accounts receivable AI tool. 
Rewrite the email to be more personalized and compelling for the specific recipient. 
Keep the same structure and call-to-action. Keep it concise and professional.
Do NOT add any extra commentary — return ONLY the rewritten email body.`,
          },
          {
            role: "user",
            content: `Personalize this cold email for:
Company: ${lead.companyName}
Contact: ${lead.contactName} (${lead.contactTitle})
Industry: ${lead.industry}
Size: ${lead.employeeCount} employees

Email template:
${template}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return template;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || template;
  } catch {
    return template;
  }
}

// ============================================
// SALES METRICS
// ============================================

export function calculateSalesMetrics(leads: Lead[]): SalesMetrics {
  const contacted = leads.filter((l) => l.sequenceStep > 0).length;
  const replied = leads.filter((l) => l.status === "replied").length;
  const trials = leads.filter((l) => l.status === "trial").length;
  const customers = leads.filter((l) => l.status === "customer").length;

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.substring(0, 7);

  const emailsSentToday = leads.filter(
    (l) => l.lastContactedAt?.startsWith(today)
  ).length;

  const emailsSentThisMonth = leads.filter(
    (l) => l.lastContactedAt?.startsWith(thisMonth)
  ).length;

  return {
    totalLeads: leads.length,
    contacted,
    replied,
    trials,
    customers,
    replyRate: contacted > 0 ? Math.round((replied / contacted) * 100) : 0,
    trialRate: replied > 0 ? Math.round((trials / replied) * 100) : 0,
    conversionRate: trials > 0 ? Math.round((customers / trials) * 100) : 0,
    emailsSentToday,
    emailsSentThisMonth,
    revenue: customers * 149, // Average plan price
  };
}

// ============================================
// MOCK DATA GENERATOR (for demo/testing)
// ============================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function generateMockLeads(count: number): Lead[] {
  const companies = [
    { name: "Apex Manufacturing", industry: "Manufacturing", emp: 85 },
    { name: "BrightWave Solutions", industry: "Professional Services", emp: 42 },
    { name: "Cascade Distribution", industry: "Wholesale Distribution", emp: 120 },
    { name: "Duraform Industries", industry: "Manufacturing", emp: 200 },
    { name: "EverGreen Supplies", industry: "Wholesale", emp: 65 },
    { name: "FrostByte Technologies", industry: "Software", emp: 38 },
    { name: "GoldStar Logistics", industry: "Logistics", emp: 150 },
    { name: "Harbor Construction", industry: "Construction", emp: 95 },
    { name: "Ironclad Components", industry: "Manufacturing", emp: 175 },
    { name: "JetSet Travel Corp", industry: "Professional Services", emp: 55 },
    { name: "Keystone Fabrication", industry: "Manufacturing", emp: 110 },
    { name: "LightPath Consulting", industry: "Consulting", emp: 28 },
    { name: "MapleCraft Woodworks", industry: "Manufacturing", emp: 45 },
    { name: "NorthStar Equipment", industry: "Wholesale Distribution", emp: 88 },
    { name: "OakBridge Financial", industry: "Professional Services", emp: 62 },
    { name: "PrimeLine Automotive", industry: "Manufacturing", emp: 230 },
    { name: "QuickShip Fulfillment", industry: "Logistics", emp: 75 },
    { name: "RedRock Materials", industry: "Construction", emp: 140 },
    { name: "SilverEdge Analytics", industry: "Software", emp: 35 },
    { name: "TrueNorth Packaging", industry: "Manufacturing", emp: 160 },
    { name: "UltraClean Services", industry: "Professional Services", emp: 50 },
    { name: "VanguardTech Systems", industry: "Technology", emp: 90 },
    { name: "WestPeak Engineering", industry: "Construction", emp: 105 },
    { name: "Xenon Chemical Corp", industry: "Manufacturing", emp: 250 },
    { name: "YieldMax Agriculture", industry: "Agriculture", emp: 70 },
    { name: "ZenithPro Marketing", industry: "Agency", emp: 32 },
    { name: "Atlas Metalworks", industry: "Manufacturing", emp: 185 },
    { name: "BlueHorizon Marine", industry: "Logistics", emp: 95 },
    { name: "ClearView Optics", industry: "Manufacturing", emp: 60 },
    { name: "DeltaForce Security", industry: "Professional Services", emp: 48 },
    { name: "EchoStream Media", industry: "Agency", emp: 25 },
    { name: "Falcon Parts Inc", industry: "Wholesale Distribution", emp: 130 },
    { name: "GreenField Organics", industry: "Agriculture", emp: 80 },
    { name: "HighPoint Electric", industry: "Construction", emp: 115 },
    { name: "InnoVate Solutions", industry: "Software", emp: 55 },
    { name: "Jupiter Wholesale", industry: "Wholesale", emp: 200 },
    { name: "KineticFlow Systems", industry: "Manufacturing", emp: 145 },
    { name: "LuminArc Lighting", industry: "Manufacturing", emp: 75 },
    { name: "MeridianHealth Group", industry: "Healthcare", emp: 190 },
    { name: "NexGen Robotics", industry: "Technology", emp: 40 },
    { name: "OmniTrade Global", industry: "Wholesale Distribution", emp: 170 },
    { name: "PeakForm Fitness", industry: "Professional Services", emp: 30 },
    { name: "QuantumLeap Labs", industry: "Technology", emp: 65 },
    { name: "RiverBend Foods", industry: "Manufacturing", emp: 220 },
    { name: "StarPoint Staffing", industry: "Professional Services", emp: 85 },
    { name: "TerraFirm Builders", industry: "Construction", emp: 155 },
    { name: "UnityWorks Consulting", industry: "Consulting", emp: 38 },
    { name: "VertexPipe Industries", industry: "Manufacturing", emp: 195 },
    { name: "WindCrest Energy", industry: "Energy", emp: 110 },
    { name: "XCalibur Defense", industry: "Manufacturing", emp: 280 },
  ];

  const titles = [
    "CFO", "Controller", "VP of Finance", "AR Manager",
    "Finance Director", "Accounting Manager", "Office Manager",
    "Chief Financial Officer", "VP Operations", "Finance Manager",
  ];

  const firstNames = [
    "Sarah", "Michael", "Jennifer", "David", "Lisa", "Robert", "Emily",
    "James", "Amanda", "Brian", "Michelle", "Kevin", "Laura", "John",
    "Rachel", "Steven", "Nicole", "Christopher", "Angela", "Daniel",
  ];

  const lastNames = [
    "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore",
    "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
    "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez",
  ];

  const statuses: Lead["status"][] = ["new", "new", "new", "contacted", "contacted", "replied", "replied", "trial", "trial", "customer"];

  return Array.from({ length: Math.min(count, companies.length) }, (_, i) => {
    const company = companies[i];
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const title = titles[i % titles.length];
    const status = statuses[i % statuses.length];
    const domain = company.name.toLowerCase().replace(/[^a-z]/g, "") + ".com";

    const lead: Lead = {
      id: generateId(),
      companyName: company.name,
      contactName: `${firstName} ${lastName}`,
      contactTitle: title,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
      industry: company.industry,
      employeeCount: company.emp,
      website: `https://${domain}`,
      source: "apollo",
      status,
      score: 0,
      sequenceStep: status === "new" ? 0 : Math.floor(Math.random() * 4) + 1,
      lastContactedAt: status !== "new" ? new Date(Date.now() - Math.random() * 7 * 86400000).toISOString() : undefined,
      notes: "",
      createdAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
      tags: [],
    };

    lead.score = scoreLead(lead);
    return lead;
  });
}

// ============================================
// DEFAULT APOLLO SEARCH PARAMS
// ============================================

export const defaultSearchParams: ApolloSearchParams = {
  titles: [
    "CFO",
    "Chief Financial Officer",
    "Controller",
    "VP Finance",
    "Finance Director",
    "Accounts Receivable Manager",
    "AR Manager",
    "Accounting Manager",
  ],
  industries: [
    "Manufacturing",
    "Wholesale",
    "Distribution",
    "Construction",
    "Professional Services",
    "Logistics",
  ],
  employeeRange: { min: 20, max: 500 },
  locations: ["United States", "Canada", "United Kingdom", "Australia"],
};
