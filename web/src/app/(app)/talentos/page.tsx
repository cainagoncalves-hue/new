import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { excludeAdmins } from "@/lib/adminAccounts";
import { getBPAreas, type BPKey } from "@/lib/bp";

// 9-box quadrant labels
const NINEBOX_LABELS: Record<string, string> = {
  "1_1": "Em Observação", "2_1": "Bem Localizado", "3_1": "Boa Estrela",
  "1_2": "Dilema", "2_2": "Chave", "3_2": "Estrela em Ascensão",
  "1_3": "Profissional Técnico", "2_3": "Alta Performance", "3_3": "Top Talento",
};

function nineboxColor(perf: number, pot: number) {
  if (perf === 3 && pot === 3) return { bg: "#059669", text: "#fff" };      // Top Talento
  if (perf === 3 || pot === 3) return { bg: "#7C3AED", text: "#fff" };       // Alta performance / potencial
  if (perf === 2 && pot === 2) return { bg: "#6D28D9", text: "#fff" };       // Chave
  if (perf === 1 && pot === 1) return { bg: "#DC2626", text: "#fff" };       // Em observação
  return { bg: "var(--brand-pale)", text: "var(--brand)" };
}

function pdiColor(pct: number) {
  if (pct >= 75) return "var(--green)";
  if (pct >= 40) return "var(--amber)";
  return "var(--red)";
}

