import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const BP_AREAS: Record<string, string[]> = {
  caina: ["DIRETORIA COMERCIAL","DIRETORIA MARKETING","MARKETING -  DIGITAL","MARKETING -  EVENTOS","PRÉ-VENDAS","VENDAS INTERNAS","REGIONAL BA","REGIONAL ES","REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT","REGIONAL NE","REGIONAL PR","REGIONAL RJ","REGIONAL RS/SC","REGIONAL SP"],
  izabela: ["CS","CS - Time Aline","CS - Time Luana","CX","CX - Reversão","CX - Time Gabriel","SUPORTE","SUPORTE - Time Edmilson","SUPORTE - Time Enock","SUPORTE - Time Gabriela","SUPORTE - Time Nathalia","ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP","DIRETORIA OPERAÇÕES"],
  renata_paula: ["DEV - Time Felipe","DEV - Time Gilmar","DEV - Time Jony","DEV - Time Leandro","DIRETORIA TECNOLOGIA","TI - INFRAESTRUTURA","PESQUISA & PRODUTO","NIX","Recrutamento e Seleção","Desenvolvimento Humano Organizacional","Departamento Pessoal","DIRETORIA GENTE & CULTURA"],
};

const ISO_DIMENSIONS: Record<string, { label: string; weight: number }> = {
  pertencimento: { label: "Pertencimento", weight: 25 },
  saude_emocional: { label: "Saúde Emocional", weight: 25 },
  carga_trabalho: { label: "Carga de Trabalho", weight: 25 },
  apoio_lideranca: { label: "Apoio da Liderança", weight: 25 },
};

function scoreColor(v: number | null) {
  if (v === null) return "var(--text-300)";
  if (v >= 80) return "var(--green)";
  if (v >= 65) return "var(--brand)";
  if (v >= 50) return "var(--amber)";
  return "var(--red)";
}

function scoreLabel(v: number | null) {
  if (v === null) return "—";
  if (v >= 80) return "Excelente";
  if (v >= 65) return "Favorável";
  if (v >= 50) return "Moderado";
  return "Atenção";
}

interface ISBERow {
  gestor?: string | null;
  time?: string | null;
  id_categoria_pergunta?: string | null;
  categoria_pergunta?: string | null;
  resposta?: string | null;
}

