import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { excludeAdmins } from "@/lib/adminAccounts";
import { getCachedBPAreas, type BPKey } from "@/lib/bp";
import { getLeaderSubtree } from "@/lib/hierarchy";
import PeriodSelect from "@/components/PeriodSelect";

function formatMonthLabel(key: string): string {
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const [year, month] = key.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return key;
  return `${months[month - 1]} ${year}`;
}

function nextMonth(mesStr: string): string {
  const [year, month] = mesStr.split("-").map(Number);
  if (month === 12) return `${year + 1}-01-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
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
  const bpAreas = await getCachedBPAreas();

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && bpAreas[bp as BPKey]) areaFilter = bpAreas[bp as BPKey];

  // Expande o filtro de líder para toda a hierarquia abaixo dele
  const subtreeLeaders = leader ? await getLeaderSubtree(supabase, leader) : null;

  // Meses disponíveis: inclui qualquer mês com feedback, 1:1 ou indicador manual
  const { data: mesRows } = await supabase.rpc("get_img_available_months");
  const monthKeySet = new Set<string>();
  for (const row of (mesRows as Array<{ mes_key: string }> ?? [])) {
    if (row.mes_key) monthKeySet.add(row.mes_key);
  }
  const periods = [...monthKeySet]
    .sort((a, b) => b.localeCompare(a))
    .map(key => ({ key, label: formatMonthLabel(key) }));
  const activeMes = mes || (periods[0]?.key ?? "");

  const monthStart = activeMes ? `${activeMes}-01` : "9999-01-01";
  const monthEnd = activeMes ? nextMonth(activeMes) : "9999-01-02";


  // Get all active users with their manager (include elofy_id for reliable matching)
  let usersQ = excludeAdmins(
    supabase.from("elofy_users").select("nome, elofy_id, nome_gestor, nome_time, data_admissao").eq("status", "Ativo"),
    "nome"
  );
  if (areaFilter) usersQ = usersQ.in("nome_time", areaFilter);
  if (subtreeLeaders) {
    usersQ = subtreeLeaders.length === 1
      ? usersQ.eq("nome_gestor", subtreeLeaders[0])
      : usersQ.in("nome_gestor", subtreeLeaders);
  }
  const { data: users } = await usersQ;

  // IDs de todos os usuários ativos no escopo (necessário para o RLS de elofy_feedbacks e elofy_one_one)
  const allUserIds = (users ?? []).map((u: { elofy_id: string }) => u.elofy_id).filter(Boolean);

  // Feedbacks recebidos no período
  let fbQ = supabase
    .from("elofy_feedbacks")
    .select("id_usuario_destinatario")
    .gte("data_feedback", monthStart)
    .lt("data_feedback", monthEnd);
  if (allUserIds.length > 0) fbQ = fbQ.in("id_usuario_destinatario", allUserIds);

  // 1:1s realizados no período
  let ooQ = supabase
    .from("elofy_one_one")
    .select("id_usuario_convidado")
    .eq("situacao", "Realizada")
    .gte("data", monthStart)
    .lt("data", monthEnd);
  if (allUserIds.length > 0) ooQ = ooQ.in("id_usuario_convidado", allUserIds);

  const [{ data: feedbacks }, { data: oneOnes }] = await Promise.all([fbQ, ooQ]);

  // Um colaborador é "acompanhado" se recebeu feedback OU teve 1:1 realizado
  const coveredSet = new Set([
    ...(feedbacks ?? []).map((f: { id_usuario_destinatario: string }) => f.id_usuario_destinatario),
    ...(oneOnes ?? []).map((o: { id_usuario_convidado: string }) => o.id_usuario_convidado),
  ].filter(Boolean));

  // Group by manager
  const leaderMap: Record<string, {
    area: string;
    reports: Array<{ nome: string; elofy_id: string }>;
  }> = {};

  const [mesYear, mesMonth] = activeMes ? activeMes.split("-").map(Number) : [0, 0];
  const mesStartDate = mesYear ? new Date(mesYear, mesMonth - 1, 1) : null;

  for (const u of users ?? []) {
    const mgr = u.nome_gestor ?? "";
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;

    if (mesStartDate && u.data_admissao) {
      const [d, m, y] = (u.data_admissao as string).split("/").map(Number);
      if (d && m && y && new Date(y, m - 1, d) >= mesStartDate) continue;
    }

    if (!leaderMap[mgr]) leaderMap[mgr] = { area: u.nome_time ?? "", reports: [] };
    leaderMap[mgr].reports.push({ nome: u.nome ?? "", elofy_id: u.elofy_id ?? "" });
  }

  const leaders: LeaderFeedback[] = Object.entries(leaderMap).map(([name, data]) => {
    const withFeedback = data.reports.filter(r => coveredSet.has(r.elofy_id)).map(r => r.nome);
    const withoutFeedback = data.reports.filter(r => !coveredSet.has(r.elofy_id)).map(r => r.nome);
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

      <PeriodSelect periods={periods} activeMes={activeMes} />

      {leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {leaders.map((l) => {
            const color = coverageColor(l.coverage);
            return (
              <details
                key={l.name}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  boxShadow: "var(--sh)",
                }}
              >
                {/* Summary row — always visible */}
                <summary style={{
                  listStyle: "none",
                  padding: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap" as const,
                  userSelect: "none" as const,
                }}>
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
                      <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 2 }}>Acompanhados</div>
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

                  {/* Expand chevron */}
                  <span style={{ fontSize: 12, color: "var(--text-300)", flexShrink: 0 }}>▾</span>
                </summary>

                {/* Expanded: team detail */}
                <div style={{ padding: "0 20px 20px 20px", borderTop: "1px solid var(--border)", marginTop: 0 }}>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" as const, paddingTop: 16 }}>
                    {/* Acompanhados */}
                    {l.withFeedback.length > 0 && (
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase" as const,
                          color: "var(--green)",
                          marginBottom: 8,
                        }}>
                          ✓ Acompanhados ({l.withFeedback.length})
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                          {l.withFeedback.map((name) => (
                            <span key={name} style={{
                              fontSize: 11,
                              padding: "3px 10px",
                              borderRadius: 10,
                              background: "var(--green-bg)",
                              color: "var(--green-text)",
                              border: "1px solid #bbf7d0",
                            }}>
                              {shortName(name)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Não acompanhados */}
                    {l.withoutFeedback.length > 0 && (
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase" as const,
                          color: "var(--red)",
                          marginBottom: 8,
                        }}>
                          ✗ Não acompanhados ({l.withoutFeedback.length})
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
                              {shortName(name)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
