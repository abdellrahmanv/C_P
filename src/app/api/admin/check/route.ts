import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !adminEmail) {
    return NextResponse.json({ isAdmin: false });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} },
  });

  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ isAdmin: !!user && user.email === adminEmail });
}