interface LeaderISO {
  name: string;
  area: string;
  avg: number | null;
  nota: number | null;
  n: number;
  dimensions: Record<string, { avg: number | null; nota: number | null; n: number }>;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{
      height: 6,
      background: "var(--border)",
      borderRadius: 3,
      overflow: "hidden",
      flex: 1,
    }}>
      <div style={{
        height: "100%",
        width: `${Math.max(0, Math.min(100, value))}%`,
        background: color,
        borderRadius: 3,
        transition: "width .4s ease",
      }} />
    </div>
  );
}

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function initials(name: string) {
  return name.split(" ").filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export default async function ISOPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && BP_AREAS[bp]) areaFilter = BP_AREAS[bp];

  // Fetch feelings data (ISBE = feelings/sentimentos)
  let query = supabase
    .from("elofy_feelings")
    .select("gestor, id_gestor, nome_time, pergunta, resposta, categoria");
  if (areaFilter) query = query.in("nome_time", areaFilter);
  if (leader) query = query.eq("gestor", leader);
  const { data: feelingRows } = await query;

  // Also fetch survey_pulse for eNPS per leader
  let pulseQ = supabase
    .from("elofy_survey_pulse")
    .select("gestor, time, score_resposta, pergunta");
  if (areaFilter) pulseQ = pulseQ.in("time", areaFilter);
  if (leader) pulseQ = pulseQ.eq("gestor", leader);
  const { data: pulseRows } = await pulseQ;

  // Group ISBE by leader + dimension
  const leaderMap: Record<string, {
    area: string;
    scores: number[];
    byDim: Record<string, number[]>;
  }> = {};

  for (const row of feelingRows ?? []) {
    const name = row.gestor ?? "";
    if (!name) continue;
    const score = parseInt(row.resposta ?? "", 10);
    if (isNaN(score) || score < 1 || score > 4) continue;
    if (!leaderMap[name]) leaderMap[name] = { area: row.nome_time ?? "", scores: [], byDim: {} };
    leaderMap[name].scores.push(score);
    const dim = (row.categoria ?? row.pergunta ?? "").toLowerCase();
    const dimKey = dim.includes("pertenc") ? "pertencimento"
      : dim.includes("saú") || dim.includes("emoc") ? "saude_emocional"
      : dim.includes("carga") || dim.includes("trabalho") ? "carga_trabalho"
      : dim.includes("lider") || dim.includes("apoio") ? "apoio_lideranca"
      : "outros";
    if (!leaderMap[name].byDim[dimKey]) leaderMap[name].byDim[dimKey] = [];
    leaderMap[name].byDim[dimKey].push(score);
  }

  // eNPS per leader
  const lnpsMap: Record<string, number[]> = {};
  for (const row of pulseRows ?? []) {
    const name = row.gestor ?? "";
    if (!name) continue;
    const score = parseInt(row.score_resposta ?? "", 10);
    if (isNaN(score)) continue;
    if (!lnpsMap[name]) lnpsMap[name] = [];
    lnpsMap[name].push(score);
  }

  function avg(arr: number[]) {
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function isbeNota(rawAvg: number | null) {
    if (rawAvg === null) return null;
    return Math.round(rawAvg * 25);
  }
  function npsNota(scores: number[]) {
    if (!scores.length) return null;
    const prom = scores.filter(v => v >= 9).length;
    const detr = scores.filter(v => v <= 6).length;
    const nps = ((prom - detr) / scores.length) * 100;
    return Math.round((nps + 100) / 2);
  }

  const leaders: LeaderISO[] = Object.entries(leaderMap).map(([name, data]) => {
    const rawAvg = avg(data.scores);
    const nota = isbeNota(rawAvg);
    const dimResults: Record<string, { avg: number | null; nota: number | null; n: number }> = {};
    for (const [dim, scores] of Object.entries(data.byDim)) {
      const dimAvg = avg(scores);
      dimResults[dim] = { avg: dimAvg, nota: isbeNota(dimAvg), n: scores.length };
    }
    return {
      name,
      area: data.area,
      avg: rawAvg,
      nota,
      n: data.scores.length,
      dimensions: dimResults,
    };
  }).sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1));

  // Global ISBE
  const allScores = leaders.flatMap(l => Array(l.n).fill(l.avg ?? 0));
  const globalAvg = avg(allScores.map((_, i) => {
    const l = leaders[Math.floor(i / (allScores.length / leaders.length))];
    return l.avg ?? 0;
  }));
  const globalNota = leaders.length ? Math.round(leaders.reduce((s, l) => s + (l.nota ?? 0), 0) / leaders.length) : null;

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
            <span style={{ fontSize: 13, color: "var(--text-500)" }}>ISO · Saúde Organizacional</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
            ISO · Saúde Organizacional
          </h1>
          {(bp !== "geral" || leader) && (
            <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
              {leader ? `Líder: ${leader}` : `Carteira: ${bpLabels[bp] ?? bp}`}
            </p>
          )}
        </div>

        {/* Global score */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "20px 28px",
          textAlign: "center",
          boxShadow: "var(--sh)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
            ISBE Médio
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: scoreColor(globalNota), lineHeight: 1 }}>
            {globalNota ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: scoreColor(globalNota), fontWeight: 600, marginTop: 4 }}>
            {scoreLabel(globalNota)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
            {leaders.length} líderes
          </div>
        </div>
      </div>

      {/* Dimension legend */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 24,
        flexWrap: "wrap" as const,
      }}>
        {Object.entries(ISO_DIMENSIONS).map(([, { label }]) => (
          <div key={label} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 12,
            color: "var(--text-500)",
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* Leaders */}
      {leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhum dado de sentimento encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {leaders.map((l) => {
            const color = scoreColor(l.nota);
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
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
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

                  {/* Name + area */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-900)" }}>{shortName(l.name)}</div>
                    <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>{l.area}</div>
                  </div>

                  {/* ISO Score */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>
                      {l.nota ?? "—"}
                    </div>
                    <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 2 }}>{scoreLabel(l.nota)}</div>
                  </div>
                </div>

                {/* Overall progress bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <ProgressBar value={l.nota ?? 0} color={color} />
                  <span style={{ fontSize: 11, color: "var(--text-300)", flexShrink: 0 }}>
                    n={l.n}
                  </span>
                </div>

                {/* Dimensions */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}>
                  {Object.entries(ISO_DIMENSIONS).map(([key, { label }]) => {
                    const dim = l.dimensions[key];
                    const dimNota = dim?.nota ?? null;
                    const dimColor = scoreColor(dimNota);
                    return (
                      <div key={key} style={{
                        background: "var(--surface-2)",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 6 }}>
                          {label}
                        </div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: dimColor }}>
                          {dimNota !== null ? dimNota : "—"}
                        </div>
                        {dimNota !== null && (
                          <div style={{ marginTop: 6 }}>
                            <ProgressBar value={dimNota} color={dimColor} />
                          </div>
                        )}
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
