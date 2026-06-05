import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { excludeAdmins } from "@/lib/adminAccounts";
import { getBPAreas, type BPKey } from "@/lib/bp";

function formatMonthLabel(key: string): string {
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const [year, month] = key.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return key;
  return `${months[month - 1]} ${year}`;
}

function nextMonth(mesStr: string): string {
  const [year, month] = mesStr.split("-").map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function coverageColor(pct: number) {
  if (pct >= 80) return "var(--green)";
  if (pct >= 50) return "var(--amber)";
  return "var(--red)";
}

function coverageLabel(pct: number) {
  if (pct >= 80) return "Ótimo";
  if (pct >= 50) return "Parcial";
  return "Crítico";
}

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function initials(name: string) {
  return name.split(" ").filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

interface LeaderFeedback {
  name: string;
  area: string;
  total: number;
  withFeedback: string[];
  withoutFeedback: string[];
  coverage: number;
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string; mes?: string }>;
}) {
  const { bp = "geral", leader = "", mes = "" } = await searchParams;
  const supabase = await createClient();
  const bpAreas = await getBPAreas(supabase);

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && bpAreas[bp as BPKey]) areaFilter = bpAreas[bp as BPKey];

  // Fetch distinct months for period filter
  const { data: fbDateRows } = await supabase
    .from("elofy_feedbacks")
    .select("data_feedback")
    .not("data_feedback", "is", null)
    .order("data_feedback", { ascending: false })
    .limit(5000);

  const monthKeySet = new Set<string>();
  for (const row of fbDateRows ?? []) {
    const key = (row.data_feedback as string)?.slice(0, 7);
    if (key) monthKeySet.add(key);
  }
  const periods = [...monthKeySet]
    .sort((a, b) => b.localeCompare(a))
    .map(key => ({ key, label: formatMonthLabel(key) }));
  const activeMes = mes || (periods[0]?.key ?? "");

  const monthStart = activeMes ? `${activeMes}-01` : "9999-01-01";
  const monthEnd = activeMes ? nextMonth(activeMes) : "9999-01-02";

  function periodUrl(key: string) {
    const params = new URLSearchParams();
    if (bp !== "geral") params.set("bp", bp);
    if (leader) params.set("leader", leader);
    params.set("mes", key);
    return `/feedback?${params.toString()}`;
  }

  // Get all active users with their manager
  let usersQ = excludeAdmins(
    supabase.from("elofy_users").select("nome_colaborador, id_gestor, nome_gestor, nome_time").eq("status", "Ativo"),
    "nome_colaborador"
  );
  if (areaFilter) usersQ = usersQ.in("nome_time", areaFilter);
  if (leader) usersQ = usersQ.eq("nome_gestor", leader);
  const { data: users } = await usersQ;

  // Get feedback recipients for the selected month
  let fbQ = excludeAdmins(
    excludeAdmins(
      supabase.from("elofy_feedbacks")
        .select("usuario_destinatario, time_usuario_destinatario, usuario_remetente")
        .gte("data_feedback", monthStart)
        .lt("data_feedback", monthEnd),
      "usuario_destinatario"
    ),
    "usuario_remetente"
  );
  if (areaFilter) fbQ = fbQ.in("time_usuario_destinatario", areaFilter);
  const { data: feedbacks } = await fbQ;

  const feedbackSet = new Set((feedbacks ?? []).map(f => f.usuario_destinatario?.toLowerCase().trim()));

  // Group by manager
  const leaderMap: Record<string, {
    area: string;
    reports: string[];
  }> = {};

  for (const u of users ?? []) {
    const mgr = u.nome_gestor ?? "";
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;
    if (!leaderMap[mgr]) leaderMap[mgr] = { area: u.nome_time ?? "", reports: [] };
    leaderMap[mgr].reports.push(u.nome_colaborador ?? "");
  }

  const leaders: LeaderFeedback[] = Object.entries(leaderMap).map(([name, data]) => {
    const withFeedback = data.reports.filter(r => feedbackSet.has(r.toLowerCase().trim()));
    const withoutFeedback = data.reports.filter(r => !feedbackSet.has(r.toLowerCase().trim()));
    const coverage = data.reports.length > 0 ? Math.round((withFeedback.length / data.reports.length) * 100) : 0;
    return {
      name,
      area: data.area,
      total: data.reports.length,
      withFeedback,
      withoutFeedback,
      coverage,
    };
  }).sort((a, b) => b.coverage - a.coverage);

  const totalWithFb = leaders.reduce((s, l) => s + l.withFeedback.length, 0);
  const totalPeople = leaders.reduce((s, l) => s + l.total, 0);
  const globalCoverage = totalPeople > 0 ? Math.round((totalWithFb / totalPeople) * 100) : 0;

  const bpLabels: Record<string, string> = {
    caina: "Cainã · Comercial & Marketing",
    izabela: "Izabela · CX/CS & Financeiro",
    renata_paula: "Renata/Paula · Tecnologia & RH",
  };

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>← Hub</Link>
            <span style={{ color: "var(--border-2)" }}>·</span>
            <span style={{ fontSize: 13, color: "var(--text-500)" }}>Relatório de Feedback</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
            Cobertura de Feedback
          </h1>
          {(bp !== "geral" || leader) && (
            <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
              {leader ? `Líder: ${leader}` : `Carteira: ${bpLabels[bp] ?? bp}`}
            </p>
          )}
        </div>

        {/* Global stat */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "20px 28px",
          textAlign: "center",
          boxShadow: "var(--sh)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
            Cobertura Geral
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: coverageColor(globalCoverage), lineHeight: 1 }}>
            {globalCoverage}%
          </div>
          <div style={{ fontSize: 11, color: coverageColor(globalCoverage), fontWeight: 600, marginTop: 4 }}>
            {coverageLabel(globalCoverage)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
            {totalWithFb} de {totalPeople} colaboradores
          </div>
        </div>
      </div>

      {/* Filtro de período */}
      {periods.length > 1 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {periods.map((p) => {
            const isActive = p.key === activeMes;
            return (
              <a
                key={p.key}
                href={periodUrl(p.key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  background: isActive ? "var(--brand)" : "var(--surface)",
                  color: isActive ? "#fff" : "var(--text-500)",
                  border: `1px solid ${isActive ? "var(--brand)" : "var(--border)"}`,
                  transition: "all 0.15s",
                }}
              >
                {p.label}
              </a>
            );
          })}
        </div>
      )}

      {leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {leaders.map((l) => {
            const color = coverageColor(l.coverage);
            return (
              <div
                key={l.name}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  padding: 20,
                  boxShadow: "var(--sh)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--brand-pale)",
                    color: "var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                    flexShrink: 0,
                    fontFamily: "'Syne', sans-serif",
                  }}>
                    {initials(l.name)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-900)" }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>{l.area}</div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ flex: 2, minWidth: 160, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${l.coverage}%`,
                        background: color,
                        borderRadius: 4,
                      }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color, flexShrink: 0, minWidth: 38 }}>
                      {l.coverage}%
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--green)" }}>{l.withFeedback.length}</div>
                      <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 2 }}>Receberam</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--red)" }}>{l.withoutFeedback.length}</div>
                      <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 2 }}>Pendentes</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text-500)" }}>{l.total}</div>
                      <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 2 }}>Total</div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 10,
                    background: l.coverage >= 80 ? "var(--green-bg)" : l.coverage >= 50 ? "var(--amber-bg)" : "var(--red-bg)",
                    color: l.coverage >= 80 ? "var(--green-text)" : l.coverage >= 50 ? "var(--amber-text)" : "var(--red-text)",
                    flexShrink: 0,
                  }}>
                    {coverageLabel(l.coverage)}
                  </span>
                </div>

                {/* Pending people */}
                {l.withoutFeedback.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-300)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                      Sem feedback
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                      {l.withoutFeedback.map((name) => (
                        <span key={name} style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 10,
                          background: "var(--red-bg)",
                          color: "var(--red-text)",
                          border: "1px solid #fecaca",
                        }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
