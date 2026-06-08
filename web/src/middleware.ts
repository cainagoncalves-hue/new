import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  // IMPORTANTE — SEGURANÇA: rotas /api/* estão FORA deste matcher.
  // Isso significa que /api/auth/session pode ser chamado sem sessão (necessário para login).
  //
  // ⚠️  Toda nova rota criada em /api/** DEVE incluir verificação de autenticação
  //     internamente, usando createClient() + supabase.auth.getSession().
  //     Não confie que o middleware protegerá rotas de API automaticamente.
  //
  // Rotas liberadas intencionalmente: /login, /auth/*, /api/*
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|auth|api).*)",
  ],
};
