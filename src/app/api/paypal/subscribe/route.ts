import { NextRequest, NextResponse } from "next/server";

const PAYPAL_BASE = process.env.PAYPAL_SECRET?.startsWith("E")
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

const PLAN_MAP: Record<string, string | undefined> = {
  starter: process.env.PAYPAL_PLAN_STARTER,
  growth: process.env.PAYPAL_PLAN_GROWTH,
  scale: process.env.PAYPAL_PLAN_SCALE,
};

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get PayPal access token");
  const data = await res.json();
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { plan, userId } = await request.json();

    const planId = PLAN_MAP[plan];
    if (!planId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cashpulse-indol.vercel.app";
    const token = await getAccessToken();

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: userId,
        application_context: {
          brand_name: "CashPulse",
          locale: "en-US",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${appUrl}/dashboard?subscription=success`,
          cancel_url: `${appUrl}/dashboard?subscription=cancelled`,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("PayPal subscription creation failed:", err);
      return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
    }

    const subscription = await res.json();
    const approvalLink = subscription.links?.find(
      (l: { rel: string; href: string }) => l.rel === "approve"
    );

    if (!approvalLink) {
      return NextResponse.json({ error: "No approval URL returned" }, { status: 500 });
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      approvalUrl: approvalLink.href,
    });
  } catch (e) {
    console.error("Subscribe error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
