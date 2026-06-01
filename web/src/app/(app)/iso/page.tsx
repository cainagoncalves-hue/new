import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { excludeAdmins } from "@/lib/adminAccounts";
import ISOLeaderList, { type ISOLeaderData, type ISOQuestion } from "./ISOLeaderList";

const BP_AREAS: Record<string, string[]> = {
  caina: ["DIRETORIA COMERCIAL","DIRETORIA MARKETING","MARKETING -  DIGITAL","MARKETING -  EVENTOS","PRÉ-VENDAS","VENDAS INTERNAS","REGIONAL BA","REGIONAL ES","REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT","REGIONAL NE","REGIONAL PR","REGIONAL RJ","REGIONAL RS/SC","REGIONAL SP"],
  izabela: ["CS","CS - Time Aline","CS - Time Luana","CX","CX - Reversão","CX - Time Gabriel","SUPORTE","SUPORTE - Time Edmilson","SUPORTE - Time Enock","SUPORTE - Time Gabriela","SUPORTE - Time Nathalia","ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP","DIRETORIA OPERAÇÕES"],
  renata_paula: ["DEV - Time Felipe","DEV - Time Gilmar","DEV - Time Jony","DEV - Time Leandro","DIRETORIA TECNOLOGIA","TI - INFRAESTRUTURA","PESQUISA & PRODUTO","NIX","Recrutamento e Seleção","Desenvolvimento Humano Organizacional","Departamento Pessoal","DIRETORIA GENTE & CULTURA"],
};

// Espelho do LEADER_DATA do FilterBar — garante que os líderes apareçam
// mesmo quando nenhuma fonte de dados retornou resultado.
const KNOWN_LEADERS: Record<string, string> = {
  "Henrique Carmellino Filho": "caina",
  "Walquiria Santos Correia": "izabela",
  "Gustavo Carmellino": "renata_paula",
  "Jorge Do Nascimento Junior": "caina",
  "Leonardo De Oliveira Gama": "caina",
  "Leandro dos Santos Machado": "renata_paula",
  "Gabriela Maria Araujo Peres": "izabela",
  "Danilo Jorge da Silva Novais": "caina",
  "Jose Edmilson Da Silva": "izabela",
  "Enock De Oliveira E Silva Neto": "izabela",
  "Jonialysson Bezerra De Oliveira": "renata_paula",
  "Jefte de Assumpcao Macedo": "renata_paula",
  "Nathalia Vasconcelos Trajano Da Silva": "izabela",
  "Joao Henrique Da Silva": "renata_paula",
  "Thiago Souza Silva": "caina",
  "Gabriel Fidelis Gonzaga Dos Santos": "izabela",
  "Rafael Nascimento Ribeiro": "caina",
  "Rodrigo Jose Anderson do Nascimento Goncalves da Silva": "izabela",
  "Marcos Flavio De Paiva Reis": "caina",
  "Publio Maswell Matos Cavalcanti": "izabela",
  "Anderson Frederick Bernardes De Oliveira": "renata_paula",
  "Camila Alves Da Silva": "renata_paula",
  "Anderson Luis Lima da Silva": "izabela",
  "Gabrielle Vitoria Fernandes Tavares": "caina",
  "Tomas Signorelli Navarro Lima": "caina",
  "Aline Alves de Oliveira": "izabela",
  "Felipe Ayres Lins": "renata_paula",
  "Arthur Alexandre Fracalossi Carvalho": "caina",
  "Renata Oliveira De Moura Duarte": "renata_paula",
  "Luana Dos Santos Silva": "izabela",
  "Flavio Simao De Lima": "caina",
  "Walisson Deyvson Barbosa Pernambuco": "izabela",
  "Victor Fernando Soares de Barros": "izabela",
  "Gilmar Oliveira E Silva Junior": "renata_paula",
  "Paula Mikaelly Pimentel Silva Vieira": "renata_paula",
  "Deoclecio Tadeu Jorge de Campos Filho": "caina",
  "Elza Maria Eluana Da Silva Dias": "renata_paula",
  "Douglas Dos Santos Soares": "caina",
};

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

