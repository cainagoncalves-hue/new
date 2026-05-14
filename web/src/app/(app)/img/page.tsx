import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const BP_AREAS: Record<string, string[]> = {
  caina: ["DIRETORIA COMERCIAL","DIRETORIA MARKETING","MARKETING -  DIGITAL","MARKETING -  EVENTOS","PRÉ-VENDAS","VENDAS INTERNAS","REGIONAL BA","REGIONAL ES","REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT","REGIONAL NE","REGIONAL PR","REGIONAL RJ","REGIONAL RS/SC","REGIONAL SP"],
  izabela: ["CS","CS - Time Aline","CS - Time Luana","CX","CX - Reversão","CX - Time Gabriel","SUPORTE","SUPORTE - Time Edmilson","SUPORTE - Time Enock","SUPORTE - Time Gabriela","SUPORTE - Time Nathalia","ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP","DIRETORIA OPERAÇÕES"],
  renata_paula: ["DEV - Time Felipe","DEV - Time Gilmar","DEV - Time Jony","DEV - Time Leandro","DIRETORIA TECNOLOGIA","TI - INFRAESTRUTURA","PESQUISA & PRODUTO","NIX","Recrutamento e Seleção","Desenvolvimento Humano Organizacional","Departamento Pessoal","DIRETORIA GENTE & CULTURA"],
};

function pctColor(pct: number) {
  if (pct >= 80) return "var(--green)";
  if (pct >= 50) return "var(--amber)";
  return "var(--red)";
}

