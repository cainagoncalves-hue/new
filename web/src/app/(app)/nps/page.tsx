import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const BP_AREAS: Record<string, string[]> = {
  caina: ["DIRETORIA COMERCIAL","DIRETORIA MARKETING","MARKETING -  DIGITAL","MARKETING -  EVENTOS","PRÉ-VENDAS","VENDAS INTERNAS","REGIONAL BA","REGIONAL ES","REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT","REGIONAL NE","REGIONAL PR","REGIONAL RJ","REGIONAL RS/SC","REGIONAL SP"],
  izabela: ["CS","CS - Time Aline","CS - Time Luana","CX","CX - Reversão","CX - Time Gabriel","SUPORTE","SUPORTE - Time Edmilson","SUPORTE - Time Enock","SUPORTE - Time Gabriela","SUPORTE - Time Nathalia","ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP","DIRETORIA OPERAÇÕES"],
  renata_paula: ["DEV - Time Felipe","DEV - Time Gilmar","DEV - Time Jony","DEV - Time Leandro","DIRETORIA TECNOLOGIA","TI - INFRAESTRUTURA","PESQUISA & PRODUTO","NIX","Recrutamento e Seleção","Desenvolvimento Humano Organizacional","Departamento Pessoal","DIRETORIA GENTE & CULTURA"],
};

function calcNPS(scores: number[]) {
  if (!scores.length) return null;
  const prom = scores.filter((v) => v >= 9).length;
  const detr = scores.filter((v) => v <= 6).length;
  const pass = scores.length - prom - detr;
  return {
    score: Math.round(((prom - detr) / scores.length) * 100),
    n: scores.length, prom, pass, detr,
  };
}

function npsColor(v: number | null) {
  if (v === null) return { color: "var(--text-300)", label: "—" };
  if (v >= 75) return { color: "var(--green)", label: "Excelência" };
  if (v >= 50) return { color: "var(--brand)", label: "Qualidade" };
  if (v >= 25) return { color: "var(--amber)", label: "Atenção" };
  return { color: "var(--red)", label: "Crítico" };
}

interface LeaderNPS {
  name: string;
  short: string;
  initials: string;
  area: string;
  bp: string;
  lnps: ReturnType<typeof calcNPS>;
  enps: ReturnType<typeof calcNPS>;
}