function avg(arr: number[]) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function rateToScore(rate: number, meta: number): number {
  if (rate <= meta) return 100;
  return Math.max(0, Math.min(100, (meta / rate) * 100));
}

function lnpsNormalize(lnps: number) {
  return (lnps + 100) / 2;
}

function isbeNormalize(raw: number) {
  return ((raw - 1) / 3) * 100;
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

  // ── 1. Headcount por gestor ──────────────────────────────────
  let users: { nome_gestor: string | null; nome_time: string | null }[] = [];
  try {
    let usersQ = excludeAdmins(
      supabase.from("elofy_users")
        .select("nome_gestor, nome_time")
        .eq("status", "Ativo"),
      "nome"
    );
    if (areaFilter) usersQ = usersQ.in("nome_time", areaFilter);
    if (leader) usersQ = usersQ.eq("nome_gestor", leader);
    const { data } = await usersQ;
    users = data ?? [];
  } catch { /* RLS ou tabela indisponível */ }

  const headcountByGestor: Record<string, { area: string; n: number }> = {};
  for (const u of users) {
    const g = u.nome_gestor ?? "";
    if (!g || g.toLowerCase().includes("elofy")) continue;
    if (!headcountByGestor[g]) headcountByGestor[g] = { area: u.nome_time ?? "", n: 0 };
    headcountByGestor[g].n++;
  }
  const gestores = Object.keys(headcountByGestor);
  if (leader && !headcountByGestor[leader]) {
    headcountByGestor[leader] = { area: "", n: 0 };
  }

  // ── 2. LNPS — pesquisa mais recente ─────────────────────────
  const { data: lnpsMeta } = await supabase
    .from("elofy_survey_standard")
    .select("id_pesquisa, nome_pesquisa, data_envio_pesquisa")
    .ilike("nome_pesquisa", "%lnps%")
    .order("data_envio_pesquisa", { ascending: false })
    .limit(500);

  const lnpsSurveyId = lnpsMeta?.[0]?.id_pesquisa ?? null;
  const lnpsDate = lnpsMeta?.[0]?.data_envio_pesquisa?.slice(0, 7) ?? null;

  let lnpsRows: { nome_gestor: string | null; resposta: string | null }[] = [];
  if (lnpsSurveyId) {
    let lnpsQ = supabase
      .from("elofy_survey_standard")
      .select("nome_gestor, resposta")
      .eq("id_pesquisa", lnpsSurveyId);
    if (areaFilter) lnpsQ = lnpsQ.in("time", areaFilter);
    if (leader) lnpsQ = lnpsQ.eq("nome_gestor", leader);
    const { data } = await lnpsQ;
    lnpsRows = data ?? [];
  }

  const lnpsByGestor: Record<string, number[]> = {};
  for (const row of lnpsRows) {
    const g = row.nome_gestor ?? "";
    if (!g) continue;
    const v = parseFloat(row.resposta ?? "");
    if (isNaN(v)) continue;
    if (!lnpsByGestor[g]) lnpsByGestor[g] = [];
    lnpsByGestor[g].push(v);
  }

  // ── 3. ISBE — pesquisa mais recente (ilike para robustez) ───
  const { data: isbeMeta } = await supabase
    .from("elofy_survey_pulse")
    .select("data_pulso")
    .ilike("nome_pesquisa", "%BEM ESTAR%")
    .order("data_pulso", { ascending: false })
    .limit(1);

  const isbeLatestDate = isbeMeta?.[0]?.data_pulso?.slice(0, 7) ?? null;

  let isbeRows: {
    gestor: string | null;
    categoria_pergunta: string | null;
    pergunta: string | null;
    score_resposta: string | null;
    data_pulso: string | null;
  }[] = [];

  if (isbeLatestDate) {
    let isbeQ = supabase
      .from("elofy_survey_pulse")
      .select("gestor, categoria_pergunta, pergunta, score_resposta, data_pulso")
      .ilike("nome_pesquisa", "%BEM ESTAR%")
      .gte("data_pulso", `${isbeLatestDate}-01`)
      .lte("data_pulso", `${isbeLatestDate}-31`);
    if (areaFilter) isbeQ = isbeQ.in("time", areaFilter);
    if (leader) isbeQ = isbeQ.eq("gestor", leader);
    const { data } = await isbeQ;
    isbeRows = data ?? [];
  }

  // ISBE: por gestor → scores gerais + por pergunta
  const isbeByGestor: Record<string, {
    all: number[];
    byQuestion: Record<string, { categoria: string; scores: number[] }>;
  }> = {};
  for (const row of isbeRows) {
    const g = row.gestor ?? "";
    if (!g) continue;
    const v = parseFloat(row.score_resposta ?? "");
    if (isNaN(v) || v < 1 || v > 4) continue;
    if (!isbeByGestor[g]) isbeByGestor[g] = { all: [], byQuestion: {} };
    isbeByGestor[g].all.push(v);
    const qKey = row.pergunta ?? "Sem pergunta";
    if (!isbeByGestor[g].byQuestion[qKey]) {
      isbeByGestor[g].byQuestion[qKey] = { categoria: row.categoria_pergunta ?? "", scores: [] };
    }
    isbeByGestor[g].byQuestion[qKey].scores.push(v);
  }

  // ── 4. Turnover voluntário (try/catch: tabela pode não existir ainda) ──
  let desligamentos: { nome_gestor: string | null; tipo: string | null }[] = [];
  try {
    const { data } = await supabase
      .from("manual_desligamentos")
      .select("nome_gestor, tipo")
      .eq("tipo", "voluntario");
    desligamentos = data ?? [];
  } catch { /* migration 021 não aplicada ainda */ }

  const turnoverByGestor: Record<string, number> = {};
  for (const d of desligamentos) {
    const g = d.nome_gestor ?? "";
    if (!g) continue;
    turnoverByGestor[g] = (turnoverByGestor[g] ?? 0) + 1;
  }

  // ── 5. CID F (try/catch: tabela pode não existir ainda) ─────
  let cidf: { nome_gestor: string | null; nome_colaborador: string | null }[] = [];
  try {
    const { data } = await supabase
      .from("manual_cidf")
      .select("nome_gestor, nome_colaborador")
      .eq("ausencia_cidf", true);
    cidf = data ?? [];
  } catch { /* migration 021 não aplicada ainda */ }

  const cidfByGestor: Record<string, Set<string>> = {};
  for (const c of cidf) {
    const g = c.nome_gestor ?? "";
    if (!g) continue;
    if (!cidfByGestor[g]) cidfByGestor[g] = new Set();
    cidfByGestor[g].add(c.nome_colaborador ?? "");
  }

  // ── 6. Montar conjunto de gestores ──────────────────────────
  const allGestores = new Set([
    ...gestores,
    ...Object.keys(lnpsByGestor),
    ...Object.keys(isbeByGestor),
  ]);

  // Fallback: se nenhuma fonte de dados retornou gestores, usa a lista
  // estática do FilterBar para ao menos exibir os cards (scores = "—").
  if (allGestores.size === 0) {
    if (leader) {
      allGestores.add(leader);
    } else {
      for (const [name, bpId] of Object.entries(KNOWN_LEADERS)) {
        if (bp === "geral" || bpId === bp) allGestores.add(name);
      }
    }
  }

  // ── 7. Calcular scores por líder ────────────────────────────
  const leaders: ISOLeaderData[] = [];

  for (const g of allGestores) {
    const hc = headcountByGestor[g] ?? { area: "", n: 0 };
    const headcount = hc.n;

    // LNPS
    const lnpsScores = lnpsByGestor[g] ?? [];
    let lnpsRaw: number | null = null;
    let lnpsScore: number | null = null;
    if (lnpsScores.length > 0) {
      const prom = lnpsScores.filter(v => v >= 9).length;
      const detr = lnpsScores.filter(v => v <= 6).length;
      lnpsRaw = ((prom - detr) / lnpsScores.length) * 100;
      lnpsScore = lnpsNormalize(lnpsRaw);
    }

    // ISBE
    const isbeData = isbeByGestor[g];
    let isbeRaw: number | null = null;
    let isbeScore: number | null = null;
    let isbeN = 0;
    const isbeQuestions: ISOQuestion[] = [];
    if (isbeData && isbeData.all.length > 0) {
      isbeRaw = avg(isbeData.all)!;
      isbeScore = isbeNormalize(isbeRaw);
      const numQ = Object.keys(isbeData.byQuestion).length;
      isbeN = numQ > 0 ? Math.round(isbeData.all.length / numQ) : isbeData.all.length;
      for (const [pergunta, { categoria, scores }] of Object.entries(isbeData.byQuestion)) {
        const qAvg = avg(scores)!;
        isbeQuestions.push({
          pergunta,
          categoria,
          avgRaw: qAvg,
          score: isbeNormalize(qAvg),
          n: scores.length,
        });
      }
      isbeQuestions.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.pergunta.localeCompare(b.pergunta));
    }

    // Turnover
    const turnoverN = turnoverByGestor[g] ?? 0;
    let turnoverRate: number | null = null;
    let turnoverScore: number | null = null;
    if (headcount > 0) {
      turnoverRate = turnoverN / headcount;
      turnoverScore = rateToScore(turnoverRate, 0.008);
    }

    // CID F
    const cidfN = cidfByGestor[g]?.size ?? 0;
    let cidfRate: number | null = null;
    let cidfScore: number | null = null;
    if (headcount > 0) {
      cidfRate = cidfN / headcount;
      cidfScore = rateToScore(cidfRate, 0.0015);
    }

    // ISO final
    const hasData = lnpsScore !== null || isbeScore !== null || turnoverScore !== null || cidfScore !== null;
    let isoScore: number | null = null;
    if (hasData) {
      isoScore = Math.round(
        (turnoverScore ?? 100) * 0.10 +
        (cidfScore ?? 100) * 0.10 +
        (lnpsScore ?? 0) * 0.40 +
        (isbeScore ?? 0) * 0.40
      );
    }

    leaders.push({
      name: g,
      area: hc.area,
      headcount,
      isoScore,
      turnoverScore,
      turnoverRate,
      turnoverN,
      cidfScore,
      cidfRate,
      cidfN,
      lnpsScore,
      lnpsRaw,
      lnpsN: lnpsScores.length,
      isbeScore,
      isbeRaw,
      isbeN,
      isbeQuestions,
    });
  }

  leaders.sort((a, b) => (b.isoScore ?? -1) - (a.isoScore ?? -1));

  const leadersWithScore = leaders.filter(l => l.isoScore !== null);
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

          {/* Períodos de referência */}
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

        {/* Global ISO score */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          padding: "20px 28px",
          textAlign: "center",
          boxShadow: "var(--sh)",
          minWidth: 140,
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

      {/* Legenda de composição */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Turnover Voluntário", weight: "10%", meta: "≤ 0,8%" },
          { label: "Absenteísmo CID F", weight: "10%", meta: "≤ 0,15%" },
          { label: "LNPS", weight: "40%", meta: "Pesquisa recente" },
          { label: "ISBE", weight: "40%", meta: "Pesquisa recente" },
        ].map(({ label, weight, meta }) => (
          <div key={label} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--brand)", background: "var(--brand-pale)", padding: "1px 7px", borderRadius: 4 }}>
              {weight}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-700)" }}>{label}</span>
            <span style={{ fontSize: 11, color: "var(--text-300)" }}>{meta}</span>
          </div>
        ))}
      </div>

      <ISOLeaderList leaders={leaders} />
    </main>
  );
}
