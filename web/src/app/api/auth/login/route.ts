import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies);
        },
      },
    },
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), { status: 303 });
  }

  // Build redirect response and set all auth cookies explicitly in headers
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }
  return response;
}
