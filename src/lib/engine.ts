import {
  Invoice,
  DashboardStats,
  AgingBucket,
  CustomerRisk,
  EmailTemplate,
  FollowUpAction,
} from "./types";

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Parse CSV rows into Invoice objects
export function parseInvoices(
  rows: Record<string, string>[]
): Invoice[] {
  const today = new Date();

  return rows
    .filter((row) => {
      const amount = parseFloat(row.amount || row.Amount || row.AMOUNT || row.total || row.Total || "0");
      return amount > 0;
    })
    .map((row) => {
      const customerName = row.customer_name || row.CustomerName || row.customer || row.Customer || row["Customer Name"] || row.client || row.Client || "Unknown";
      const invoiceNumber = row.invoice_number || row.InvoiceNumber || row.invoice || row.Invoice || row["Invoice #"] || row["Invoice Number"] || row.number || generateId();
      const amount = parseFloat(row.amount || row.Amount || row.AMOUNT || row.total || row.Total || row.balance || row.Balance || "0");
      const dueDateStr = row.due_date || row.DueDate || row["Due Date"] || row.due || row.Due || "";
      const issueDateStr = row.issue_date || row.IssueDate || row["Issue Date"] || row.date || row.Date || row.issued || "";
      const customerEmail = row.email || row.Email || row.customer_email || row["Customer Email"] || "";
      const statusRaw = (row.status || row.Status || "").toLowerCase();

      const dueDate = dueDateStr ? new Date(dueDateStr) : new Date(today.getTime() + 30 * 86400000);
      const issueDate = issueDateStr ? new Date(issueDateStr) : new Date(dueDate.getTime() - 30 * 86400000);

      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      const isPaid = statusRaw === "paid" || statusRaw === "complete" || statusRaw === "completed";
      const isOverdue = !isPaid && daysPastDue > 0;

      // Risk scoring algorithm
      let riskScore = 0;

      // Days past due factor (0-40 points)
      if (daysPastDue > 90) riskScore += 40;
      else if (daysPastDue > 60) riskScore += 30;
      else if (daysPastDue > 30) riskScore += 20;
      else if (daysPastDue > 0) riskScore += 10;
      else if (daysPastDue > -7) riskScore += 5; // Due within a week

      // Amount factor (0-25 points) — larger amounts = higher risk
      if (amount > 50000) riskScore += 25;
      else if (amount > 10000) riskScore += 20;
      else if (amount > 5000) riskScore += 15;
      else if (amount > 1000) riskScore += 10;
      else riskScore += 5;

      // Age of invoice factor (0-20 points)
      const invoiceAge = Math.floor((today.getTime() - issueDate.getTime()) / 86400000);
      if (invoiceAge > 120) riskScore += 20;
      else if (invoiceAge > 90) riskScore += 15;
      else if (invoiceAge > 60) riskScore += 10;
      else if (invoiceAge > 30) riskScore += 5;

      // Random variation factor (0-15 points) — simulates other signals
      riskScore += Math.floor(Math.random() * 15);

      riskScore = Math.min(100, riskScore);

      if (isPaid) riskScore = 0;

      const riskLevel: Invoice["riskLevel"] =
        riskScore >= 75 ? "critical" :
        riskScore >= 50 ? "high" :
        riskScore >= 25 ? "medium" : "low";

      // Predicted pay date
      const predictedDelay = Math.max(0, Math.floor(riskScore * 0.5));
      const predictedPayDate = new Date(
        Math.max(dueDate.getTime(), today.getTime()) + predictedDelay * 86400000
      );

      const status: Invoice["status"] = isPaid ? "paid" : isOverdue ? "overdue" : "unpaid";

      return {
        id: generateId(),
        customerName,
        invoiceNumber,
        amount,
        dueDate: dueDate.toISOString().split("T")[0],
        issueDate: issueDate.toISOString().split("T")[0],
        status,
        daysPastDue: Math.max(0, daysPastDue),
        riskScore,
        riskLevel,
        predictedPayDate: predictedPayDate.toISOString().split("T")[0],
        customerEmail: customerEmail || undefined,
      };
    });
}

// Calculate dashboard statistics
export function calculateStats(invoices: Invoice[]): DashboardStats {
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const atRiskInvoices = unpaidInvoices.filter((i) => i.riskScore >= 50);
  const paidInvoices = invoices.filter((i) => i.status === "paid");

  const totalOutstanding = unpaidInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalAtRisk = atRiskInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amount, 0);

  const totalInvoiced = totalOutstanding + totalPaid;
  const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  const avgDaysToPayment = overdueInvoices.length > 0
    ? Math.round(overdueInvoices.reduce((sum, i) => sum + i.daysPastDue, 0) / overdueInvoices.length)
    : 0;

  return {
    totalOutstanding,
    totalAtRisk,
    totalOverdue,
    totalPaid,
    invoiceCount: invoices.length,
    overdueCount: overdueInvoices.length,
    atRiskCount: atRiskInvoices.length,
    avgDaysToPayment,
    collectionRate: Math.round(collectionRate),
    recoveredThisMonth: Math.round(totalPaid * 0.15), // Estimate
  };
}

