import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getSupabase() {
  return createClient(supabaseUrl, serviceKey);
}

// Map PayPal plan IDs to our plan names
function planFromPayPalId(paypalPlanId: string): string {
  const starterPlan = process.env.PAYPAL_PLAN_STARTER;
  const growthPlan = process.env.PAYPAL_PLAN_GROWTH;
  const scalePlan = process.env.PAYPAL_PLAN_SCALE;
  if (paypalPlanId === starterPlan) return "starter";
  if (paypalPlanId === growthPlan) return "growth";
  if (paypalPlanId === scalePlan) return "scale";
  return "free";
}

// PayPal Subscription webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.event_type;
    const resource = body.resource || {};
    const subscriptionId = resource.id || resource.billing_agreement_id;
    const customId = resource.custom_id; // We pass user_id as custom_id during checkout

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ received: true, note: "no db configured" });
    }

    const supabase = getSupabase();

    switch (eventType) {
      case "BILLING.SUBSCRIPTION.CREATED": {
        // Subscription created — save to subscriptions table
        if (customId && subscriptionId) {
          await supabase.from("subscriptions").upsert({
            user_id: customId,
            paypal_subscription_id: subscriptionId,
            plan: planFromPayPalId(resource.plan_id),
            status: "pending",
            current_period_start: resource.start_time,
          }, { onConflict: "user_id" });
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        // Subscription activated — grant full access
        if (subscriptionId) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("paypal_subscription_id", subscriptionId)
            .single();
          if (sub) {
            await supabase.from("subscriptions")
              .update({ status: "active" })
              .eq("paypal_subscription_id", subscriptionId);
            await supabase.from("profiles")
              .update({ plan: planFromPayPalId(resource.plan_id) || "growth" })
              .eq("id", sub.user_id);
          }
        }
        break;
      }

      case "PAYMENT.SALE.COMPLETED": {
        // Payment received — record payment
        const amount = parseFloat(resource.amount?.total || "0");
        if (subscriptionId && amount > 0) {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, user_id")
            .eq("paypal_subscription_id", subscriptionId)
            .single();
          if (sub) {
            await supabase.from("payments").insert({
              subscription_id: sub.id,
              user_id: sub.user_id,
              paypal_payment_id: resource.id,
              amount,
              status: "completed",
            });
          }
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.CANCELLED": {
        if (subscriptionId) {
          await supabase.from("subscriptions")
            .update({ status: "cancelled" })
            .eq("paypal_subscription_id", subscriptionId);
        }
        break;
      }

      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        if (subscriptionId) {
          await supabase.from("subscriptions")
            .update({ status: "suspended" })
            .eq("paypal_subscription_id", subscriptionId);
          // Downgrade to free
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("paypal_subscription_id", subscriptionId)
            .single();
          if (sub) {
            await supabase.from("profiles")
              .update({ plan: "free" })
              .eq("id", sub.user_id);
          }
        }
        break;
      }
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
      paypalPlanId: process.env.PAYPAL_PLAN_STARTER || "DEMO_STARTER",
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
      paypalPlanId: process.env.PAYPAL_PLAN_GROWTH || "DEMO_GROWTH",
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
      paypalPlanId: process.env.PAYPAL_PLAN_SCALE || "DEMO_SCALE",
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
