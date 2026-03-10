export interface Invoice {
  id: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  status: "paid" | "unpaid" | "overdue";
  daysPastDue: number;
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  predictedPayDate: string;
  customerEmail?: string;
}

export interface DashboardStats {
  totalOutstanding: number;
  totalAtRisk: number;
  totalOverdue: number;
  totalPaid: number;
  invoiceCount: number;
  overdueCount: number;
  atRiskCount: number;
  avgDaysToPayment: number;
  collectionRate: number;
  recoveredThisMonth: number;
}

export interface AgingBucket {
  label: string;
  count: number;
  amount: number;
  color: string;
}

export interface CustomerRisk {
  name: string;
  email?: string;
  totalOwed: number;
  invoiceCount: number;
  avgDaysLate: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface EmailTemplate {
  stage: "reminder" | "followup" | "escalation" | "final";
  subject: string;
  body: string;
  daysRelativeToDue: number; // negative = before due, positive = after due
}

export interface FollowUpAction {
  invoiceId: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  stage: EmailTemplate["stage"];
  scheduledDate: string;
  sent: boolean;
  template: EmailTemplate;
}
