import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Validação de input: tokens são obrigatórios
  // Tokens malformados ou ausentes retornam 400 sem expor detalhes internos
  const body = await request.json().catch(() => null);
  if (!body?.access_token || !body?.refresh_token) {
    return NextResponse.json({ error: "Tokens obrigatórios" }, { status: 400 });
  }

  const { access_token, refresh_token } = body as {
    access_token: string;
    refresh_token: string;
  };

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

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });

  if (error) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  }
  return response;
}
