import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { excludeAdmins } from "@/lib/adminAccounts";
import DesligamentosForm from "./DesligamentosForm";
import CIDFForm from "./CIDFForm";
import TalentosForm from "./TalentosForm";
import IMGForm from "./IMGForm";

export default async function DadosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "desligamentos" } = await searchParams;
  const supabase = await createClient();

  // ── Auth guard: apenas admins ────────────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: appUser } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (appUser?.role !== "admin") {
    redirect("/");
  }

  // ── Fetch gestores ativos para dropdowns ─────────────────────
  const { data: gestoresRows } = await excludeAdmins(
    supabase.from("elofy_users")
      .select("nome_gestor")
      .eq("status", "Ativo")
      .not("nome_gestor", "is", null),
    "nome"
  );

  const gestores = [...new Set(
    (gestoresRows ?? [])
      .map(r => (r.nome_gestor ?? "").trim())
      .filter(g => g && !g.toLowerCase().includes("elofy"))
  )].sort();

  // ── Fetch existing records ───────────────────────────────────
  const [
    { data: desligamentos },
    { data: cidfRecords },
    { data: talentos },
    { data: imgRecords },
  ] = await Promise.all([
    supabase.from("manual_desligamentos").select("*").order("mes_referencia", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("manual_cidf").select("*").order("mes_referencia", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("manual_talentos_chave").select("*").order("created_at", { ascending: false }),
    supabase.from("manual_img_indicadores").select("*").order("mes_referencia", { ascending: false }).order("nome_gestor"),
  ]);

  const TABS = [
    { key: "desligamentos", label: "Turnover", icon: "⬡" },
    { key: "cidf", label: "CID F", icon: "⬡" },
    { key: "talentos", label: "Talentos Chave", icon: "⬡" },
    { key: "img", label: "Indicadores IMG", icon: "⬡" },
  ];

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>← Hub</Link>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <span style={{ fontSize: 13, color: "var(--text-500)" }}>Atualização de Dados</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
            Atualização de Dados
          </h1>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "var(--brand)",
            color: "#fff",
            padding: "3px 10px",
            borderRadius: 6,
          }}>
            Admin
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
          Insira os dados manuais que alimentam os índices ISO, ISBE e IMG.
        </p>
      </div>

      {/* Tab navigation */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--border)",
        marginBottom: 28,
      }}>
        {TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/dados?tab=${key}`}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              color: tab === key ? "var(--brand)" : "var(--text-500)",
              borderBottom: tab === key ? "2px solid var(--brand)" : "2px solid transparent",
              marginBottom: -1,
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: 28,
        boxShadow: "var(--sh)",
      }}>
        {tab === "desligamentos" && (
          <>
            <SectionHeader
              title="Desligamentos"
              description="Registre desligamentos voluntários e involuntários. O turnover voluntário compõe 10% do ISO (meta: ≤ 0,8%)."
            />
            <DesligamentosForm gestores={gestores} records={desligamentos ?? []} />
          </>
        )}

        {tab === "cidf" && (
          <>
            <SectionHeader
              title="Absenteísmo CID F"
              description="Registre colaboradores com ausência por CID F. Compõe 10% do ISO (meta: ≤ 0,15%). Um registro por colaborador/mês."
            />
            <CIDFForm gestores={gestores} records={cidfRecords ?? []} />
          </>
        )}

        {tab === "talentos" && (
          <>
            <SectionHeader
              title="Talentos Chave"
              description="Mapeie talentos por performance e sucessão, com plano de ação e status de evolução. Usado no critério de talentos do IMG."
            />
            <TalentosForm gestores={gestores} records={talentos ?? []} />
          </>
        )}

        {tab === "img" && (
          <>
            <SectionHeader
              title="Indicadores IMG"
              description="Preencha os percentuais mensais de cada critério do IMG por gestor. Dados existentes serão sobrescritos ao salvar."
            />
            <IMGForm gestores={gestores} records={imgRecords ?? []} />
          </>
        )}
      </div>
    </main>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text-900)", marginBottom: 4 }}>
        {title}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-500)" }}>{description}</p>
      <div style={{ height: 1, background: "var(--border)", marginTop: 16, marginBottom: 20 }} />
    </div>
  );
}