interface TalentRow {
  name: string;
  area: string;
  role: string;
  perf: number;
  pot: number;
  quadrant: string;
  quadrantLabel: string;
  pdiProgress: number | null;
  hasPDI: boolean;
}

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function initials(name: string) {
  return name.split(" ").filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

export default async function TalentosPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();
  const bpAreas = await getBPAreas(supabase);

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && bpAreas[bp as BPKey]) areaFilter = bpAreas[bp as BPKey];

  // Fetch 9-box data from succession planning (elofy_sucessao)
  let nineQ = excludeAdmins(
    supabase.from("elofy_sucessao").select("nome_colaborador, nome_time, nome_cargo, resultado_desempenho, resultado_potencial, tipo_mapeamento"),
    "nome_colaborador"
  );
  if (areaFilter) nineQ = nineQ.in("nome_time", areaFilter);
  if (leader) nineQ = nineQ.eq("nome_gestor", leader);
  const { data: nineRows } = await nineQ;

  // PDI per person
  let pdiQ = supabase
    .from("elofy_iniciativas_pdi")
    .select("nome_responsavel, progresso_iniciativa");
  const { data: pdiRows } = await pdiQ;
  const pdiByPerson: Record<string, number[]> = {};
  for (const pdi of pdiRows ?? []) {
    const name = pdi.nome_responsavel ?? "";
    if (!name) continue;
    const progress = typeof pdi.progresso_iniciativa === "number"
      ? pdi.progresso_iniciativa
      : parseInt(pdi.progresso_iniciativa ?? "0", 10);
    if (!pdiByPerson[name]) pdiByPerson[name] = [];
    pdiByPerson[name].push(progress);
  }

  function avg(arr: number[]) {
    if (!arr.length) return null;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  // Parse 9-box scores
  function parseScore(v: string | number | null): number {
    if (v === null || v === undefined) return 2;
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    if (isNaN(n)) {
      const s = String(v).toLowerCase();
      if (s.includes("alto") || s.includes("alta") || s.includes("3")) return 3;
      if (s.includes("médio") || s.includes("media") || s.includes("2")) return 2;
      return 1;
    }
    return Math.max(1, Math.min(3, n));
  }

  const talents: TalentRow[] = (nineRows ?? []).map(row => {
    const perf = parseScore(row.resultado_desempenho);
    const pot = parseScore(row.resultado_potencial);
    const quadrant = `${perf}_${pot}`;
    const pdiList = pdiByPerson[row.nome_colaborador ?? ""];
    return {
      name: row.nome_colaborador ?? "",
      area: row.nome_time ?? "",
      role: row.nome_cargo ?? "",
      perf,
      pot,
      quadrant,
      quadrantLabel: NINEBOX_LABELS[quadrant] ?? "Chave",
      pdiProgress: avg(pdiList ?? []),
      hasPDI: (pdiList?.length ?? 0) > 0,
    };
  }).filter(t => t.name).sort((a, b) => (b.perf + b.pot) - (a.perf + a.pot));

  // 9-box grid distribution
  const distribution: Record<string, number> = {};
  for (const t of talents) {
    distribution[t.quadrant] = (distribution[t.quadrant] ?? 0) + 1;
  }

  const topTalents = talents.filter(t => t.perf >= 3 || t.pot >= 3);
  const noPDI = talents.filter(t => !t.hasPDI && (t.perf >= 2 || t.pot >= 2));

  const bpLabels: Record<string, string> = {
    caina: "Cainã · Comercial & Marketing",
    izabela: "Izabela · CX/CS & Financeiro",
    renata_paula: "Renata/Paula · Tecnologia & RH",
  };

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>← Hub</Link>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <span style={{ fontSize: 13, color: "var(--text-500)" }}>Mapeamento de Talentos</span>
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
          Mapeamento de Talentos
        </h1>
        {(bp !== "geral" || leader) && (
          <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
            {leader ? `Líder: ${leader}` : `Carteira: ${bpLabels[bp] ?? bp}`}
          </p>
        )}
      </div>

      {talents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhum dado de mapeamento encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
          {/* 9-Box grid */}
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-900)", marginBottom: 16 }}>
              Matriz 9-Box · {talents.length} colaboradores
            </h2>
            <div style={{ position: "relative" }}>
              {/* Y axis label */}
              <div style={{
                position: "absolute",
                left: -28,
                top: "50%",
                transform: "translateY(-50%) rotate(-90deg)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: "var(--text-300)",
                whiteSpace: "nowrap",
              }}>
                Potencial →
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[3, 2, 1].flatMap(pot =>
                  [1, 2, 3].map(perf => {
                    const key = `${perf}_${pot}`;
                    const count = distribution[key] ?? 0;
                    const isHighlight = perf === 3 && pot === 3;
                    const colors = nineboxColor(perf, pot);
                    return (
                      <div
                        key={key}
                        style={{
                          background: isHighlight ? colors.bg : count > 0 ? "var(--brand-pale)" : "var(--surface-2)",
                          border: isHighlight ? `2px solid ${colors.bg}` : "1px solid var(--border)",
                          borderRadius: 10,
                          padding: "14px 12px",
                          textAlign: "center",
                          minHeight: 80,
                          display: "flex",
                          flexDirection: "column" as const,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <div style={{
                          fontFamily: "'Syne', sans-serif",
                          fontSize: 24,
                          fontWeight: 800,
                          color: isHighlight ? colors.text : count > 0 ? "var(--brand)" : "var(--text-300)",
                        }}>
                          {count}
                        </div>
                        <div style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: isHighlight ? "rgba(255,255,255,.8)" : "var(--text-300)",
                          letterSpacing: "0.04em",
                          textAlign: "center",
                          lineHeight: 1.3,
                        }}>
                          {NINEBOX_LABELS[key]}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {/* X axis label */}
              <div style={{
                textAlign: "center",
                marginTop: 8,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                color: "var(--text-300)",
              }}>
                Desempenho →
              </div>
            </div>

            {/* Alert: high talent without PDI */}
            {noPDI.length > 0 && (
              <div style={{
                marginTop: 20,
                background: "var(--amber-bg)",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "14px 16px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amber-text)", marginBottom: 8 }}>
                  ⚠ {noPDI.length} talento{noPDI.length > 1 ? "s" : ""} sem PDI registrado
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {noPDI.slice(0, 8).map(t => (
                    <span key={t.name} style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      background: "#fff",
                      border: "1px solid #fde68a",
                      borderRadius: 8,
                      color: "var(--amber-text)",
                    }}>
                      {shortName(t.name)}
                    </span>
                  ))}
                  {noPDI.length > 8 && (
                    <span style={{ fontSize: 11, color: "var(--amber)", alignSelf: "center" }}>+{noPDI.length - 8}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Talent list */}
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-900)", marginBottom: 16 }}>
              Talentos de Alta Performance / Potencial
            </h2>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {(topTalents.length > 0 ? topTalents : talents).slice(0, 15).map(t => {
                const { bg: qBg, text: qText } = nineboxColor(t.perf, t.pot);
                return (
                  <div
                    key={t.name}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      boxShadow: "var(--sh)",
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "var(--brand-pale)",
                      color: "var(--brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      flexShrink: 0,
                      fontFamily: "'Syne', sans-serif",
                    }}>
                      {initials(t.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>{t.area}</div>
                    </div>

                    {/* Quadrant badge */}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: qBg,
                      color: qText,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}>
                      {t.quadrantLabel}
                    </span>

                    {/* PDI progress */}
                    {t.hasPDI ? (
                      <div style={{ flexShrink: 0, textAlign: "right", minWidth: 52 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: pdiColor(t.pdiProgress ?? 0) }}>
                          {t.pdiProgress}%
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 1 }}>PDI</div>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "var(--amber-bg)",
                        color: "var(--amber-text)",
                        flexShrink: 0,
                      }}>
                        Sem PDI
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
