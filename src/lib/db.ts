import { getServiceSupabase } from './supabase';

// ============================================================
// INVOICE OPERATIONS
// ============================================================

export async function saveInvoices(userId: string, invoices: {
  invoice_number?: string;
  customer_name: string;
  customer_email?: string;
  amount: number;
  due_date: string;
  issue_date?: string;
  status?: string;
  days_overdue?: number;
  risk_score?: number;
}[]) {
  const sb = getServiceSupabase();
  const rows = invoices.map(inv => ({ ...inv, user_id: userId }));
  const { data, error } = await sb.from('invoices').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function getUserInvoices(userId: string) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);
  if (error) throw error;
}

// ============================================================
// LEAD OPERATIONS (Sales Agent)
// ============================================================

export async function saveLeads(leads: {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_title?: string;
  industry?: string;
  employee_count?: number;
  website?: string;
  score?: number;
}[]) {
  const sb = getServiceSupabase();
  const { data, error } = await sb.from('leads').insert(leads).select();
  if (error) throw error;
  return data;
}

export async function getLeadsByStage(stage?: string) {
  const sb = getServiceSupabase();
  let query = sb.from('leads').select('*').order('score', { ascending: false });
  if (stage) query = query.eq('stage', stage);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateLeadStage(leadId: string, stage: string) {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('leads')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw error;
}

export async function updateLeadSequenceStep(leadId: string, step: number) {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('leads')
    .update({
      sequence_step: step,
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);
  if (error) throw error;
}

export async function getLeadsForSequence(maxStep: number, limit: number = 10) {
  const sb = getServiceSupabase();
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .in('stage', ['new', 'contacted'])
    .lt('sequence_step', maxStep)
    .or(`last_contacted_at.is.null,last_contacted_at.lt.${cutoff}`)
    .order('score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ============================================================
// LEAD ACTIVITY
// ============================================================

export async function logLeadActivity(leadId: string, action: string, details?: string) {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('lead_activity')
    .insert({ lead_id: leadId, action, details });
  if (error) throw error;
}

// ============================================================
// EMAIL LOG
// ============================================================

export async function logEmail(entry: {
  user_id?: string;
  invoice_id?: string;
  to_email: string;
  subject: string;
  body: string;
  email_type: string;
  status?: string;
}) {
  const sb = getServiceSupabase();
  const { error } = await sb.from('email_log').insert(entry);
  if (error) throw error;
}

// ============================================================
// SUBSCRIPTION OPERATIONS
// ============================================================

export async function createSubscription(data: {
  user_id: string;
  paypal_subscription_id: string;
  plan: string;
  amount: number;
}) {
  const sb = getServiceSupabase();
  const { error } = await sb.from('subscriptions').insert({
    ...data,
    status: 'active',
    current_period_start: new Date().toISOString(),
  });
  if (error) throw error;
  // Update profile plan
  await sb.from('profiles').update({ 
    plan: data.plan, 
    paypal_subscription_id: data.paypal_subscription_id 
  }).eq('id', data.user_id);
}

export async function cancelSubscription(paypalSubscriptionId: string) {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('paypal_subscription_id', paypalSubscriptionId);
  if (error) throw error;
}

// ============================================================
// PAYMENT LOG
// ============================================================

export async function logPayment(data: {
  subscription_id?: string;
  user_id: string;
  paypal_payment_id?: string;
  amount: number;
}) {
  const sb = getServiceSupabase();
  const { error } = await sb.from('payments').insert(data);
  if (error) throw error;
}

// ============================================================
// USER PROFILE
// ============================================================

export async function getProfile(userId: string) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: {
  company_name?: string;
  plan?: string;
  onboarded?: boolean;
}) {
  const sb = getServiceSupabase();
  const { error } = await sb
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export async function getDashboardStats(userId: string) {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('user_dashboard_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || {
    total_invoices: 0,
    overdue_count: 0,
    total_outstanding: 0,
    overdue_amount: 0,
    collected_amount: 0,
    avg_risk_score: 0,
  };
}
