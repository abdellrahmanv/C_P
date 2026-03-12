import { NextRequest, NextResponse } from "next/server";

async function getAccessToken(base: string): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    throw new Error(
      `PayPal credentials missing. clientId=${clientId ? "set" : "MISSING"}, secret=${secret ? "set" : "MISSING"}`
    );
  }

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("PayPal returned no access token");
  return data.access_token;
}

export async function POST(request: NextRequest) {
  try {
    const { plan, userId } = await request.json();

    // Read env vars at request time (not module load time) for Vercel compatibility
    const base =
      process.env.PAYPAL_MODE === "sandbox"
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

    const planMap: Record<string, string | undefined> = {
      starter: process.env.PAYPAL_PLAN_STARTER,
      growth: process.env.PAYPAL_PLAN_GROWTH,
      scale: process.env.PAYPAL_PLAN_SCALE,
    };

    const planId = planMap[plan];
    if (!planId) {
      return NextResponse.json(
        { error: `Invalid or unconfigured plan: "${plan}". growth=${planMap.growth ? "set" : "MISSING"}` },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://cashpulse-indol.vercel.app";
    const token = await getAccessToken(base);

    const res = await fetch(`${base}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: userId || undefined,
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
      return NextResponse.json(
        { error: `PayPal rejected subscription (${res.status}): ${err}` },
        { status: 500 }
      );
    }

    const subscription = await res.json();
    const approvalLink = subscription.links?.find(
      (l: { rel: string; href: string }) => l.rel === "approve"
    );

    if (!approvalLink) {
      return NextResponse.json(
        { error: "No approval URL in PayPal response", links: subscription.links },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      approvalUrl: approvalLink.href,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Subscribe error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
