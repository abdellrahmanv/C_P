import { NextRequest, NextResponse } from "next/server";
import { generateColdEmail } from "@/lib/llm";
import { getServiceSupabase } from "@/lib/supabase";
import type { Lead } from "@/lib/sales-types";

export async function POST(request: NextRequest) {
  // Auth: cron secret or valid request
  const cronSecret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && cronSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { lead, subject, emailBody } = body as {
      lead: Lead;
      subject: string;
      emailBody: string;
    };

    if (!lead?.email || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: lead, subject, emailBody" },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(lead.email)) {
      return NextResponse.json(
        { error: "Invalid lead email address" },
        { status: 400 }
      );
    }

    const senderEmail = process.env.SENDER_EMAIL || "onboarding@resend.dev";

    // Personalize with LLM
    let personalizedBody = emailBody;
    try {
      personalizedBody = await generateColdEmail({
        companyName: lead.companyName,
        contactName: lead.contactName,
        contactTitle: lead.contactTitle || "Finance Manager",
        industry: lead.industry || "Business",
        subject,
        template: emailBody,
        senderName: process.env.SENDER_NAME || "CashPulse",
      });
    } catch {
      // Use raw template if LLM unavailable
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        mode: "demo",
        personalized: true,
        message: "Email logged (set RESEND_API_KEY to send)",
      });
    }

    // Send via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `CashPulse <${senderEmail}>`,
        to: [lead.email],
        subject,
        text: personalizedBody,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: "Failed to send", details: error },
        { status: 500 }
      );
    }

    const result = await response.json();

    // Log to lead_activity
    const supabase = getServiceSupabase();
    if (lead.id) {
      await supabase.from("lead_activity").insert({
        lead_id: lead.id,
        action: "email_sent",
        details: JSON.stringify({
          to: lead.email,
          subject,
          resend_id: result.id,
          step: lead.sequenceStep || 0,
        }),
      });

      // Update lead stage
      await supabase.from("leads").update({
        stage: "contacted",
        sequence_step: (lead.sequenceStep || 0) + 1,
        last_contacted_at: new Date().toISOString(),
      }).eq("id", lead.id);
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      personalized: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