// Calculate aging buckets
export function calculateAging(invoices: Invoice[]): AgingBucket[] {
  const unpaid = invoices.filter((i) => i.status !== "paid");

  const buckets: AgingBucket[] = [
    { label: "Current", count: 0, amount: 0, color: "#00e87b" },
    { label: "1-30 days", count: 0, amount: 0, color: "#ffaa00" },
    { label: "31-60 days", count: 0, amount: 0, color: "#ff8800" },
    { label: "61-90 days", count: 0, amount: 0, color: "#ff4444" },
    { label: "90+ days", count: 0, amount: 0, color: "#cc0000" },
  ];

  unpaid.forEach((inv) => {
    if (inv.daysPastDue <= 0) {
      buckets[0].count++;
      buckets[0].amount += inv.amount;
    } else if (inv.daysPastDue <= 30) {
      buckets[1].count++;
      buckets[1].amount += inv.amount;
    } else if (inv.daysPastDue <= 60) {
      buckets[2].count++;
      buckets[2].amount += inv.amount;
    } else if (inv.daysPastDue <= 90) {
      buckets[3].count++;
      buckets[3].amount += inv.amount;
    } else {
      buckets[4].count++;
      buckets[4].amount += inv.amount;
    }
  });

  return buckets;
}

// Identify top risky customers
export function getCustomerRisks(invoices: Invoice[]): CustomerRisk[] {
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const customerMap = new Map<string, Invoice[]>();

  unpaid.forEach((inv) => {
    const existing = customerMap.get(inv.customerName) || [];
    existing.push(inv);
    customerMap.set(inv.customerName, existing);
  });

  const risks: CustomerRisk[] = [];

  customerMap.forEach((invs, name) => {
    const totalOwed = invs.reduce((sum, i) => sum + i.amount, 0);
    const avgDaysLate = Math.round(invs.reduce((sum, i) => sum + i.daysPastDue, 0) / invs.length);
    const maxRisk = Math.max(...invs.map((i) => i.riskScore));
    const riskLevel: CustomerRisk["riskLevel"] =
      maxRisk >= 75 ? "critical" :
      maxRisk >= 50 ? "high" :
      maxRisk >= 25 ? "medium" : "low";

    risks.push({
      name,
      email: invs.find((i) => i.customerEmail)?.customerEmail,
      totalOwed,
      invoiceCount: invs.length,
      avgDaysLate,
      riskScore: maxRisk,
      riskLevel,
    });
  });

  return risks.sort((a, b) => b.riskScore - a.riskScore);
}

// Generate email templates for follow-up sequences
export function generateEmailTemplates(
  customerName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  companyName: string = "your company"
): EmailTemplate[] {
  const formattedAmount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return [
    {
      stage: "reminder",
      daysRelativeToDue: -7,
      subject: `Upcoming payment reminder — Invoice #${invoiceNumber}`,
      body: `Hi ${customerName},\n\nFriendly reminder that invoice #${invoiceNumber} for ${formattedAmount} is due on ${dueDate}.\n\nPlease let us know if you have any questions or need updated payment details.\n\nThank you for your continued partnership.\n\nBest regards,\n${companyName}`,
    },
    {
      stage: "followup",
      daysRelativeToDue: 3,
      subject: `Payment due — Invoice #${invoiceNumber} (${formattedAmount})`,
      body: `Hi ${customerName},\n\nThis is a follow-up regarding invoice #${invoiceNumber} for ${formattedAmount}, which was due on ${dueDate}.\n\nWe understand things get busy — if payment is already on its way, please disregard this note.\n\nOtherwise, we'd appreciate payment at your earliest convenience. Let us know if there are any issues on your end.\n\nBest regards,\n${companyName}`,
    },
    {
      stage: "escalation",
      daysRelativeToDue: 14,
      subject: `Action required — Invoice #${invoiceNumber} is 14 days overdue`,
      body: `Hi ${customerName},\n\nInvoice #${invoiceNumber} for ${formattedAmount} is now 14 days past due (original due date: ${dueDate}).\n\nWe value our relationship and want to resolve this quickly. If there's a reason for the delay, please let us know so we can work together on a solution.\n\nPlease process payment within the next 5 business days.\n\nRegards,\n${companyName}`,
    },
    {
      stage: "final",
      daysRelativeToDue: 30,
      subject: `Final notice — Invoice #${invoiceNumber} (30+ days overdue)`,
      body: `Hi ${customerName},\n\nThis is a final notice regarding invoice #${invoiceNumber} for ${formattedAmount}, originally due on ${dueDate}.\n\nThis invoice is now over 30 days past due. We need to receive payment within the next 7 days to avoid further action on this account.\n\nIf you've already sent payment, please forward the confirmation and we'll update our records immediately.\n\nPlease contact us directly to resolve this.\n\nRegards,\n${companyName}`,
    },
  ];
}

