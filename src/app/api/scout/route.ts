import { NextRequest, NextResponse } from "next/server";
import { searchApolloLeads, defaultSearchParams } from "@/lib/sales-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = body.apiKey || process.env.APOLLO_API_KEY || "";
    const params = body.params || defaultSearchParams;

    const leads = await searchApolloLeads(apiKey, params);

    return NextResponse.json({
      success: true,
      leads,
      count: leads.length,
      source: apiKey ? "apollo" : "mock",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to search leads" },
      { status: 500 }
    );
  }
}
