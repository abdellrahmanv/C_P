import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  // Admin-only: verify user email matches ADMIN_EMAIL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !adminEmail) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { target, method, headerKey } = await request.json();

  // Only allow internal API calls
  const allowed = ["/api/automate", "/api/nexus/eval"];
  const url = new URL(target, request.url);
  if (!allowed.some((a) => url.pathname.startsWith(a))) {
    return NextResponse.json({ error: "Target not allowed" }, { status: 400 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (headerKey === "x-nexus-key") {
    headers["x-nexus-key"] = process.env.NEXUS_API_KEY || process.env.CRON_SECRET || "";
  }
  headers["authorization"] = `Bearer ${process.env.CRON_SECRET || ""}`;

  const res = await fetch(url.toString(), { method: method || "GET", headers });
  const data = await res.json().catch(() => ({}));

  return NextResponse.json(data, { status: res.status });
}
