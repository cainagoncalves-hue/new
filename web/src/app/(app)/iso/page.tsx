import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ISOLeaderList, { type ISOLeaderData, type ISOQuestion } from "./ISOLeaderList";
import { getBPAreas, type BPKey } from "@/lib/bp";

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
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();
  const bpAreas = await getBPAreas(supabase);

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
  const { data: rows } = await supabase.rpc("get_iso_scores") as { data: ISORow[] | null; error: unknown };

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

  // Filtros client-side sobre os líderes retornados
  const areaFilter = bp !== "geral" ? (bpAreas[bp as BPKey] ?? null) : null;
  const leaders = allLeaders
    .filter((l) => !areaFilter || areaFilter.includes(l.area))
    .filter((l) => !leader || l.name === leader);

  // Métricas do cabeçalho
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
                LNPS: {lnpsDate}
              </span>
            )}
            {isbeLatestDate && (
              <span style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 10px", color: "var(--text-500)" }}>
                ISBE: {isbeLatestDate}
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

      <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Turnover Voluntário", weight: "10%", meta: "≤ 0,8%" },
          { label: "Absenteísmo CID F",   weight: "10%", meta: "≤ 0,15%" },
          { label: "LNPS",                weight: "40%", meta: "Pesquisa recente" },
          { label: "ISBE",                weight: "40%", meta: "Pesquisa recente" },
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
