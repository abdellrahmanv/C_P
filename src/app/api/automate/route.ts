import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { searchApolloLeads, defaultSearchParams, scoreLead, getColdEmailSequence } from "@/lib/sales-engine";
import { generateColdEmail } from "@/lib/llm";

function verifyCron(request: NextRequest): boolean {
  const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "")
    || request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // no secret configured = allow
  return cronSecret === expected;
}

function getAction(request: NextRequest): string {
  return request.nextUrl.searchParams.get("action") || "";
}

// Vercel crons send GET requests
export async function GET(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = getAction(request);
  return runAction(action, request);
}

// Manual trigger via POST (from sales UI)
export async function POST(request: NextRequest) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = (body as Record<string, string>).action || getAction(request);
    return runAction(action, request);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

async function runAction(action: string, request: NextRequest) {
  const supabase = getServiceSupabase();

  switch (action) {
    case "scout": {
      // 1. Search for leads
      const apiKey = process.env.APOLLO_API_KEY || "";
      const leads = await searchApolloLeads(apiKey, defaultSearchParams);

      // 2. Persist to Supabase (upsert by contact_email to avoid duplicates)
      let newCount = 0;
      for (const lead of leads) {
        if (!lead.email) continue;
        const { error } = await supabase
          .from("leads")
          .upsert({
            contact_email: lead.email,
            company_name: lead.companyName,
            contact_name: lead.contactName,
            contact_title: lead.contactTitle,
            industry: lead.industry,
            employee_count: lead.employeeCount,
            website: lead.website,
            source: lead.source,
            score: scoreLead(lead),
            stage: "new",
            sequence_step: 0,
          }, { onConflict: "contact_email", ignoreDuplicates: true });

        if (!error) newCount++;
      }

      return NextResponse.json({
        action: "scout",
        found: leads.length,
        newLeads: newCount,
        source: apiKey ? "apollo" : "mock",
      });
    }

    case "send-sequence": {
      // Get leads that need follow-up: contacted but not replied/converted, and last_contacted > 2 days ago
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

      const { data: dueLeads } = await supabase
        .from("leads")
        .select("*")
        .in("stage", ["new", "contacted"])
        .lt("sequence_step", 4)  // max 4 steps
        .or(`last_contacted_at.is.null,last_contacted_at.lt.${twoDaysAgo}`)
        .order("score", { ascending: false })
        .limit(20); // max 20 per run to stay within Resend limits

      if (!dueLeads?.length) {
        return NextResponse.json({ action: "send-sequence", sent: 0, message: "No leads due for follow-up" });
      }

      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const senderEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";
      let sent = 0;

      for (const lead of dueLeads) {
        if (!lead.contact_email) continue;

        const leadObj = {
          id: lead.id,
          companyName: lead.company_name,
          contactName: lead.contact_name,
          contactTitle: lead.contact_title || "",
          email: lead.contact_email,
          industry: lead.industry || "",
          employeeCount: lead.employee_count || 0,
          website: lead.website || "",
          source: lead.source || "apollo",
          status: lead.stage as "new" | "contacted",
          score: lead.score || 0,
          sequenceStep: lead.sequence_step || 0,
          notes: "",
          createdAt: lead.created_at,
          tags: [],
        };

        const sequence = getColdEmailSequence(leadObj, "CashPulse");
        const step = sequence[leadObj.sequenceStep] || sequence[0];

        // Personalize with LLM
        let body = step.body;
        try {
          body = await generateColdEmail({
            companyName: leadObj.companyName,
            contactName: leadObj.contactName,
            contactTitle: leadObj.contactTitle || "Finance Manager",
            industry: leadObj.industry || "Business",
            subject: step.subject,
            template: step.body,
            senderName: "CashPulse",
          });
        } catch {
          // use raw template
        }

        // Send email
        if (RESEND_API_KEY) {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `CashPulse <${senderEmail}>`,
              to: [leadObj.email],
              subject: step.subject,
              text: body,
            }),
          });

          if (emailRes.ok) {
            const emailData = await emailRes.json();

            // Log email in lead_activity (no user_id needed)
            await supabase.from("lead_activity").insert({
              lead_id: lead.id,
              action: "email_sent",
              details: JSON.stringify({
                to: leadObj.email,
                subject: step.subject,
                step: leadObj.sequenceStep,
                resend_id: emailData.id,
              }),
            });

            // Update lead
            await supabase.from("leads").update({
              stage: "contacted",
              sequence_step: leadObj.sequenceStep + 1,
              last_contacted_at: new Date().toISOString(),
            }).eq("id", lead.id);

            sent++;
          }
        }
      }

      return NextResponse.json({
        action: "send-sequence",
        dueLeads: dueLeads.length,
        sent,
      });
    }

    case "daily-report": {
      // Generate daily metrics summary
      const { data: totalLeads } = await supabase
        .from("leads")
        .select("stage", { count: "exact" });

      const { data: emailsSent } = await supabase
        .from("email_log")
        .select("id", { count: "exact" })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const { data: recentLeads } = await supabase
        .from("leads")
        .select("stage")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const report = {
        date: new Date().toISOString().split("T")[0],
        totalLeads: totalLeads?.length || 0,
        emailsSentToday: emailsSent?.length || 0,
        newLeadsToday: recentLeads?.length || 0,
        stages: {
          new: totalLeads?.filter((l) => l.stage === "new").length || 0,
          contacted: totalLeads?.filter((l) => l.stage === "contacted").length || 0,
          replied: totalLeads?.filter((l) => l.stage === "replied").length || 0,
          converted: totalLeads?.filter((l) => l.stage === "converted").length || 0,
        },
      };

      // Send report to admin email
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const senderEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";
      if (RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `CashPulse <${senderEmail}>`,
            to: [senderEmail],
            subject: `CashPulse Daily Report — ${report.date}`,
            text: `Daily Sales Report\n==================\nTotal Leads: ${report.totalLeads}\nNew Today: ${report.newLeadsToday}\nEmails Sent Today: ${report.emailsSentToday}\n\nPipeline:\n  New: ${report.stages.new}\n  Contacted: ${report.stages.contacted}\n  Replied: ${report.stages.replied}\n  Converted: ${report.stages.converted}`,
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ action: "daily-report", report });
    }

    default:
      return NextResponse.json(
        { error: "Unknown action. Use: scout, send-sequence, daily-report" },
        { status: 400 }
      );
  }
}
