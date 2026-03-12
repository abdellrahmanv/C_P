import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const protectedRoutes = ["/dashboard", "/onboarding", "/sales", "/nexus", "/voice"];
const publicRoutes = ["/", "/login", "/demo"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes — they have their own auth
  if (pathname.startsWith("/api")) return NextResponse.next();

  // Skip public routes
  if (publicRoutes.some((r) => pathname === r)) return NextResponse.next();

  // Check if this is a protected route
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  if (!isProtected) return NextResponse.next();

  // Check for Supabase auth token in cookies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase not configured — allow through (dev mode)
    return NextResponse.next();
  }

  // Read the auth token from the sb-* cookie
  const cookieName = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
  const tokenCookie = request.cookies.get(cookieName);

  if (!tokenCookie?.value) {
    // No auth cookie — redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token with Supabase
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${tokenCookie.value}` } },
    });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
