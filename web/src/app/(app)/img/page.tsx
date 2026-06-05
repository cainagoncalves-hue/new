import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { excludeAdmins } from "@/lib/adminAccounts";
import { getBPAreas, type BPKey } from "@/lib/bp";

// ── Utilitários visuais ────────────────────────────────────────────────────────

function pctColor(pct: number) {
  if (pct >= 80) return "var(--green)";
  if (pct >= 50) return "var(--amber)";
  return "var(--red)";
}

function ptsColor(pts: number | null): string {
  if (pts === null) return "var(--text-300)";
  if (pts === 12) return "var(--green-text)";
  if (pts === 10) return "var(--brand)";
  if (pts === 5) return "var(--amber-text)";
  return "var(--red-text)";
}

function ptsBg(pts: number | null): string {
  if (pts === null) return "var(--surface-2)";
  if (pts === 12) return "var(--green-bg)";
  if (pts === 10) return "var(--brand-pale)";
  if (pts === 5) return "var(--amber-bg)";
  return "var(--red-bg)";
}

// Conceito conforme IMG_Metodologia.md — régua do check-in oficial
function imgLabel(pct: number): string {
  if (pct >= 100) return "Excelência";
  if (pct >= 70) return "Intermediário";
  return "Básico";
}

function imgBadge(pct: number): { bg: string; color: string } {
  if (pct >= 100) return { bg: "var(--green-bg)", color: "var(--green-text)" };
  if (pct >= 70) return { bg: "var(--amber-bg)", color: "var(--amber-text)" };
  return { bg: "var(--red-bg)", color: "var(--red-text)" };
}

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function initials(name: string) {
  return name.split(" ").filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

// ── Réguas de pontuação (IMG_Metodologia.md – Camada 1) ───────────────────────

function scoreGeneral(pct: number): number {
  if (pct >= 100) return 12; if (pct >= 90) return 10; if (pct >= 70) return 5; return 0;
}
function scorePrazo(pct: number): number {
  if (pct >= 100) return 12; if (pct >= 95) return 10; if (pct >= 66.5) return 5; return 0;
}
function scoreISO(raw: number): number { return raw >= 75 ? 12 : 10; }
function scoreAtingimento(pct: number): number {
  if (pct > 80) return 12; if (pct === 80) return 10; if (pct >= 56) return 5; return 0;
}

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface Indicator {
  label: string;
  value: number | null;     // valor bruto (%)
  displayValue: string;     // ex: "85%" ou "72" (ISO)
  pts: number | null;       // 0/5/10/12 — null = sem dados
  source: "Elofy" | "ISO" | "Manual";
}

interface Pilar {
  key: string;
  label: string;
  peso: number;             // ex: 0.30
  score: number;            // 0–100%
  indicators: Indicator[];
}

interface LeaderIMG {
  name: string;
  area: string;
  headcount: number;
  imgScore: number;
  pilares: Pilar[];
}

// ── Utilitários de período ──────────────────────────────────────────────────────

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

// ── Página ─────────────────────────────────────────────────────────────────────

export default async function IMGPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string; mes?: string }>;
}) {
  const { bp = "geral", leader = "", mes = "" } = await searchParams;
  const supabase = await createClient();
  const bpAreas = await getBPAreas(supabase);

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && bpAreas[bp as BPKey]) areaFilter = bpAreas[bp as BPKey];

  // ── Meses disponíveis para o filtro de período ──────────────────────────────
  const { data: mesRows } = await supabase
    .from("manual_img_indicadores")
    .select("mes_referencia")
    .not("mes_referencia", "is", null)
    .order("mes_referencia", { ascending: false })
    .limit(1000);

  const mesSet = new Set<string>();
  for (const row of mesRows ?? []) {
    // mes_referencia é date → vem como "YYYY-MM-DD"; normaliza para "YYYY-MM"
    const key = (row.mes_referencia as string)?.slice(0, 7);
    if (key) mesSet.add(key);
  }
  const periods = [...mesSet]
    .sort((a, b) => b.localeCompare(a))
    .map(key => ({ key, label: formatMonthLabel(key) }));
  const activeMes = mes || (periods[0]?.key ?? "");

  const mesStart = activeMes ? `${activeMes}-01` : "9999-01-01";
  const mesEnd = activeMes ? nextMonth(activeMes) : "9999-01-02";

  function periodUrl(key: string) {
    const params = new URLSearchParams();
    if (bp !== "geral") params.set("bp", bp);
    if (leader) params.set("leader", leader);
    params.set("mes", key);
    return `/img?${params.toString()}`;
  }

  // ── Users no escopo ──────────────────────────────────────────────────────────
  let usersQ = excludeAdmins(
    supabase.from("elofy_users")
      .select("nome, nome_gestor, nome_time, elofy_id")
      .eq("status", "Ativo"),
    "nome"
  );
  if (areaFilter) usersQ = usersQ.in("nome_time", areaFilter);
  if (leader)     usersQ = usersQ.eq("nome_gestor", leader);
  const { data: users } = await usersQ;

  const allUserIds = (users as Array<{ elofy_id: string }> ?? [])
    .map(u => u.elofy_id).filter(Boolean);

  // ── Queries paralelas ────────────────────────────────────────────────────────
  let manualQ = supabase
    .from("manual_img_indicadores")
    .select("nome_gestor, indicador, valor_pct");
  // mes_referencia é date → precisa do formato YYYY-MM-DD
  if (activeMes) manualQ = manualQ.eq("mes_referencia", `${activeMes}-01`);

  let fbQ = supabase
    .from("elofy_feedbacks")
    .select("id_usuario_destinatario")
    .gte("data_feedback", mesStart)
    .lt("data_feedback", mesEnd);
  if (allUserIds.length > 0) fbQ = fbQ.in("id_usuario_destinatario", allUserIds);

  let ooQ = supabase
    .from("elofy_one_one")
    .select("id_usuario_convidado")
    .gte("data", mesStart)
    .lt("data", mesEnd);
  if (allUserIds.length > 0) ooQ = ooQ.in("id_usuario_convidado", allUserIds);

  let krQ = supabase
    .from("elofy_key_results")
    .select("id_responsavel, progresso")
    .eq("ativo", "true");
  if (allUserIds.length > 0) krQ = krQ.in("id_responsavel", allUserIds);

  const [
    { data: fbRows },
    { data: ooRows },
    { data: isoRows },
    { data: talentos },
    { data: manualIndicadores },
    { data: keyResults },
  ] = await Promise.all([
    fbQ,
    ooQ,
    supabase.rpc("get_iso_scores"),
    supabase.from("manual_talentos_chave").select("nome_gestor, status"),
    manualQ,
    krQ,
  ]);

  // ── Lookups auxiliares ───────────────────────────────────────────────────────

  // Set de elofy_ids acompanhados no mês (feedback OU 1:1)
  const accompSet = new Set([
    ...(fbRows ?? []).map(r => r.id_usuario_destinatario),
    ...(ooRows ?? []).map(r => r.id_usuario_convidado),
  ].filter(Boolean));

  // ISO por líder
  const isoByLeader: Record<string, number> = {};
  for (const r of (isoRows as Array<{ gestor_nome: string; iso_score: number | null }> ?? [])) {
    if (r.iso_score !== null) isoByLeader[r.gestor_nome] = Number(r.iso_score);
  }

  // Talentos por líder
  const talByLeader: Record<string, { total: number; comPlano: number }> = {};
  for (const t of (talentos as Array<{ nome_gestor: string; status: string }> ?? [])) {
    const mgr = t.nome_gestor ?? ""; if (!mgr) continue;
    if (!talByLeader[mgr]) talByLeader[mgr] = { total: 0, comPlano: 0 };
    talByLeader[mgr].total++;
    if (t.status !== "nao_iniciado") talByLeader[mgr].comPlano++;
  }

  // Indicadores manuais por líder
  const manualByLeader: Record<string, Record<string, number>> = {};
  for (const m of (manualIndicadores as Array<{ nome_gestor: string; indicador: string; valor_pct: number }> ?? [])) {
    const mgr = m.nome_gestor ?? ""; if (!mgr) continue;
    if (!manualByLeader[mgr]) manualByLeader[mgr] = {};
    manualByLeader[mgr][m.indicador] = Number(m.valor_pct);
  }

  // KRs por colaborador (elofy_id → progressos)
  const krByUser: Record<string, number[]> = {};
  for (const kr of (keyResults as Array<{ id_responsavel: string; progresso: string }> ?? [])) {
    const uid = kr.id_responsavel ?? ""; if (!uid) continue;
    const p = parseFloat(kr.progresso ?? "");
    if (!isNaN(p)) { (krByUser[uid] ??= []).push(p); }
  }

  // mgrMap: líder → { area, reports[] }
  type Report = { nome: string; elofy_id: string };
  const mgrMap: Record<string, { area: string; reports: Report[] }> = {};
  for (const u of (users as Array<{ nome: string; nome_gestor: string; nome_time: string; elofy_id: string }> ?? [])) {
    const mgr = u.nome_gestor ?? "";
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;
    if (!mgrMap[mgr]) mgrMap[mgr] = { area: u.nome_time ?? "", reports: [] };
    mgrMap[mgr].reports.push({ nome: u.nome ?? "", elofy_id: u.elofy_id ?? "" });
  }

  // ── Cálculo por líder (metodologia completa) ─────────────────────────────────

  const leaders: LeaderIMG[] = Object.entries(mgrMap).map(([name, data]) => {
    const reports = data.reports;
    const man = manualByLeader[name] ?? {};

    // ── Pilar Pessoas (30%) ──────────────────────────────────────────────────
    const withAccomp = reports.filter(r => accompSet.has(r.elofy_id)).length;
    const fbPct = reports.length > 0 ? Math.round((withAccomp / reports.length) * 100) : 0;
    const fbPts = scoreGeneral(fbPct);

    const isoPct = isoByLeader[name] ?? null;
    const isoPts = isoPct !== null ? scoreISO(isoPct) : null;

    const tal = talByLeader[name];
    const talPct = tal && tal.total > 0 ? Math.round((tal.comPlano / tal.total) * 100) : null;
    const talPts = talPct !== null ? scoreGeneral(talPct) : null;

    const pessoasPts = fbPts + (isoPts ?? 0) + (talPts ?? 0);
    const pessoasMax = 12 + (isoPts !== null ? 12 : 0) + (talPts !== null ? 12 : 0);
    const pessoasScore = pessoasMax > 0 ? Math.round((pessoasPts / pessoasMax) * 100) : 0;

    // ── Pilar Planejamento (20%) ─────────────────────────────────────────────
    const metasPct    = "metas_registradas" in man ? man.metas_registradas : null;
    const metasPts    = metasPct    !== null ? scoreGeneral(metasPct)    : null;
    const checkinsPct = "checkins_prazo"     in man ? man.checkins_prazo     : null;
    const checkinsPts = checkinsPct !== null ? scorePrazo(checkinsPct)   : null;
    const reuniaoPct  = "reuniao_resultado"  in man ? man.reuniao_resultado  : null;
    const reuniaoPts  = reuniaoPct  !== null ? scorePrazo(reuniaoPct)    : null;
    const rdmPct      = "rdm_prazo"          in man ? man.rdm_prazo          : null;
    const rdmPts      = rdmPct      !== null ? scorePrazo(rdmPct)        : null;

    const planPts = (metasPts ?? 0) + (checkinsPts ?? 0) + (reuniaoPts ?? 0) + (rdmPts ?? 0);
    const planMax = [metasPts, checkinsPts, reuniaoPts, rdmPts].filter(v => v !== null).length * 12;
    const planScore = planMax > 0 ? Math.round((planPts / planMax) * 100) : 0;

    // ── Pilar Financeiro (20%) ───────────────────────────────────────────────
    const hcPct    = "headcount_previsto"   in man ? man.headcount_previsto   : null;
    const hcPts    = hcPct    !== null ? scoreGeneral(hcPct)    : null;
    const custoPct = "custo_folha_previsto" in man ? man.custo_folha_previsto : null;
    const custoPts = custoPct !== null ? scoreGeneral(custoPct) : null;

    const finPts = (hcPts ?? 0) + (custoPts ?? 0);
    const finMax = [hcPts, custoPts].filter(v => v !== null).length * 12;
    const finScore = finMax > 0 ? Math.round((finPts / finMax) * 100) : 0;

    // ── Pilar Resultados (30%) ───────────────────────────────────────────────
    const reportsWithKRs = reports.filter(r => (krByUser[r.elofy_id]?.length ?? 0) > 0);
    let atingPct: number | null = null;
    let atingPts: number | null = null;
    if (reportsWithKRs.length > 0) {
      const atingiram = reportsWithKRs.filter(r => {
        const krs = krByUser[r.elofy_id] ?? [];
        return krs.reduce((a, b) => a + b, 0) / krs.length >= 100;
      }).length;
      atingPct = Math.round((atingiram / reportsWithKRs.length) * 100);
      atingPts = scoreAtingimento(atingPct);
    }
    const resScore = atingPts !== null ? Math.round((atingPts / 12) * 100) : 0;

    // ── IMG Final ────────────────────────────────────────────────────────────
    const imgScore = Math.round(
      (pessoasScore / 100 * 0.30 +
       resScore     / 100 * 0.30 +
       planScore    / 100 * 0.20 +
       finScore     / 100 * 0.20) * 100
    );

    // ── Estrutura de pilares para o render ───────────────────────────────────
    const pilares: Pilar[] = [
      {
        key: "pessoas",
        label: "Pessoas",
        peso: 0.30,
        score: pessoasScore,
        indicators: [
          {
            label: "Feedbacks / Acompanhados",
            value: fbPct,
            displayValue: `${fbPct}%`,
            pts: fbPts,
            source: "Elofy",
          },
          {
            label: "ISO SIEG",
            value: isoPct !== null ? Math.round(isoPct) : null,
            displayValue: isoPct !== null ? String(Math.round(isoPct)) : "—",
            pts: isoPts,
            source: "ISO",
          },
          {
            label: "Talentos Chave Mapeados",
            value: talPct,
            displayValue: talPct !== null ? `${talPct}%` : "—",
            pts: talPts,
            source: "Manual",
          },
        ],
      },
      {
        key: "planejamento",
        label: "Planejamento",
        peso: 0.20,
        score: planScore,
        indicators: [
          {
            label: "100% Metas Registradas",
            value: metasPct,
            displayValue: metasPct !== null ? `${metasPct}%` : "—",
            pts: metasPts,
            source: "Manual",
          },
          {
            label: "Check-ins no Prazo",
            value: checkinsPct,
            displayValue: checkinsPct !== null ? `${checkinsPct}%` : "—",
            pts: checkinsPts,
            source: "Manual",
          },
          {
            label: "Reunião de Resultado",
            value: reuniaoPct,
            displayValue: reuniaoPct !== null ? `${reuniaoPct}%` : "—",
            pts: reuniaoPts,
            source: "Manual",
          },
          {
            label: "RDMs no Prazo",
            value: rdmPct,
            displayValue: rdmPct !== null ? `${rdmPct}%` : "—",
            pts: rdmPts,
            source: "Manual",
          },
        ],
      },
      {
        key: "financeiro",
        label: "Financeiro",
        peso: 0.20,
        score: finScore,
        indicators: [
          {
            label: "Headcount Dentro do Previsto",
            value: hcPct,
            displayValue: hcPct !== null ? `${hcPct}%` : "—",
            pts: hcPts,
            source: "Manual",
          },
          {
            label: "Custo de Folha Dentro do Previsto",
            value: custoPct,
            displayValue: custoPct !== null ? `${custoPct}%` : "—",
            pts: custoPts,
            source: "Manual",
          },
        ],
      },
      {
        key: "resultados",
        label: "Resultados",
        peso: 0.30,
        score: resScore,
        indicators: [
          {
            label: "Atingimento de Metas (≥80% do time)",
            value: atingPct,
            displayValue: atingPct !== null ? `${atingPct}%` : "—",
            pts: atingPts,
            source: "Elofy",
          },
        ],
      },
    ];

    return { name, area: data.area, headcount: reports.length, imgScore, pilares };
  }).sort((a, b) => b.imgScore - a.imgScore);

  const globalIMG = leaders.length
    ? Math.round(leaders.reduce((s, l) => s + l.imgScore, 0) / leaders.length)
    : null;

  const bpLabels: Record<string, string> = {
    caina: "Cainã · Comercial & Marketing",
    izabela: "Izabela · CX/CS & Financeiro",
    renata_paula: "Renata/Paula · Tecnologia & RH",
  };

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 48px" }}>
      {/* CSS para o details/summary */}
      <style>{`
        details.img-card > summary { list-style: none; cursor: pointer; }
        details.img-card > summary::-webkit-details-marker { display: none; }
        details.img-card > summary::marker { display: none; }
        details.img-card[open] .img-chevron { transform: rotate(90deg); }
        .img-chevron { display: inline-block; transition: transform 0.15s ease; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
          <p style={{ fontSize: 12, color: "var(--text-300)", marginTop: 4 }}>
            Metodologia: Pessoas 30% · Resultados 30% · Planejamento 20% · Financeiro 20%
          </p>
          {(bp !== "geral" || leader) && (
            <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
              {leader ? `Líder: ${leader}` : `Carteira: ${bpLabels[bp] ?? bp}`}
            </p>
          )}
        </div>

        {/* IMG Médio global */}
        {globalIMG !== null && (() => {
          const badge = imgBadge(globalIMG);
          return (
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: "20px 28px",
              textAlign: "center" as const,
              boxShadow: "var(--sh)",
              minWidth: 150,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
                IMG Médio
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: pctColor(globalIMG), lineHeight: 1 }}>
                {globalIMG}%
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center",
                fontSize: 11, fontWeight: 600, padding: "2px 10px",
                borderRadius: 8, marginTop: 6,
                background: badge.bg, color: badge.color,
              }}>
                {imgLabel(globalIMG)}
              </span>
              <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 6 }}>
                {leaders.length} lídere{leaders.length !== 1 ? "s" : ""}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Filtro de período ──────────────────────────────────────────────── */}
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

      {/* ── Lista de líderes ────────────────────────────────────────────────── */}
      {leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {leaders.map((l) => {
            const badge = imgBadge(l.imgScore);
            return (
              <details
                key={l.name}
                className="img-card"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r)",
                  boxShadow: "var(--sh)",
                  overflow: "hidden",
                }}
              >
                {/* ── Header colapsado ───────────────────────────────────── */}
                <summary style={{ padding: "18px 24px", userSelect: "none" as const }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: "var(--brand-pale)", color: "var(--brand)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, fontFamily: "'Syne', sans-serif",
                    }}>
                      {initials(l.name)}
                    </div>

                    {/* Nome + área */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-900)" }}>
                        {shortName(l.name)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
                        {l.area} · {l.headcount} pessoa{l.headcount !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Mini scores dos pilares */}
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      {l.pilares.map(p => (
                        <div key={p.key} style={{ textAlign: "center" as const, minWidth: 48 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--text-300)", marginBottom: 2 }}>
                            {p.label.slice(0, 6)}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: pctColor(p.score) }}>
                            {p.score}%
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* IMG score */}
                    <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: pctColor(l.imgScore), lineHeight: 1 }}>
                        {l.imgScore}%
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center",
                        fontSize: 10, fontWeight: 600, padding: "2px 8px",
                        borderRadius: 6, marginTop: 4,
                        background: badge.bg, color: badge.color,
                      }}>
                        {imgLabel(l.imgScore)}
                      </span>
                    </div>

                    {/* Chevron */}
                    <span className="img-chevron" style={{ fontSize: 14, color: "var(--text-300)", flexShrink: 0, marginLeft: 4 }}>
                      ▸
                    </span>
                  </div>
                </summary>

                {/* ── Conteúdo expandido: 4 pilares ──────────────────────── */}
                <div style={{
                  borderTop: "1px solid var(--border)",
                  padding: "20px 24px",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}>
                  {l.pilares.map(p => (
                    <div key={p.key} style={{
                      background: "var(--surface-2)",
                      borderRadius: 10,
                      padding: "16px",
                    }}>
                      {/* Cabeçalho do pilar */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "var(--text-500)" }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 1 }}>
                            Peso {Math.round(p.peso * 100)}%
                          </div>
                        </div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: pctColor(p.score), lineHeight: 1 }}>
                          {p.score}%
                        </div>
                      </div>

                      {/* Barra do pilar */}
                      <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${Math.min(100, p.score)}%`,
                          background: pctColor(p.score),
                          borderRadius: 2,
                        }} />
                      </div>

                      {/* Indicadores */}
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                        {p.indicators.map(ind => (
                          <div key={ind.label} style={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "8px 10px",
                          }}>
                            {/* Nome + fonte + pontos */}
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 6 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 10, color: "var(--text-700)", lineHeight: 1.35 }}>
                                  {ind.label}
                                </div>
                                <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 2 }}>
                                  {ind.source}
                                </div>
                              </div>
                              <span style={{
                                flexShrink: 0,
                                fontSize: 10, fontWeight: 700,
                                padding: "2px 7px", borderRadius: 6,
                                background: ptsBg(ind.pts),
                                color: ptsColor(ind.pts),
                              }}>
                                {ind.pts !== null ? `${ind.pts}/12` : "—"}
                              </span>
                            </div>

                            {/* Barra + valor */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                                {ind.value !== null && (
                                  <div style={{
                                    height: "100%",
                                    width: `${Math.min(100, Math.max(0, ind.value))}%`,
                                    background: ind.pts !== null ? pctColor(ind.value) : "var(--text-300)",
                                    borderRadius: 2,
                                  }} />
                                )}
                              </div>
                              <span style={{
                                fontSize: 11, fontWeight: 700, minWidth: 34, textAlign: "right" as const,
                                color: ind.pts !== null ? pctColor(ind.value ?? 0) : "var(--text-300)",
                              }}>
                                {ind.displayValue}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </main>
  );
}
