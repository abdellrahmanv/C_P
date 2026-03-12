import { NextRequest, NextResponse } from "next/server";
import { searchApolloLeads, defaultSearchParams, scoreLead } from "@/lib/sales-engine";
import type { ApolloSearchParams } from "@/lib/sales-types";
import { getServiceSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  // Auth: either cron secret or Supabase session
  const cronSecret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && cronSecret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = (body as Record<string, string>).apiKey || process.env.APOLLO_API_KEY || "";
    const params: ApolloSearchParams = (body as Record<string, unknown>).params as ApolloSearchParams || defaultSearchParams;

    const leads = await searchApolloLeads(apiKey, params);

    // Persist to Supabase
    const supabase = getServiceSupabase();
    let saved = 0;
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

      if (!error) saved++;
    }

    return NextResponse.json({
      success: true,
      count: leads.length,
      saved,
      source: apiKey ? "apollo" : "mock",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to search leads" },
      { status: 500 }
    );
  }
}