// Generate follow-up actions for all unpaid invoices
export function generateFollowUpActions(
  invoices: Invoice[],
  companyName: string = "your company"
): FollowUpAction[] {
  const actions: FollowUpAction[] = [];
  const today = new Date();

  invoices
    .filter((inv) => inv.status !== "paid")
    .forEach((inv) => {
      const templates = generateEmailTemplates(
        inv.customerName,
        inv.invoiceNumber,
        inv.amount,
        inv.dueDate,
        companyName
      );

      templates.forEach((template) => {
        const dueDate = new Date(inv.dueDate);
        const scheduleDate = new Date(dueDate.getTime() + template.daysRelativeToDue * 86400000);

        // Only include actions that are due now or in the future (or recently past)
        const daysSinceSchedule = Math.floor((today.getTime() - scheduleDate.getTime()) / 86400000);
        if (daysSinceSchedule <= 7) {
          actions.push({
            invoiceId: inv.id,
            customerName: inv.customerName,
            customerEmail: inv.customerEmail,
            amount: inv.amount,
            stage: template.stage,
            scheduledDate: scheduleDate.toISOString().split("T")[0],
            sent: false,
            template,
          });
        }
      });
    });

  return actions.sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Generate sample CSV for demo/download
export function generateSampleCSV(): string {
  const today = new Date();
  const rows = [
    "customer_name,invoice_number,amount,due_date,issue_date,status,email",
    `Acme Manufacturing,INV-001,15000,${dateOffset(today, -45)},${dateOffset(today, -75)},unpaid,ar@acmemfg.com`,
    `Bright Solutions LLC,INV-002,8500,${dateOffset(today, -20)},${dateOffset(today, -50)},unpaid,billing@brightsol.com`,
    `CoreTech Industries,INV-003,32000,${dateOffset(today, -5)},${dateOffset(today, -35)},unpaid,accounts@coretech.com`,
    `Delta Services,INV-004,4200,${dateOffset(today, 10)},${dateOffset(today, -20)},unpaid,finance@deltaservices.com`,
    `Eagle Distribution,INV-005,67000,${dateOffset(today, -90)},${dateOffset(today, -120)},unpaid,ap@eagledist.com`,
    `FastTrack Logistics,INV-006,12300,${dateOffset(today, -12)},${dateOffset(today, -42)},unpaid,billing@fasttracklog.com`,
    `Global Parts Co,INV-007,5600,${dateOffset(today, 5)},${dateOffset(today, -25)},unpaid,pay@globalparts.com`,
    `Horizon Builders,INV-008,28000,${dateOffset(today, -35)},${dateOffset(today, -65)},unpaid,ar@horizonbuild.com`,
    `Imperial Supplies,INV-009,9100,${dateOffset(today, -60)},${dateOffset(today, -90)},unpaid,accounts@imperialsupply.com`,
    `JetStream Corp,INV-010,41000,${dateOffset(today, -8)},${dateOffset(today, -38)},unpaid,finance@jetstreamcorp.com`,
    `Kingston Medical,INV-011,18500,${dateOffset(today, 15)},${dateOffset(today, -15)},unpaid,billing@kingstonmed.com`,
    `Lakewood Foods,INV-012,7800,${dateOffset(today, -25)},${dateOffset(today, -55)},paid,ar@lakewoodfoods.com`,
    `Metro Electric,INV-013,23400,${dateOffset(today, -70)},${dateOffset(today, -100)},unpaid,accounts@metroelectric.com`,
    `NovaTech Systems,INV-014,55000,${dateOffset(today, -3)},${dateOffset(today, -33)},unpaid,finance@novatech.com`,
    `OceanView Resort,INV-015,3200,${dateOffset(today, -15)},${dateOffset(today, -45)},paid,billing@oceanview.com`,
    `Pacific Trading,INV-016,19800,${dateOffset(today, -40)},${dateOffset(today, -70)},unpaid,ar@pacifictrading.com`,
    `QuickServe Inc,INV-017,8900,${dateOffset(today, 20)},${dateOffset(today, -10)},unpaid,pay@quickserve.com`,
    `Redwood Analytics,INV-018,45000,${dateOffset(today, -55)},${dateOffset(today, -85)},unpaid,accounts@redwoodanalytics.com`,
    `Summit Group,INV-019,11200,${dateOffset(today, -1)},${dateOffset(today, -31)},unpaid,billing@summitgroup.com`,
    `Titan Manufacturing,INV-020,76000,${dateOffset(today, -100)},${dateOffset(today, -130)},unpaid,ar@titanmfg.com`,
  ];
  return rows.join("\n");
}

function dateOffset(base: Date, days: number): string {
  const d = new Date(base.getTime() + days * 86400000);
  return d.toISOString().split("T")[0];
}
