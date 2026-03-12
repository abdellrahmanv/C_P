import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/onboarding';

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let response = NextResponse.redirect(new URL(next, request.url));

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Dynamically determine redirect based on onboarding status
      let destination = next;
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('id', data.user.id)
          .single();
        if (profile?.onboarded) {
          destination = '/dashboard';
        } else {
          destination = '/onboarding';
        }
      }
      response = NextResponse.redirect(new URL(destination, request.url));
      // Re-set cookies on the new response
      const supabase2 = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });
      await supabase2.auth.getUser();
      return response;
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
}
