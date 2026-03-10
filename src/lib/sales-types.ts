// ============================================
// CashPulse Sales Agent Types
// ============================================

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactTitle: string;
  email: string;
  industry: string;
  employeeCount: number;
  website?: string;
  source: "apollo" | "manual" | "signup" | "referral";
  status: "new" | "contacted" | "replied" | "trial" | "customer" | "lost";
  score: number; // 0-100
  sequenceStep: number; // 0 = not started, 1-5 = email sequence step
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  notes: string;
  createdAt: string;
  tags: string[];
}

export interface ColdEmailSequence {
  step: number;
  delayDays: number; // days after previous step
  subject: string;
  body: string;
  type: "initial" | "followup" | "value" | "breakup";
}

export interface SalesMetrics {
  totalLeads: number;
  contacted: number;
  replied: number;
  trials: number;
  customers: number;
  replyRate: number;
  trialRate: number;
  conversionRate: number;
  emailsSentToday: number;
  emailsSentThisMonth: number;
  revenue: number;
}

export interface ApolloSearchParams {
  titles: string[];
  industries: string[];
  employeeRange: { min: number; max: number };
  locations: string[];
}

export interface PayPalPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
}