function NPSGauge({ score, type }: { score: number | null; type: "eNPS" | "LNPS" }) {
  const { color, label } = npsColor(score);
  const pct = score !== null ? Math.max(0, Math.min(100, (score + 100) / 2)) : 50;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const arcLen = (pct / 100) * circ * 0.75;
  const offset = circ * 0.125;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 6 }}>
        {type}
      </div>
      <svg width="96" height="72" viewBox="0 0 96 72" style={{ overflow: "visible" }}>
        <circle cx="48" cy="56" r={r} fill="none" stroke="var(--border)" strokeWidth="8"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={-offset}
          strokeLinecap="round" />
        {score !== null && (
          <circle cx="48" cy="56" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${arcLen} ${circ - arcLen}`}
            strokeDashoffset={-offset}
            strokeLinecap="round" />
        )}
        <text x="48" y="52" textAnchor="middle" fontSize="18" fontWeight="800" fontFamily="Syne, sans-serif" fill="var(--text-900)">
          {score !== null ? score : "—"}
        </text>
        <text x="48" y="66" textAnchor="middle" fontSize="9" fill={color} fontWeight="600">
          {label}
        </text>
      </svg>
    </div>
  );
}

function LeaderCard({ leader }: { leader: LeaderNPS }) {
  const bestScore = Math.max(
    leader.lnps?.score ?? -100,
    leader.enps?.score ?? -100,
  );
  const { color } = npsColor(bestScore > -100 ? bestScore : null);
  const bpColors: Record<string, string> = {
    caina: "#EDE9FE",
    izabela: "#ECFDF5",
    renata_paula: "#EFF6FF",
  };

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r)",
      padding: "20px 20px 16px",
      boxShadow: "var(--sh)",
      display: "flex",
      flexDirection: "column" as const,
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: bpColors[leader.bp] ?? "var(--brand-pale)",
          color: "var(--brand)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
          fontFamily: "'Syne', sans-serif",
        }}>
          {leader.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-900)", lineHeight: 1.3 }}>
            {leader.short}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {leader.area}
          </div>
        </div>
        {(leader.lnps?.n ?? 0) < 5 && (
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 6,
            background: "var(--amber-bg)",
            color: "var(--amber-text)",
            flexShrink: 0,
          }}>
            n pequeno
          </span>
        )}
      </div>

      {/* Gauges */}
      <div style={{ display: "flex", justifyContent: "space-around", padding: "0 8px" }}>
        <NPSGauge score={leader.lnps?.score ?? null} type="LNPS" />
        <NPSGauge score={leader.enps?.score ?? null} type="eNPS" />
      </div>

      {/* Breakdown */}
      {leader.lnps && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 4,
          padding: "10px 12px",
          background: "var(--surface-2)",
          borderRadius: 8,
        }}>
          {[
            { label: "Promotores", count: leader.lnps.prom, color: "var(--green)" },
            { label: "Neutros", count: leader.lnps.pass, color: "var(--amber)" },
            { label: "Detratores", count: leader.lnps.detr, color: "var(--red)" },
          ].map(({ label, count, color: c }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: c, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 9, color: "var(--text-300)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function NPSPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && BP_AREAS[bp]) areaFilter = BP_AREAS[bp];

  // Lookup team IDs for BP-scoped filtering (short IDs — sem risco de URL longa)
  let scopedTeamIds: string[] | null = null;
  if (areaFilter) {
    const { data: teams } = await supabase
      .from("elofy_teams")
      .select("elofy_id")
      .in("nome", areaFilter);
    scopedTeamIds = (teams ?? []).map((t: { elofy_id: string }) => t.elofy_id).filter(Boolean);
  }

  // Descobre o id_pesquisa mais recente para LNPS e eNPS
  const [{ data: latestLnpsMeta }, { data: latestEnpsMeta }] = await Promise.all([
    supabase
      .from("elofy_survey_standard")
      .select("id_pesquisa")
      .ilike("nome_pesquisa", "%lnps%")
      .order("data_envio_pesquisa", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("elofy_survey_standard")
      .select("id_pesquisa")
      .ilike("nome_pesquisa", "%enps%")
      .order("data_envio_pesquisa", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Busca respostas das duas pesquisas com escopo:
  // • líder específico → nome_gestor = leader
  // • BP             → id_time IN (scopedTeamIds)
  // • geral          → sem filtro
  function applyScope<T extends object>(q: T): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = q as any;
    if (leader) {
      query = query.eq("nome_gestor", leader);
    } else if (scopedTeamIds && scopedTeamIds.length > 0) {
      query = query.in("id_time", scopedTeamIds);
    }
    return query;
  }

  const [{ data: lnpsRows }, { data: enpsRows }] = await Promise.all([
    latestLnpsMeta?.id_pesquisa
      ? applyScope(
          supabase
            .from("elofy_survey_standard")
            .select("nome_gestor, resposta, time")
            .eq("id_pesquisa", latestLnpsMeta.id_pesquisa)
        )
      : Promise.resolve({ data: [] as { nome_gestor: string; resposta: string; time: string }[] }),
    latestEnpsMeta?.id_pesquisa
      ? applyScope(
          supabase
            .from("elofy_survey_standard")
            .select("nome_gestor, resposta, time")
            .eq("id_pesquisa", latestEnpsMeta.id_pesquisa)
        )
      : Promise.resolve({ data: [] as { nome_gestor: string; resposta: string; time: string }[] }),
  ]);

  // Agrupa por nome_gestor
  const leaderMap: Record<string, { lnpsScores: number[]; enpsScores: number[]; area: string }> = {};

  for (const row of lnpsRows ?? []) {
    const name = row.nome_gestor ?? "";
    if (!name) continue;
    if (!leaderMap[name]) leaderMap[name] = { lnpsScores: [], enpsScores: [], area: row.time ?? "" };
    const score = parseFloat(row.resposta ?? "");
    if (!isNaN(score)) leaderMap[name].lnpsScores.push(score);
  }

  for (const row of enpsRows ?? []) {
    const name = row.nome_gestor ?? "";
    if (!name) continue;
    if (!leaderMap[name]) leaderMap[name] = { lnpsScores: [], enpsScores: [], area: row.time ?? "" };
    const score = parseFloat(row.resposta ?? "");
    if (!isNaN(score)) leaderMap[name].enpsScores.push(score);
  }

  // BP lookup para colorir os cards
  const LEADER_BP: Record<string, string> = {
    "Aline Alves de Oliveira":"izabela","Anderson Frederick Bernardes De Oliveira":"renata_paula",
    "Anderson Luis Lima da Silva":"izabela","Arthur Alexandre Fracalossi Carvalho":"caina",
    "Camila Alves Da Silva":"renata_paula","Danilo Jorge da Silva Novais":"caina",
    "Deoclecio Tadeu Jorge de Campos Filho":"caina","Elza Maria Eluana Da Silva Dias":"renata_paula",
    "Enock De Oliveira E Silva Neto":"izabela","Felipe Ayres Lins":"renata_paula",
    "Flavio Simao De Lima":"caina","Gabriel Fidelis Gonzaga Dos Santos":"izabela",
    "Gabriela Maria Araujo Peres":"izabela","Gabrielle Vitoria Fernandes Tavares":"caina",
    "Gilmar Oliveira E Silva Junior":"renata_paula","Gustavo Carmellino":"renata_paula",
    "Henrique Carmellino Filho":"caina","Jefte de Assumpcao Macedo":"renata_paula",
    "Joao Henrique Da Silva":"renata_paula","Jonialysson Bezerra De Oliveira":"renata_paula",
    "Jorge Do Nascimento Junior":"caina","Jose Edmilson Da Silva":"izabela",
    "Leandro dos Santos Machado":"renata_paula","Leonardo De Oliveira Gama":"caina",
    "Luana Dos Santos Silva":"izabela","Marcos Flavio De Paiva Reis":"caina",
    "Nathalia Vasconcelos Trajano Da Silva":"izabela","Paula Mikaelly Pimentel Silva Vieira":"renata_paula",
    "Publio Maswell Matos Cavalcanti":"izabela","Rafael Nascimento Ribeiro":"caina",
    "Renata Oliveira De Moura Duarte":"renata_paula","Rodrigo Jose Anderson do Nascimento Goncalves da Silva":"izabela",
    "Thiago Souza Silva":"caina","Tomas Signorelli Navarro Lima":"caina",
    "Victor Fernando Soares de Barros":"izabela","Walisson Deyvson Barbosa Pernambuco":"izabela",
    "Walquiria Santos Correia":"izabela","Douglas Dos Santos Soares":"caina",
  };

  function shortName(name: string) {
    const parts = name.split(" ");
    if (parts.length <= 2) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }
  function initials(name: string) {
    return name.split(" ").filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  }

  const leaders: LeaderNPS[] = Object.entries(leaderMap)
    .map(([name, data]) => ({
      name,
      short: shortName(name),
      initials: initials(name),
      area: data.area,
      bp: LEADER_BP[name] ?? "geral",
      lnps: calcNPS(data.lnpsScores),
      enps: calcNPS(data.enpsScores),
    }))
    .sort((a, b) => (b.lnps?.score ?? -200) - (a.lnps?.score ?? -200));

  // Stats globais: todos os scores LNPS e eNPS somados
  const allLnpsScores = leaders.flatMap((l) => {
    const { prom = 0, pass = 0, detr = 0 } = l.lnps ?? {};
    return [
      ...Array(prom).fill(9),
      ...Array(pass).fill(7),
      ...Array(detr).fill(5),
    ];
  });
  const globalLNPS = calcNPS(allLnpsScores);
  const { color: lnpsColor, label: lnpsLabel } = npsColor(globalLNPS?.score ?? null);

  const allEnpsScores = leaders.flatMap((l) => {
    const { prom = 0, pass = 0, detr = 0 } = l.enps ?? {};
    return [
      ...Array(prom).fill(9),
      ...Array(pass).fill(7),
      ...Array(detr).fill(5),
    ];
  });
  const globalENPS = calcNPS(allEnpsScores);
  const { color: enpsColor, label: enpsLabel } = npsColor(globalENPS?.score ?? null);

  const bpLabels: Record<string, string> = {
    caina: "Cainã · Comercial & Marketing",
    izabela: "Izabela · CX/CS & Financeiro",
    renata_paula: "Renata/Paula · Tecnologia & RH",
  };

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 48px" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>
              ← Hub
            </Link>
            <span style={{ color: "var(--border-2)" }}>·</span>
            <span style={{ fontSize: 13, color: "var(--text-500)" }}>NPS Dashboard</span>
          </div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)", lineHeight: 1.2 }}>
            NPS <em>Dashboard</em><br />Líderes
          </h1>
          {(bp !== "geral" || leader) && (
            <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
              {leader ? `Líder: ${leader}` : `Carteira: ${bpLabels[bp] ?? bp}`}
            </p>
          )}
        </div>

        {/* Summary stats */}
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: "20px 28px",
            textAlign: "center",
            boxShadow: "var(--sh)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
              LNPS Geral
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: lnpsColor, lineHeight: 1 }}>
              {globalLNPS?.score ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: lnpsColor, fontWeight: 600, marginTop: 4 }}>{lnpsLabel}</div>
            <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
              {globalLNPS?.n ?? 0} respostas · {leaders.length} líderes
            </div>
          </div>

          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            padding: "20px 28px",
            textAlign: "center",
            boxShadow: "var(--sh)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--text-300)", marginBottom: 4 }}>
              eNPS Geral
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: enpsColor, lineHeight: 1 }}>
              {globalENPS?.score ?? "—"}
            </div>
            <div style={{ fontSize: 11, color: enpsColor, fontWeight: 600, marginTop: 4 }}>{enpsLabel}</div>
            <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 4 }}>
              {globalENPS?.n ?? 0} respostas · {leaders.length} líderes
            </div>
          </div>
        </div>
      </div>

      {/* Leaders grid */}
      {leaders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhuma resposta encontrada para os filtros selecionados.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {leaders.map((l) => (
            <LeaderCard key={l.name} leader={l} />
          ))}
        </div>
      )}
    </main>
  );
}
