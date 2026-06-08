import { createClient } from "@/lib/supabase/server";
import { excludeAdmins } from "@/lib/adminAccounts";
import { getCachedBPAreas, type BPKey } from "@/lib/bp";


function calcNPS(scores: number[]): number | null {
  if (!scores.length) return null;
  const promoters = scores.filter((v) => v >= 9).length;
  const detractors = scores.filter((v) => v <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function npsClass(v: number | null) {
  if (v === null) return "";
  if (v >= 75) return "green";
  if (v >= 50) return "brand";
  if (v >= 25) return "amber";
  return "red";
}
function npsLabel(v: number | null) {
  if (v === null) return null;
  if (v >= 75) return "Excelência";
  if (v >= 50) return "Qualidade";
  if (v >= 25) return "Atenção";
  return "Crítico";
}

// IMG helpers — metodologia oficial (IMG_Metodologia.md)
function imgLabel(v: number | null) {
  if (v === null) return null;
  if (v >= 100) return "Excelência";
  if (v >= 70) return "Intermediário";
  return "Básico";
}
function imgClass(v: number | null) {
  if (v === null) return "";
  if (v >= 100) return "green";
  if (v >= 70) return "amber";
  return "red";
}
// Régua geral (feedbacks, talentos, headcount, custo folha, metas registradas)
function scoreGeneral(pct: number): number {
  if (pct >= 100) return 12;
  if (pct >= 90) return 10;
  if (pct >= 70) return 5;
  return 0;
}
// Régua disciplina de processo (check-ins, reunião resultado, RDM)
function scorePrazo(pct: number): number {
  if (pct >= 100) return 12;
  if (pct >= 95) return 10;
  if (pct >= 66.5) return 5;
  return 0;
}
// ISO SIEG: threshold 75
function scoreISO(raw: number): number { return raw >= 75 ? 12 : 10; }
// Atingimento de metas: % do time que atingiu
function scoreAtingimento(pct: number): number {
  if (pct > 80) return 12;
  if (pct === 80) return 10;
  if (pct >= 56) return 5;
  return 0;
}

interface KPICardProps {
  icon: string;
  bg: string;
  label: string;
  value: number | null;
  suffix?: string;
  badge?: string | null;
  badgeClass?: string;
  delay?: number;
}

function KPICard({ icon, bg, label, value, suffix, badge, badgeClass, delay = 0 }: KPICardProps) {
  const badgeColors: Record<string, { background: string; color: string }> = {
    green: { background: "var(--green-bg)", color: "var(--green-text)" },
    amber: { background: "var(--amber-bg)", color: "var(--amber-text)" },
    red: { background: "var(--red-bg)", color: "var(--red-text)" },
    brand: { background: "var(--brand-pale)", color: "var(--brand)" },
  };
  const bc = badgeClass ? badgeColors[badgeClass] : null;

  return (
    <div
      className="animate-fade-up"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: 20,
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--sh)",
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{
        width: 38,
        height: 38,
        borderRadius: 9,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
        fontSize: 18,
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: "var(--text-300)",
        marginBottom: 7,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 34,
        fontWeight: 800,
        color: "var(--text-900)",
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value !== null ? value : "—"}
        {suffix && value !== null && (
          <span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-300)" }}>{suffix}</span>
        )}
      </div>
      {badge && bc && (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 9px",
          borderRadius: 10,
          background: bc.background,
          color: bc.color,
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

interface ModuleCardProps {
  href: string;
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
  period: string;
  delay?: number;
}

function ModuleCard({ href, icon, iconBg, title, desc, period, delay = 0 }: ModuleCardProps) {
  return (
    <a
      href={href}
      className="animate-fade-up"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r)",
        padding: 28,
        display: "flex",
        gap: 20,
        alignItems: "flex-start",
        boxShadow: "var(--sh)",
        textDecoration: "none",
        animationDelay: `${delay}s`,
      }}
    >
      <div style={{
        width: 54,
        height: 54,
        borderRadius: 13,
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-900)",
          marginBottom: 5,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 13,
          color: "var(--text-500)",
          lineHeight: 1.55,
          marginBottom: 16,
        }}>
          {desc}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-300)",
          }}>
            {period}
          </span>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--brand)",
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--brand-pale)",
            background: "var(--brand-pale)",
          }}>
            Ver módulo →
          </span>
        </div>
      </div>
    </a>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();
  const bpAreas = await getCachedBPAreas();

  // areaFilter: scope de times do BP selecionado (sem usar mapeamento hardcoded por líder)
  let areaFilter: string[] | null = null;
  if (bp !== "geral" && bpAreas[bp as BPKey]) areaFilter = bpAreas[bp as BPKey];

  // Headcount — filtra por times do BP ou por liderados diretos do gestor
  let hcQuery = excludeAdmins(
    supabase.from("elofy_users").select("elofy_id", { count: "exact", head: true }).eq("status", "Ativo"),
    "nome"
  );
  if (areaFilter) hcQuery = hcQuery.in("nome_time", areaFilter);
  if (leader)     hcQuery = hcQuery.eq("nome_gestor", leader);

  // ── Round 1: queries independentes — disparam em paralelo ──────────────────
  // Queries condicionais para teams (scope eNPS/LNPS) e para o KPI Acompanhados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scopedTeamsQ: any = areaFilter
    ? supabase.from("elofy_teams").select("elofy_id").in("nome", areaFilter)
    : Promise.resolve({ data: null });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acompanhadosQ: any = leader
    ? excludeAdmins(
        supabase.from("elofy_users").select("elofy_id").eq("nome_gestor", leader).eq("status", "Ativo"),
        "nome"
      )
    : bp !== "geral" && bpAreas[bp as BPKey]
      ? excludeAdmins(
          supabase.from("elofy_users").select("elofy_id").in("nome_time", bpAreas[bp as BPKey]!).eq("status", "Ativo"),
          "nome"
        )
      : Promise.resolve({ data: null });

  const [
    { count: hc },
    { data: latestEnpsMeta },
    { data: latestLnpsMeta },
    { data: scopedTeamsList },
    { data: acompanhadosData },
    { data: latestMesRow },
  ] = await Promise.all([
    hcQuery,
    supabase
      .from("elofy_survey_standard")
      .select("id_pesquisa, data_envio_pesquisa")
      .ilike("nome_pesquisa", "%enps%")
      .order("data_envio_pesquisa", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("elofy_survey_standard")
      .select("id_pesquisa")
      .ilike("nome_pesquisa", "%lnps%")
      .order("data_envio_pesquisa", { ascending: false })
      .limit(1)
      .maybeSingle(),
    scopedTeamsQ,
    acompanhadosQ,
    supabase
      .from("manual_img_indicadores")
      .select("mes_referencia")
      .order("mes_referencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Deriva valores intermediários do Round 1
  const scopedTeamIds: string[] | null = areaFilter
    ? (scopedTeamsList ?? []).map((t: { elofy_id: string }) => t.elofy_id).filter(Boolean)
    : null;
  const acompanhadosUserIds: string[] | null = (leader || (bp !== "geral" && bpAreas[bp as BPKey]))
    ? (acompanhadosData ?? []).map((u: { elofy_id: string }) => u.elofy_id).filter(Boolean)
    : null;
  const latestMes = latestMesRow?.mes_referencia ?? null;

  // ── Round 2: queries que dependem dos resultados do Round 1 ────────────────
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Helper: aplica scope de líder ou BP nas respostas de survey (eNPS / LNPS)
  // • Líder → filtra por nome_gestor; • BP → filtra por id_time; • Geral → sem filtro
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applySurveyScope(q: any): any {
    if (leader) return q.eq("nome_gestor", leader);
    if (scopedTeamIds && scopedTeamIds.length > 0) return q.in("id_time", scopedTeamIds);
    return q;
  }

  let fbQuery = supabase
    .from("elofy_feedbacks")
    .select("id_usuario_destinatario")
    .gte("data_feedback", `${monthStr}-01`);
  if (acompanhadosUserIds) fbQuery = fbQuery.in("id_usuario_destinatario", acompanhadosUserIds);

  let ooQuery = supabase
    .from("elofy_one_one")
    .select("id_usuario_convidado")
    .gte("data", `${monthStr}-01`)
    .eq("situacao", "Realizada");   // só 1:1s efetivamente realizadas (alinha com módulo feedback)
  if (acompanhadosUserIds) ooQuery = ooQuery.in("id_usuario_convidado", acompanhadosUserIds);

  const [
    { data: enpsRespostas },
    { data: lnpsRespostas },
    { data: fbRows },
    { data: ooRows },
  ] = await Promise.all([
    latestEnpsMeta?.id_pesquisa
      ? applySurveyScope(
          supabase.from("elofy_survey_standard").select("resposta").eq("id_pesquisa", latestEnpsMeta.id_pesquisa)
        )
      : Promise.resolve({ data: [] as { resposta: string }[] }),
    latestLnpsMeta?.id_pesquisa
      ? applySurveyScope(
          supabase.from("elofy_survey_standard").select("resposta").eq("id_pesquisa", latestLnpsMeta.id_pesquisa)
        )
      : Promise.resolve({ data: [] as { resposta: string }[] }),
    fbQuery,
    ooQuery,
  ]);

  // Calcula eNPS, LNPS e acompanhados a partir dos resultados
  let enps: number | null = null;
  let enpsRespondentes = 0;
  if (enpsRespostas && enpsRespostas.length > 0) {
    const scores = (enpsRespostas as { resposta: string }[])
      .map((r) => parseFloat(r.resposta ?? ""))
      .filter((n) => !isNaN(n));
    if (scores.length > 0) {
      enps = calcNPS(scores);
      enpsRespondentes = scores.length;
    }
  }

  let lnps: number | null = null;
  if (lnpsRespostas && lnpsRespostas.length > 0) {
    const scores = (lnpsRespostas as { resposta: string }[])
      .map((r) => parseFloat(r.resposta ?? ""))
      .filter((n) => !isNaN(n));
    if (scores.length > 0) lnps = calcNPS(scores);
  }

  const acompanhados = new Set([
    ...(fbRows ?? []).map((r) => r.id_usuario_destinatario),
    ...(ooRows ?? []).map((r) => r.id_usuario_convidado),
  ].filter(Boolean)).size;

  // ── IMG — Índice de Maturidade de Gestão ─────────────────────────────────
  // latestMes já disponível do Round 1 (latestMesRow acima)

  // Users no escopo — necessário para montar o mgrMap por liderados
  let imgUsersQ = excludeAdmins(
    supabase.from("elofy_users")
      .select("nome, nome_gestor, elofy_id")
      .eq("status", "Ativo"),
    "nome"
  );
  if (areaFilter) imgUsersQ = imgUsersQ.in("nome_time", areaFilter);
  if (leader)     imgUsersQ = imgUsersQ.eq("nome_gestor", leader);

  // Indicadores manuais do mês mais recente
  let manualQ = supabase
    .from("manual_img_indicadores")
    .select("nome_gestor, indicador, valor_pct");
  if (latestMes) manualQ = manualQ.eq("mes_referencia", latestMes);

  // Executa as 4 queries em paralelo
  const [
    { data: imgUsers },
    { data: isoRows },
    { data: talentos },
    { data: manualIndicadores },
  ] = await Promise.all([
    imgUsersQ,
    supabase.rpc("get_iso_scores", { p_mes: latestMes?.slice(0, 7) ?? null }),
    supabase.from("manual_talentos_chave").select("nome_gestor, status"),
    manualQ,
  ]);

  // Key results dos liderados (atingimento de metas)
  const allSubordinateIds = (imgUsers as Array<{ elofy_id: string }> ?? [])
    .map(u => u.elofy_id).filter(Boolean);
  let krQ = supabase
    .from("elofy_key_results")
    .select("id_responsavel, progresso")
    .eq("ativo", "true");
  if (allSubordinateIds.length > 0) krQ = krQ.in("id_responsavel", allSubordinateIds);

  // Feedbacks e 1:1s do mês de referência do IMG (latestMes), não do mês corrente
  const imgMesKey = latestMes?.slice(0, 7) ?? "";
  const imgMesStart = imgMesKey ? `${imgMesKey}-01` : "9999-01-01";
  const imgMesEndDate = imgMesKey ? (() => {
    const [y, m] = imgMesKey.split("-").map(Number);
    return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  })() : "9999-01-02";
  let imgFbQ = supabase
    .from("elofy_feedbacks")
    .select("id_usuario_destinatario")
    .gte("data_feedback", imgMesStart)
    .lt("data_feedback", imgMesEndDate);
  if (allSubordinateIds.length > 0) imgFbQ = imgFbQ.in("id_usuario_destinatario", allSubordinateIds);
  let imgOoQ = supabase
    .from("elofy_one_one")
    .select("id_usuario_convidado")
    .gte("data", imgMesStart)
    .lt("data", imgMesEndDate)
    .eq("situacao", "Realizada");
  if (allSubordinateIds.length > 0) imgOoQ = imgOoQ.in("id_usuario_convidado", allSubordinateIds);

  const [{ data: keyResults }, { data: imgFbRows }, { data: imgOoRows }] = await Promise.all([
    krQ, imgFbQ, imgOoQ,
  ]);

  // Lookups por líder — .trim() em todas as chaves para evitar mismatch
  // por espaços vindos da API Elofy vs dados inseridos/normalizados pelo sistema
  const isoByLeader: Record<string, number> = {};
  for (const r of (isoRows as Array<{ gestor_nome: string; iso_score: number | null }> ?? [])) {
    if (r.iso_score !== null) isoByLeader[r.gestor_nome.trim()] = Number(r.iso_score);
  }

  const talByLeader: Record<string, { total: number; comPlano: number }> = {};
  for (const t of (talentos as Array<{ nome_gestor: string; status: string }> ?? [])) {
    const mgr = (t.nome_gestor ?? "").trim(); if (!mgr) continue;
    if (!talByLeader[mgr]) talByLeader[mgr] = { total: 0, comPlano: 0 };
    talByLeader[mgr].total++;
    if (t.status !== "nao_iniciado") talByLeader[mgr].comPlano++;
  }

  const manualByLeader: Record<string, Record<string, number>> = {};
  for (const m of (manualIndicadores as Array<{ nome_gestor: string; indicador: string; valor_pct: number }> ?? [])) {
    const mgr = (m.nome_gestor ?? "").trim(); if (!mgr) continue;
    if (!manualByLeader[mgr]) manualByLeader[mgr] = {};
    manualByLeader[mgr][m.indicador] = Number(m.valor_pct);
  }

  const krByUser: Record<string, number[]> = {};
  for (const kr of (keyResults as Array<{ id_responsavel: string; progresso: string }> ?? [])) {
    const uid = kr.id_responsavel ?? ""; if (!uid) continue;
    const p = parseFloat(kr.progresso ?? "");
    if (!isNaN(p)) { (krByUser[uid] ??= []).push(p); }
  }

  // mgrMap: leader → liderados diretos (chave trimada)
  type ImgReport = { nome: string; elofy_id: string };
  const imgMgrMap: Record<string, ImgReport[]> = {};
  for (const u of (imgUsers as Array<{ nome: string; nome_gestor: string; elofy_id: string }> ?? [])) {
    const mgr = (u.nome_gestor ?? "").trim();
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;
    (imgMgrMap[mgr] ??= []).push({ nome: u.nome ?? "", elofy_id: u.elofy_id ?? "" });
  }

  // Set de elofy_ids acompanhados no mês de referência do IMG (período separado do KPI Acompanhados)
  const accompSet = new Set([
    ...(imgFbRows ?? []).map(r => r.id_usuario_destinatario),
    ...(imgOoRows ?? []).map(r => r.id_usuario_convidado),
  ].filter(Boolean));

  // Pontuação por líder → IMG individual → média global
  const imgLeaderScores: number[] = [];
  for (const [name, reports] of Object.entries(imgMgrMap)) {
    if (reports.length === 0) continue;

    // Pessoas (30%): Feedbacks + ISO + Talentos chave
    const withAccomp = reports.filter(r => accompSet.has(r.elofy_id)).length;
    const fbPts = scoreGeneral(Math.round((withAccomp / reports.length) * 100));
    const isoPct = isoByLeader[name] ?? null;
    const isoPts = isoPct !== null ? scoreISO(isoPct) : null;
    const tal = talByLeader[name];
    const talPts = tal && tal.total > 0
      ? scoreGeneral(Math.round((tal.comPlano / tal.total) * 100))
      : null;
    const pessoasPts = fbPts + (isoPts ?? 0) + (talPts ?? 0);
    const pessoasMax = 12 + (isoPts !== null ? 12 : 0) + (talPts !== null ? 12 : 0);
    const pessoas = pessoasMax > 0 ? pessoasPts / pessoasMax : 0;

    // Planejamento (20%): Metas registradas + Check-ins + Reunião + RDM
    const man = manualByLeader[name] ?? {};
    const metasPts    = "metas_registradas" in man ? scoreGeneral(man.metas_registradas) : null;
    const checkinsPts = "checkins_prazo"     in man ? scorePrazo(man.checkins_prazo)      : null;
    const reuniaoPts  = "reuniao_resultado"  in man ? scorePrazo(man.reuniao_resultado)   : null;
    const rdmPts      = "rdm_prazo"          in man ? scorePrazo(man.rdm_prazo)           : null;
    const planPts = (metasPts ?? 0) + (checkinsPts ?? 0) + (reuniaoPts ?? 0) + (rdmPts ?? 0);
    const planMax = [metasPts, checkinsPts, reuniaoPts, rdmPts].filter(v => v !== null).length * 12;
    const planejamento = planMax > 0 ? planPts / planMax : 0;

    // Financeiro (20%): Headcount previsto + Custo de folha
    const hcPts    = "headcount_previsto"   in man ? scoreGeneral(man.headcount_previsto)   : null;
    const custoPts = "custo_folha_previsto" in man ? scoreGeneral(man.custo_folha_previsto) : null;
    const finPts = (hcPts ?? 0) + (custoPts ?? 0);
    const finMax = [hcPts, custoPts].filter(v => v !== null).length * 12;
    const financeiro = finMax > 0 ? finPts / finMax : 0;

    // Resultados (30%): Atingimento de metas via elofy_key_results
    const reportsWithKRs = reports.filter(r => (krByUser[r.elofy_id]?.length ?? 0) > 0);
    let atingPts: number | null = null;
    if (reportsWithKRs.length > 0) {
      const atingiram = reportsWithKRs.filter(r => {
        const krs = krByUser[r.elofy_id] ?? [];
        return krs.reduce((a, b) => a + b, 0) / krs.length >= 100;
      }).length;
      atingPts = scoreAtingimento(Math.round((atingiram / reportsWithKRs.length) * 100));
    }
    const resultados = atingPts !== null ? atingPts / 12 : 0;

    // Todos os líderes com liderados entram na média — dados parciais geram score parcial
    imgLeaderScores.push(Math.round(
      (pessoas * 0.30 + resultados * 0.30 + planejamento * 0.20 + financeiro * 0.20) * 100
    ));
  }

  const globalIMG = imgLeaderScores.length
    ? Math.round(imgLeaderScores.reduce((a, b) => a + b, 0) / imgLeaderScores.length)
    : null;

  // Context banner label
  const bpLabels: Record<string, string> = {
    caina: "Cainã · Comercial & Marketing",
    izabela: "Izabela · CX/CS & Financeiro",
    renata_paula: "Renata/Paula · Tecnologia & RH",
  };

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "40px 48px" }}>
      {/* Context banner */}
      {(leader || bp !== "geral") && (
        <div style={{
          background: "var(--brand-pale)",
          border: "1px solid rgba(109,40,217,.2)",
          borderRadius: 10,
          padding: "12px 20px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap" as const,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              background: "rgba(109,40,217,.12)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
            }}>
              🎯
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--brand)" }}>
              {leader ? (
                <>Líder: <strong>{leader}</strong></>
              ) : (
                <>Carteira: <strong>{bpLabels[bp]}</strong></>
              )}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
            {(areaFilter ?? []).slice(0, 12).map((area) => (
              <span key={area} style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 9px",
                background: "rgba(255,255,255,.7)",
                border: "1px solid rgba(109,40,217,.2)",
                borderRadius: 10,
                color: "var(--text-700)",
              }}>
                {area}
              </span>
            ))}
            {(areaFilter?.length ?? 0) > 12 && (
              <span style={{ fontSize: 11, color: "var(--text-300)", alignSelf: "center" }}>
                +{(areaFilter?.length ?? 0) - 12} áreas
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Section */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-900)" }}>
          Indicadores
        </span>
        <span style={{ fontSize: 12, color: "var(--text-300)", fontWeight: 400 }}>
          1º TRI 2026 · Fonte: Elofy
        </span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 16,
        marginBottom: 40,
      }}>
        <KPICard icon="👥" bg="#EDE9FE" label="Colaboradores" value={hc} delay={0.04} />
        <KPICard icon="📊" bg="#EDE9FE" label="eNPS" value={enps} badge={npsLabel(enps)} badgeClass={npsClass(enps)} delay={0.09} />
        <KPICard icon="⭐" bg="#FFF7ED" label="LNPS" value={lnps} badge={npsLabel(lnps)} badgeClass={npsClass(lnps)} delay={0.14} />
        <KPICard icon="💬" bg="#EFF6FF" label="Acompanhados" value={acompanhados} delay={0.19} />
        <KPICard icon="📈" bg="#FFF7ED" label="IMG" value={globalIMG} suffix="%" badge={imgLabel(globalIMG)} badgeClass={imgClass(globalIMG) || undefined} delay={0.24} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "40px 0" }} />

      {/* Modules Section */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-900)" }}>
          Módulos
        </span>
        <span style={{ fontSize: 12, color: "var(--text-300)", fontWeight: 400 }}>
          Dashboards e relatórios disponíveis
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <ModuleCard
          href="/nps"
          icon="📊"
          iconBg="#EDE9FE"
          title="NPS Dashboard · Carteira BP"
          desc="eNPS e LNPS por Business Partner — análise de promotores, neutros e detratores com segmentação por carteira e área."
          period="1º TRI 2026"
          delay={0.32}
        />
        <ModuleCard
          href="/iso"
          icon="🏠"
          iconBg="#ECFDF5"
          title="ISO · Saúde Organizacional"
          desc="Índice de saúde organizacional — análise por área, liderança e dimensões de clima: Pertencimento, Saúde Emocional, Carga de Trabalho e Apoio da Liderança."
          period="Março 2026"
          delay={0.37}
        />
        <ModuleCard
          href="/feedback"
          icon="💬"
          iconBg="#EFF6FF"
          title="Relatório de Feedback"
          desc="Feedbacks enviados e recebidos por área — análise de competências percebidas, qualidade do feedback e cobertura na organização."
          period="Abril 2026"
          delay={0.42}
        />
        <ModuleCard
          href="/img"
          icon="📈"
          iconBg="#FFF7ED"
          title="IMG · Verificação de Indicadores"
          desc="Dashboard de verificação IMG com headcount, movimentações e análise de métricas de gestão de pessoas por área e liderança."
          period="Março 2026"
          delay={0.47}
        />
        <ModuleCard
          href="/talentos"
          icon="🌟"
          iconBg="#F0FDF4"
          title="Mapeamento de Talentos"
          desc="Matriz 9-box com mapeamento de desempenho e potencial — talentos chave, planos de desenvolvimento e status de PDI."
          period="1º TRI 2026"
          delay={0.52}
        />
        <ModuleCard
          href="/organograma"
          icon="🏢"
          iconBg="#F0F9FF"
          title="Organograma"
          desc="Estrutura organizacional por time e Business Partner — gestores, colaboradores e distribuição de equipes por carteira."
          period="Atualizado"
          delay={0.57}
        />
      </div>
    </main>
  );
}
