import { NextRequest, NextResponse } from "next/server";
import { generateColdEmail } from "@/lib/llm";
import type { Lead } from "@/lib/sales-types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead, subject, emailBody, from } = body as {
      lead: Lead;
      subject: string;
      emailBody: string;
      from?: string;
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

    // Personalize with best available LLM (Qwen3-32B → Llama 3.3 70B fallback)
    let personalizedBody = emailBody;
    try {
      personalizedBody = await generateColdEmail({
        companyName: lead.companyName,
        contactName: lead.contactName,
        contactTitle: lead.contactTitle || 'Finance Manager',
        industry: lead.industry || 'Business',
        subject,
        template: emailBody,
        senderName: from || process.env.SENDER_NAME || 'CashPulse',
      });
    } catch {
      // Use raw template if LLM unavailable
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      // Demo mode
      console.log("=== COLD EMAIL (Demo Mode) ===");
      console.log(`To: ${lead.email} (${lead.contactName} @ ${lead.companyName})`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${personalizedBody.substring(0, 300)}...`);
      console.log("==============================");

      return NextResponse.json({
        success: true,
        mode: "demo",
        personalized: true,
        message: "Cold email logged (set RESEND_API_KEY to send)",
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
        from: from || "CashPulse <hello@cashpulse.io>",
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