function imgLabel(pct: number) {
  if (pct >= 95) return "Avançado";
  if (pct >= 80) return "Intermediário";
  if (pct >= 60) return "Básico";
  return "Inicial";
}

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function initials(name: string) {
  return name.split(" ").filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

interface LeaderIMG {
  name: string;
  area: string;
  headcount: number;
  fbCoverage: number;      // % with feedback
  okrProgress: number;     // avg OKR progress
  pdiProgress: number;     // avg PDI progress
  oneOneCount: number;     // 1:1s done
  imgScore: number;        // composite 0-100
}

export default async function IMGPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && BP_AREAS[bp]) areaFilter = BP_AREAS[bp];

  // Headcount by manager
  let usersQ = supabase
    .from("elofy_users")
    .select("nome_colaborador, nome_gestor, nome_time, elofy_id")
    .eq("status", "Ativo");
  if (areaFilter) usersQ = usersQ.in("nome_time", areaFilter);
  if (leader) usersQ = usersQ.eq("nome_gestor", leader);
  const { data: users } = await usersQ;

  // Feedbacks in last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  let fbQ = supabase
    .from("elofy_feedbacks")
    .select("usuario_destinatario, time_usuario_destinatario")
    .gte("data_feedback", cutoffStr);
  if (areaFilter) fbQ = fbQ.in("time_usuario_destinatario", areaFilter);
  const { data: feedbacks } = await fbQ;
  const feedbackSet = new Set((feedbacks ?? []).map(f => f.usuario_destinatario?.toLowerCase().trim()));

  // OKR progress per user
  let okrQ = supabase
    .from("elofy_okrs_v2")
    .select("nome_responsavel, progresso_kr, nome_time")
    .not("progresso_kr", "is", null);
  if (areaFilter) okrQ = okrQ.in("nome_time", areaFilter);
  if (leader) okrQ = okrQ.eq("nome_responsavel", leader);
  const { data: okrs } = await okrQ;

  // PDI progress per user
  let pdiQ = supabase
    .from("elofy_iniciativas_pdi")
    .select("nome_responsavel, progresso_iniciativa");
  if (leader) pdiQ = pdiQ.eq("nome_responsavel", leader);
  const { data: pdis } = await pdiQ;

  // 1:1s this quarter
  const quarterStart = "2026-01-01";
  let ooQ = supabase
    .from("elofy_one_one")
    .select("nome_usuario_convidado, nome_usuario_remetente, time_usuario_convidado, status_reuniao")
    .gte("data_reuniao", quarterStart)
    .eq("status_reuniao", "Realizada");
  if (areaFilter) ooQ = ooQ.in("time_usuario_convidado", areaFilter);
  const { data: oneOnes } = await ooQ;

  // Build per-manager lookup
  type MgrData = {
    area: string;
    reports: string[];
  };
  const mgrMap: Record<string, MgrData> = {};
  for (const u of users ?? []) {
    const mgr = u.nome_gestor ?? "";
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;
    if (!mgrMap[mgr]) mgrMap[mgr] = { area: u.nome_time ?? "", reports: [] };
    mgrMap[mgr].reports.push(u.nome_colaborador ?? "");
  }

  // OKR progress by leader (avg)
  const okrByLeader: Record<string, number[]> = {};
  for (const okr of okrs ?? []) {
    const name = okr.nome_responsavel ?? "";
    if (!name) continue;
    const progress = typeof okr.progresso_kr === "number" ? okr.progresso_kr : parseInt(okr.progresso_kr ?? "0", 10);
    if (!okrByLeader[name]) okrByLeader[name] = [];
    okrByLeader[name].push(progress);
  }

  // PDI by leader
  const pdiByLeader: Record<string, number[]> = {};
  for (const pdi of pdis ?? []) {
    const name = pdi.nome_responsavel ?? "";
    if (!name) continue;
    const progress = typeof pdi.progresso_iniciativa === "number" ? pdi.progresso_iniciativa : parseInt(pdi.progresso_iniciativa ?? "0", 10);
    if (!pdiByLeader[name]) pdiByLeader[name] = [];
    pdiByLeader[name].push(progress);
  }

  // 1:1 by leader (who made the meeting)
  const ooByLeader: Record<string, number> = {};
  for (const oo of oneOnes ?? []) {
    const name = oo.nome_usuario_remetente ?? "";
    if (!name) continue;
    ooByLeader[name] = (ooByLeader[name] ?? 0) + 1;
  }

  function avg(arr: number[]) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  const leaders: LeaderIMG[] = Object.entries(mgrMap).map(([name, data]) => {
    const withFb = data.reports.filter(r => feedbackSet.has(r.toLowerCase().trim())).length;
    const fbCoverage = data.reports.length > 0 ? Math.round((withFb / data.reports.length) * 100) : 0;
    const okrProgress = Math.min(100, Math.round(avg(okrByLeader[name] ?? [])));
    const pdiProgress = Math.min(100, Math.round(avg(pdiByLeader[name] ?? [])));
    const oneOneCount = ooByLeader[name] ?? 0;
    // Composite IMG: feedback 35%, OKR 35%, PDI 20%, 1:1 10%
    const ooScore = Math.min(100, oneOneCount * 10); // 10 meetings = 100
    const imgScore = Math.round(fbCoverage * 0.35 + okrProgress * 0.35 + pdiProgress * 0.20 + ooScore * 0.10);
    return {
      name,
      area: data.area,
      headcount: data.reports.length,
      fbCoverage,
      okrProgress,
      pdiProgress,
      oneOneCount,
      imgScore,
    };
  }).sort((a, b) => b.imgScore - a.imgScore);

  const globalIMG = leaders.length ? Math.round(leaders.reduce((s, l) => s + l.imgScore, 0) / leaders.length) : null;

  const bpLabels: Record<string, string> = {
    caina: "Cainã · Comercial & Marketing",
    izabela: "Izabela · CX/CS & Financeiro",
    renata_paula: "Renata/Paula · Tecnologia & RH",
  };

  const PILLARS = [
    { key: "feedback", label: "Pessoas", desc: "Cobertura de Feedback", getValue: (l: LeaderIMG) => l.fbCoverage },
    { key: "okr", label: "Resultados", desc: "Progresso de OKRs", getValue: (l: LeaderIMG) => l.okrProgress },
    { key: "pdi", label: "Planejamento", desc: "Progresso de PDI", getValue: (l: LeaderIMG) => l.pdiProgress },
    { key: "oo", label: "Financeiro", desc: "1:1s Realizados (×10)", getValue: (l: LeaderIMG) => Math.min(100, l.oneOneCount * 10) },
  ];

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>← Hub</Link>
            <span style={{ color: "var(--border-2)" }}>·</span>
            <span style={{ fontSize: 13, color: "var(--text-500)" }}>IMG · Verificação de Indicadores</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
            IMG · Verificação de Indicadores
          </h1>
          {(bp !== "geral" || leader) && (
            <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
              {leader ? `Líder: ${leader}` : `Carteira: ${bpLabels[bp] ?? bp}`}
            </p>
          )}
        </div>

        {/* Global IMG */}
        {globalIMG !== null && (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: "20px 28px",
            textAlign: "center",
            boxShadow: "var(--sh)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
              IMG Médio
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: pctColor(globalIMG), lineHeight: 1 }}>
              {globalIMG}%
            </div>
            <div style={{ fontSize: 11, color: pctColor(globalIMG), fontWeight: 600, marginTop: 4 }}>
              {imgLabel(globalIMG)}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
              {leaders.length} líderes
            </div>
          </div>
        )}
      </div>

      {leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          {leaders.map((l) => {
            const imgColor = pctColor(l.imgScore);
            return (
              <div
                key={l.name}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  padding: 24,
                  boxShadow: "var(--sh)",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 11,
                    background: "var(--brand-pale)",
                    color: "var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    flexShrink: 0,
                    fontFamily: "'Syne', sans-serif",
                  }}>
                    {initials(l.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-900)" }}>{l.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>{l.area} · {l.headcount} pessoas</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: imgColor, lineHeight: 1 }}>
                      {l.imgScore}%
                    </div>
                    <div style={{ fontSize: 11, color: imgColor, fontWeight: 600, marginTop: 2 }}>
                      {imgLabel(l.imgScore)}
                    </div>
                  </div>
                </div>

                {/* Pillars */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {PILLARS.map(({ key, label, desc, getValue }) => {
                    const val = getValue(l);
                    const color = pctColor(val);
                    return (
                      <div key={key} style={{
                        background: "var(--surface-2)",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-500)", marginBottom: 8 }}>{desc}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            flex: 1,
                            height: 6,
                            background: "var(--border)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}>
                            <div style={{
                              height: "100%",
                              width: `${val}%`,
                              background: color,
                              borderRadius: 3,
                            }} />
                          </div>
                          <span style={{
                            fontFamily: "'Syne', sans-serif",
                            fontSize: 14,
                            fontWeight: 700,
                            color,
                            minWidth: 36,
                            textAlign: "right",
                          }}>
                            {key === "oo" ? l.oneOneCount : `${val}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
