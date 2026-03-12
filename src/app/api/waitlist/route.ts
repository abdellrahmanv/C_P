import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Upsert — don't error on duplicates
    const { error } = await supabase
      .from("waitlist")
      .upsert({ email: email.toLowerCase().trim() }, { onConflict: "email" });

    if (error) {
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Could not join waitlist" }, { status: 500 });
    }

    // Send welcome email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `CashPulse <${process.env.SENDER_EMAIL || "onboarding@resend.dev"}>`,
          to: [email],
          subject: "You're on the CashPulse waitlist!",
          text: `Hey!\n\nThanks for joining the CashPulse waitlist. We help B2B companies predict late payments and auto-collect overdue invoices.\n\nYou'll get:\n- Early access when new features drop\n- Tips on collecting overdue invoices faster\n- A free invoice aging template\n\nIn the meantime, try our free demo: ${process.env.NEXT_PUBLIC_APP_URL || "https://cashpulse-indol.vercel.app"}/demo\n\n— The CashPulse Team`,
        }),
      }).catch(() => { /* non-critical */ });
    }

    return NextResponse.json({ message: "You're on the list! Check your email." });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
