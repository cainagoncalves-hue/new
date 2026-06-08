import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FilterBar from "@/components/FilterBar";
import AppShell from "@/components/AppShell";
import { Suspense } from "react";
import { getCachedBPLeaders } from "@/lib/bp";

async function Topbar() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const name = session?.user?.email?.split("@")[0] ?? "Usuário";

  return (
    <header style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "0 48px",
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 100,
      boxShadow: "var(--sh)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Logo SIEG */}
        <img
          src="/logo-sieg.svg"
          alt="SIEG"
          style={{ height: 36, width: "auto", display: "block" }}
        />
        <div>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text-900)",
          }}>
            People Plan · Gente &amp; Cultura
          </div>
          <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 1, letterSpacing: "0.04em" }}>
            Check-in de Metas · Business Partners
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          background: "var(--brand-pale)",
          color: "var(--brand)",
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 14px",
          borderRadius: 20,
          border: "1px solid rgba(109,40,217,.15)",
        }}>
          1º Trimestre 2026
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--brand-pale)",
            color: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
          }}>
            {name.charAt(0)}
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                background: "none",
                border: "1px solid var(--border-2)",
                borderRadius: 8,
                color: "var(--text-500)",
                fontSize: 12,
                padding: "5px 12px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  // Verifica se o usuário logado é admin para exibir o módulo de dados
  const { data: appUser } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  const isAdmin = appUser?.role === "admin";

  // Carrega líderes do banco para alimentar o FilterBar (Client Component)
  const leaders = await getCachedBPLeaders();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Topbar />
      <AppShell isAdmin={isAdmin}>
        <Suspense fallback={
          <div style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            height: 56,
          }} />
        }>
          <FilterBar leaders={leaders} />
        </Suspense>
        {children}
        <footer style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          padding: "22px 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 60,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/logo-sieg.svg"
              alt="SIEG"
              style={{ height: 24, width: "auto", display: "block", opacity: 0.7 }}
            />
            <span style={{ fontSize: 12, color: "var(--text-300)" }}>
              Gente &amp; Cultura · People Plan · Dados via Elofy
            </span>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-300)" }}>
            Atualizado: Maio 2026
          </span>
        </footer>
      </AppShell>
    </div>
  );
}
