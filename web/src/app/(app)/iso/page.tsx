import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ISOLeaderList, { type ISOLeaderData, type ISOQuestion } from "./ISOLeaderList";
import { getCachedBPLeaders } from "@/lib/bp";
import PeriodSelect from "@/components/PeriodSelect";

function formatMonthLabel(key: string): string {
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const [year, month] = key.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return key;
  return `${months[month - 1]} ${year}`;
}

/** Extrai "YYYY-MM" de uma string de data (ISO ou DD/MM/YYYY) */
function toMonthKey(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}/.test(dateStr)) return dateStr.slice(0, 7);
  const m = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}`;
  return "";
}

function isoColor(v: number | null) {
  if (v === null) return "var(--text-300)";
  if (v >= 80) return "var(--green)";
  if (v >= 70) return "var(--amber)";
  return "var(--red)";
}
function isoLabel(v: number | null) {
  if (v === null) return "—";
  if (v >= 80) return "Saúde Organizacional Alta";
  if (v >= 70) return "Moderada";
  return "Crítica";
}

export default async function ISOPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string; mes?: string }>;
}) {
  const { bp = "geral", leader = "", mes = "" } = await searchParams;
  const supabase = await createClient();
  const bpLeadersAll = await getCachedBPLeaders();

  // ── Meses disponíveis para o filtro ──────────────────────────────────────────
  // Fonte primária: pesquisas LNPS (sempre existem; garantem que o filtro aparece)
  // Fonte complementar: meses com dados manuais de turnover / CID-F
  const [
    { data: lnpsSurveyDates },
    { data: desDates },
    { data: cidfDates },
  ] = await Promise.all([
    supabase
      .from("elofy_survey_standard")
      .select("id_pesquisa, data_envio_pesquisa")
      .ilike("nome_pesquisa", "%lnps%")
      .order("data_envio_pesquisa", { ascending: false })
      .limit(200),
    supabase.from("manual_desligamentos").select("mes_referencia"),
    supabase.from("manual_cidf").select("mes_referencia"),
  ]);

  const isoMonthSet = new Set<string>();

  // LNPS — deduplica por id_pesquisa
  const seenSurveys = new Set<string>();
  for (const row of lnpsSurveyDates ?? []) {
    if (!row.id_pesquisa || seenSurveys.has(row.id_pesquisa)) continue;
    seenSurveys.add(row.id_pesquisa);
    const key = toMonthKey(row.data_envio_pesquisa);
    if (key) isoMonthSet.add(key);
  }

  // Manuais (turnover + CID-F) — mes_referencia é date "YYYY-MM-DD"
  for (const row of [...(desDates ?? []), ...(cidfDates ?? [])]) {
    const key = (row.mes_referencia as string)?.slice(0, 7);
    if (key) isoMonthSet.add(key);
  }

  const periods = [...isoMonthSet]
    .sort((a, b) => b.localeCompare(a))
    .map(key => ({ key, label: formatMonthLabel(key) }));

  const activeMes = mes || (periods[0]?.key ?? "");


  // ── RPC — backward-compatible: passa p_mes só quando a função nova está ativa
  // Sem migration aplicada (função antiga sem parâmetro): activeMes="" → sem args
  // Com migration aplicada: sempre passa p_mes (inclui "" para default)
  type ISORow = {
    gestor_nome: string; area: string | null; headcount: number;
    iso_score: number | null;
    turnover_score: number | null; turnover_rate: number | null; turnover_n: number;
    cidf_score: number | null; cidf_rate: number | null; cidf_n: number;
    lnps_raw: number | null; lnps_score: number | null; lnps_n: number;
    lnps_is_area_avg: boolean; lnps_area_label: string | null;
    isbe_raw: number | null; isbe_score: number | null; isbe_n: number;
    isbe_is_area_avg: boolean; isbe_area_label: string | null;
    perguntas_isbe: ISOQuestion[] | null;
    lnps_date: string | null; isbe_mes: string | null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcCall = activeMes
    ? supabase.rpc("get_iso_scores", { p_mes: activeMes })
    : supabase.rpc("get_iso_scores");
  const { data: rows } = await rpcCall as { data: ISORow[] | null; error: unknown };

  const allLeaders: ISOLeaderData[] = (rows ?? []).map((row) => ({
    name: row.gestor_nome,
    area: row.area ?? "",
    headcount: Number(row.headcount),
    isoScore: row.iso_score != null ? Number(row.iso_score) : null,
    turnoverScore: row.turnover_score != null ? Number(row.turnover_score) : null,
    turnoverRate: row.turnover_rate != null ? Number(row.turnover_rate) : null,
    turnoverN: Number(row.turnover_n),
    cidfScore: row.cidf_score != null ? Number(row.cidf_score) : null,
    cidfRate: row.cidf_rate != null ? Number(row.cidf_rate) : null,
    cidfN: Number(row.cidf_n),
    lnpsScore: row.lnps_score != null ? Number(row.lnps_score) : null,
    lnpsRaw: row.lnps_raw != null ? Number(row.lnps_raw) : null,
    lnpsN: Number(row.lnps_n),
    lnpsIsAreaAvg: row.lnps_is_area_avg ?? false,
    lnpsAreaLabel: row.lnps_area_label ?? "",
    isbeScore: row.isbe_score != null ? Number(row.isbe_score) : null,
    isbeRaw: row.isbe_raw != null ? Number(row.isbe_raw) : null,
    isbeN: Number(row.isbe_n),
    isbeQuestions: (row.perguntas_isbe as ISOQuestion[]) ?? [],
    isbeIsAreaAvg: row.isbe_is_area_avg ?? false,
    isbeAreaLabel: row.isbe_area_label ?? "",
  }));

  // Filtra por gestor (bp_gestor_map) em vez de por area (MIN do time),
  // evitando exclusão incorreta de líderes multi-time.
  const bpGestorSet = bp !== "geral"
    ? new Set(bpLeadersAll.filter(l => l.bp === bp).map(l => l.nome_gestor.trim()))
    : null;
  const leaders = allLeaders
    .filter((l) => !bpGestorSet || bpGestorSet.has(l.name.trim()))
    .filter((l) => !leader || l.name === leader);

  const lnpsDate = rows?.[0]?.lnps_date ?? null;
  const isbeLatestDate = rows?.[0]?.isbe_mes ?? null;
  const leadersWithScore = leaders.filter((l) => l.isoScore !== null);
  const globalISO = leadersWithScore.length
    ? Math.round(leadersWithScore.reduce((s, l) => s + l.isoScore!, 0) / leadersWithScore.length)
    : null;

  const bpLabels: Record<string, string> = {
    caina: "Cainã · Comercial & Marketing",
    izabela: "Izabela · CX/CS & Financeiro",
    renata_paula: "Renata/Paula · Tecnologia & RH",
  };

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 48px" }}>
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
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {lnpsDate && (
              <span style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", color: "var(--text-500)" }}>
                LNPS usado: {lnpsDate}
              </span>
            )}
            {isbeLatestDate && (
              <span style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", color: "var(--text-500)" }}>
                ISBE usado: {isbeLatestDate}
              </span>
            )}
          </div>
        </div>

        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--r)", padding: "20px 28px", textAlign: "center",
          boxShadow: "var(--sh)", minWidth: 140,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
            ISO Médio
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 44, fontWeight: 800, color: isoColor(globalISO), lineHeight: 1 }}>
            {globalISO ?? "—"}
          </div>
          <div style={{ fontSize: 11, color: isoColor(globalISO), fontWeight: 600, marginTop: 4 }}>
            {isoLabel(globalISO)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
            {leaders.length} líderes
          </div>
        </div>
      </div>

      <PeriodSelect periods={periods} activeMes={activeMes} />

      <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Turnover Voluntário", weight: "10%", meta: "≤ 0,8% · mês exato · 100 se sem dados" },
          { label: "Absenteísmo CID F",   weight: "10%", meta: "≤ 0,15% · mês exato · 100 se sem dados" },
          { label: "LNPS",                weight: "40%", meta: "Pesquisa mais recente até o mês" },
          { label: "ISBE",                weight: "40%", meta: "Pesquisa mais recente até o mês" },
        ].map(({ label, weight, meta }) => (
          <div key={label} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand)", background: "var(--brand-pale)", padding: "1px 7px", borderRadius: 4 }}>{weight}</span>
            <span style={{ fontSize: 12, color: "var(--text-700)" }}>{label}</span>
            <span style={{ fontSize: 11, color: "var(--text-300)" }}>{meta}</span>
          </div>
        ))}
      </div>

      <ISOLeaderList leaders={leaders} />
    </main>
  );
}
