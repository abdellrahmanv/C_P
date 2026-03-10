import { NextRequest, NextResponse } from "next/server";
import { personalizeEmail } from "@/lib/sales-engine";
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

    // Personalize with Groq if available
    const groqKey = process.env.GROQ_API_KEY || "";
    const personalizedBody = groqKey
      ? await personalizeEmail(groqKey, emailBody, lead)
      : emailBody;

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
        personalized: !!groqKey,
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
      personalized: !!groqKey,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
