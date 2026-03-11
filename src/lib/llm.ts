/**
 * CashPulse LLM Layer
 * 
 * Best open-source models for each task:
 * 
 * | Task                  | Model              | Provider      | Free Tier        |
 * |-----------------------|--------------------|---------------|------------------|
 * | Cold email writing    | Qwen3-32B          | Groq          | 30 req/min free  |
 * | Invoice risk analysis | DeepSeek-R1-0528   | OpenRouter    | $1 free credit   |
 * | Voice call scripts    | Qwen3-72B          | OpenRouter    | $1 free credit   |
 * | Fast replies          | Llama-3.3-70B      | Groq          | 30 req/min free  |
 * | Reasoning/strategy    | DeepSeek-R1        | Groq          | 30 req/min free  |
 */

export type LLMProvider = 'groq' | 'openrouter';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

// ============================================================
// BEST MODELS PER TASK
// ============================================================

export const MODELS = {
  // Cold email personalization — Qwen3-32B is best for business writing
  COLD_EMAIL: {
    provider: 'groq' as LLMProvider,
    model: 'qwen-qwq-32b',       // Qwen3-32B on Groq (free, fast)
    maxTokens: 600,
    temperature: 0.7,
  },
  // Voice call scripts — needs natural, conversational tone
  VOICE_SCRIPT: {
    provider: 'openrouter' as LLMProvider,
    model: 'qwen/qwen3-72b:free', // Qwen3-72B (free tier on OpenRouter)
    maxTokens: 400,
    temperature: 0.6,
  },
  // Invoice risk reasoning — DeepSeek-R1 thinks step-by-step
  RISK_ANALYSIS: {
    provider: 'groq' as LLMProvider,
    model: 'deepseek-r1-distill-llama-70b', // DeepSeek-R1 distill on Groq (free)
    maxTokens: 800,
    temperature: 0.3,
  },
  // Fast email replies / classification
  FAST: {
    provider: 'groq' as LLMProvider,
    model: 'llama-3.3-70b-versatile', // Llama 3.3 70B (existing, fast)
    maxTokens: 400,
    temperature: 0.5,
  },
} as const;

// ============================================================
// UNIFIED INFERENCE CALL
// ============================================================

export async function callLLM(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (config.provider === 'groq') {
    return callGroq(config, systemPrompt, userPrompt);
  } else {
    return callOpenRouter(config, systemPrompt, userPrompt);
  }
}

async function callGroq(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: config.maxTokens ?? 500,
      temperature: config.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error: ${err}`);
  }

  const json = await res.json();
  return json.choices[0]?.message?.content?.trim() ?? '';
}

async function callOpenRouter(
  config: LLMConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://cashpulse.ai',
      'X-Title': 'CashPulse',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: config.maxTokens ?? 500,
      temperature: config.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${err}`);
  }

  const json = await res.json();
  return json.choices[0]?.message?.content?.trim() ?? '';
}

// ============================================================
// PROMPTS FOR EACH USE CASE
// ============================================================

export async function generateColdEmail(params: {
  companyName: string;
  contactName: string;
  contactTitle: string;
  industry: string;
  subject: string;
  template: string;
  senderName: string;
}): Promise<string> {
  const system = `You are a B2B sales expert writing cold emails for CashPulse, an AI accounts receivable tool.
Write concise, personalized cold emails that feel human — not spammy.
Return ONLY the email body. No subject line. No quotes. 3-4 short paragraphs max.`;

  const user = `Personalize this cold email template:

Company: ${params.companyName}
Contact: ${params.contactName} (${params.contactTitle})
Industry: ${params.industry}
Sender: ${params.senderName}

Template:
${params.template}

Make it feel personal and specific to their industry. Keep it short (under 120 words).`;

  try {
    return await callLLM(MODELS.COLD_EMAIL, system, user);
  } catch {
    // Fallback to fast model
    return await callLLM(MODELS.FAST, system, user);
  }
}

export async function generateVoiceScript(params: {
  customerName: string;
  contactName: string;
  invoiceNumber: string;
  amount: number;
  daysOverdue: number;
  companyName: string;
}): Promise<string> {
  const system = `You are writing a professional, friendly phone call script for an AI voice agent collecting overdue payments.
The tone must be:
- Professional but warm
- Direct — mention the invoice and amount clearly  
- Never threatening or aggressive
- End with a clear call-to-action (call back or visit link)
Return ONLY the spoken script in plain text. No stage directions. No URLs. Under 80 words.`;

  const user = `Generate a voice call script for:
Calling: ${params.contactName} at ${params.customerName}
Invoice: #${params.invoiceNumber} for $${params.amount.toLocaleString()}
Overdue: ${params.daysOverdue} days
On behalf of: ${params.companyName}

Start with "Hi, this is an automated message from ${params.companyName}..."`;

  try {
    return await callLLM(MODELS.VOICE_SCRIPT, system, user);
  } catch {
    // Fallback to Groq fast
    return await callLLM(MODELS.FAST, system, user);
  }
}

export async function analyzeInvoiceRisk(invoiceSummary: string): Promise<string> {
  const system = `You are a financial analyst specializing in accounts receivable risk.
Analyze the invoice data and provide a brief risk assessment.
Identify: highest risk customers, recommended actions, estimated recovery rate.
Be concise — 3-5 bullet points max.`;

  const user = `Analyze this AR portfolio and identify key risks:\n\n${invoiceSummary}`;

  try {
    return await callLLM(MODELS.RISK_ANALYSIS, system, user);
  } catch {
    return await callLLM(MODELS.FAST, system, user);
  }
}
