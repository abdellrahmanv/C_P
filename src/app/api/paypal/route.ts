import { NextRequest, NextResponse } from "next/server";

// PayPal Subscription webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.event_type;

    console.log(`PayPal Webhook: ${eventType}`);

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.CREATED":
        console.log("New subscription created:", body.resource?.id);
        // In production: create user account, start trial
        break;

      case "BILLING.SUBSCRIPTION.ACTIVATED":
        console.log("Subscription activated:", body.resource?.id);
        // In production: activate full access
        break;

      case "PAYMENT.SALE.COMPLETED":
        console.log("Payment received:", body.resource?.amount?.total);
        // In production: record payment, extend access
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        console.log("Subscription cancelled:", body.resource?.id);
        // In production: mark for end-of-period deactivation
        break;

      case "BILLING.SUBSCRIPTION.SUSPENDED":
        console.log("Subscription suspended:", body.resource?.id);
        // In production: restrict to read-only
        break;

      default:
        console.log("Unhandled PayPal event:", eventType);
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Return PayPal plan details for the pricing page
export async function GET() {
  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 49,
      interval: "month" as const,
      paypalPlanId: process.env.PAYPAL_STARTER_PLAN_ID || "DEMO_STARTER",
      features: [
        "Up to 100 invoices/month",
        "Late payment predictions",
        "Email templates (manual send)",
        "Basic dashboard",
        "Email support",
      ],
    },
    {
      id: "growth",
      name: "Growth",
      price: 149,
      interval: "month" as const,
      paypalPlanId: process.env.PAYPAL_GROWTH_PLAN_ID || "DEMO_GROWTH",
      features: [
        "Up to 500 invoices/month",
        "Late payment predictions",
        "Auto-send follow-ups",
        "Full dashboard + aging",
        "ROI calculator",
        "Priority support",
      ],
    },
    {
      id: "scale",
      name: "Scale",
      price: 349,
      interval: "month" as const,
      paypalPlanId: process.env.PAYPAL_SCALE_PLAN_ID || "DEMO_SCALE",
      features: [
        "Unlimited invoices",
        "Late payment predictions",
        "Auto-send follow-ups",
        "Full dashboard + aging",
        "ROI calculator",
        "Phone script generator",
        "Dedicated support",
      ],
    },
  ];

  return NextResponse.json({
    plans,
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "DEMO",
  });
}
