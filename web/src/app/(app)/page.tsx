import { createClient } from "@/lib/supabase/server";

// BP area mappings (mirrors index.html)
const BP_AREAS: Record<string, string[]> = {
  caina: ["DIRETORIA COMERCIAL","DIRETORIA MARKETING","MARKETING -  DIGITAL","MARKETING -  EVENTOS","PRÉ-VENDAS","VENDAS INTERNAS","REGIONAL BA","REGIONAL ES","REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT","REGIONAL NE","REGIONAL PR","REGIONAL RJ","REGIONAL RS/SC","REGIONAL SP"],
  izabela: ["CS","CS - Time Aline","CS - Time Luana","CX","CX - Reversão","CX - Time Gabriel","SUPORTE","SUPORTE - Time Edmilson","SUPORTE - Time Enock","SUPORTE - Time Gabriela","SUPORTE - Time Nathalia","ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP","DIRETORIA OPERAÇÕES"],
  renata_paula: ["DEV - Time Felipe","DEV - Time Gilmar","DEV - Time Jony","DEV - Time Leandro","DIRETORIA TECNOLOGIA","TI - INFRAESTRUTURA","PESQUISA & PRODUTO","NIX","Recrutamento e Seleção","Desenvolvimento Humano Organizacional","Departamento Pessoal","DIRETORIA GENTE & CULTURA"],
};

const LEADER_AREAS: Record<string, string[]> = {
  "Henrique Carmellino Filho": ["DIRETORIA  GERAL","DIRETORIA COMERCIAL","DIRETORIA FINANCEIRA","DIRETORIA MARKETING","DIRETORIA OPERAÇÕES","MARKETING -  DIGITAL"],
  "Walquiria Santos Correia": ["ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP"],
  "Gustavo Carmellino": ["DEV - Time Leandro","DIRETORIA TECNOLOGIA","NIX","PESQUISA & PRODUTO"],
  "Jorge Do Nascimento Junior": ["REGIONAL ES","REGIONAL RJ","REGIONAL SP"],
  "Leonardo De Oliveira Gama": ["VENDAS INTERNAS"],
  "Leandro dos Santos Machado": ["DEV - Time Leandro"],
  "Gabriela Maria Araujo Peres": ["SUPORTE - Time Gabriela"],
  "Danilo Jorge da Silva Novais": ["MARKETING -  DIGITAL","PRÉ-VENDAS"],
  "Jose Edmilson Da Silva": ["SUPORTE - Time Edmilson"],
  "Enock De Oliveira E Silva Neto": ["SUPORTE - Time Enock"],
  "Jonialysson Bezerra De Oliveira": ["DEV - Time Jony"],
  "Jefte de Assumpcao Macedo": ["PESQUISA & PRODUTO"],
  "Nathalia Vasconcelos Trajano Da Silva": ["SUPORTE - Time Nathalia"],
  "Joao Henrique Da Silva": ["TI - INFRAESTRUTURA"],
  "Thiago Souza Silva": ["REGIONAL BA","REGIONAL NE"],
  "Gabriel Fidelis Gonzaga Dos Santos": ["CX - Time Gabriel"],
  "Rafael Nascimento Ribeiro": ["DIRETORIA COMERCIAL","REGIONAL RJ","REGIONAL SP","VENDAS INTERNAS"],
  "Rodrigo Jose Anderson do Nascimento Goncalves da Silva": ["CS","CX"],
  "Marcos Flavio De Paiva Reis": ["REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT"],
  "Publio Maswell Matos Cavalcanti": ["SUPORTE","SUPORTE - Time Gabriela"],
  "Anderson Frederick Bernardes De Oliveira": ["NIX"],
  "Camila Alves Da Silva": ["PESQUISA & PRODUTO"],
  "Anderson Luis Lima da Silva": ["ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM"],
  "Gabrielle Vitoria Fernandes Tavares": ["MARKETING -  EVENTOS"],
  "Tomas Signorelli Navarro Lima": ["REGIONAL SP","VENDAS INTERNAS"],
  "Aline Alves de Oliveira": ["CS - Time Aline"],
  "Felipe Ayres Lins": ["DEV - Time Felipe"],
  "Arthur Alexandre Fracalossi Carvalho": ["PRÉ-VENDAS"],
  "Renata Oliveira De Moura Duarte": ["DIRETORIA GENTE & CULTURA","Desenvolvimento Humano Organizacional"],
  "Luana Dos Santos Silva": ["CS","CS - Time Aline","CS - Time Luana"],
  "Flavio Simao De Lima": ["REGIONAL PR","REGIONAL RS/SC"],
  "Walisson Deyvson Barbosa Pernambuco": ["CX - Reversão"],
  "Victor Fernando Soares de Barros": ["ADMINISTRATIVO/FINANCEIRO SP"],
  "Gilmar Oliveira E Silva Junior": ["DEV - Time Gilmar"],
  "Paula Mikaelly Pimentel Silva Vieira": ["Recrutamento e Seleção"],
  "Deoclecio Tadeu Jorge de Campos Filho": ["MARKETING -  DIGITAL"],
  "Elza Maria Eluana Da Silva Dias": ["Departamento Pessoal"],
  "Douglas Dos Santos Soares": ["REGIONAL PR"],
};

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

  // Determine which teams to filter by
  let areaFilter: string[] | null = null;
  if (leader && LEADER_AREAS[leader]) {
    areaFilter = LEADER_AREAS[leader];
  } else if (bp !== "geral" && BP_AREAS[bp]) {
    areaFilter = BP_AREAS[bp];
  }

  // Headcount
  let hcQuery = supabase
    .from("elofy_users")
    .select("elofy_id", { count: "exact", head: true })
    .eq("status", "Ativo");
  if (areaFilter) hcQuery = hcQuery.in("nome_time", areaFilter);
  const { count: hc } = await hcQuery;

  // eNPS and LNPS from survey_pulse (score_resposta field)
  // We fetch all pulse responses for non-Encerrada surveys and compute NPS
  let pulseQuery = supabase
    .from("elofy_survey_pulse")
    .select("score_resposta, id_gestor, id_time, pergunta");
  if (areaFilter) pulseQuery = pulseQuery.in("time", areaFilter);
  const { data: pulseRows } = await pulseQuery;

  // eNPS = pulse responses where pergunta contains "empresa" or similar eNPS question
  // LNPS = pulse responses where pergunta contains "lider" or similar leadership question
  const enpsScores: number[] = [];
  const lnpsScores: number[] = [];
  if (pulseRows) {
    for (const row of pulseRows) {
      const score = parseInt(row.score_resposta ?? "", 10);
      if (isNaN(score)) continue;
      const q = (row.pergunta ?? "").toLowerCase();
      if (q.includes("empresa") || q.includes("recomendar") || q.includes("organiz")) {
        enpsScores.push(score);
      } else if (q.includes("l") && (q.includes("ider") || q.includes("gestor") || q.includes("recomend"))) {
        lnpsScores.push(score);
      }
    }
  }
  const enps = calcNPS(enpsScores);
  const lnps = calcNPS(lnpsScores);

  // Feedbacks this month (current year/month)
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let fbQuery = supabase
    .from("elofy_feedbacks")
    .select("elofy_id", { count: "exact", head: true })
    .gte("data_feedback", `${monthStr}-01`);
  if (areaFilter) fbQuery = fbQuery.in("time_usuario_destinatario", areaFilter);
  const { count: fbCount } = await fbQuery;

  // 1:1s this month
  let ooQuery = supabase
    .from("elofy_one_one")
    .select("elofy_id", { count: "exact", head: true })
    .gte("data_reuniao", `${monthStr}-01`)
    .eq("status_reuniao", "Realizada");
  if (areaFilter) ooQuery = ooQuery.in("time_usuario_convidado", areaFilter);
  const { count: ooCount } = await ooQuery;

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
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 16,
        marginBottom: 40,
      }}>
        <KPICard icon="👥" bg="#EDE9FE" label="Colaboradores" value={hc} delay={0.04} />
        <KPICard icon="📊" bg="#EDE9FE" label="eNPS" value={enps} badge={npsLabel(enps)} badgeClass={npsClass(enps)} delay={0.09} />
        <KPICard icon="⭐" bg="#FFF7ED" label="LNPS" value={lnps} badge={npsLabel(lnps)} badgeClass={npsClass(lnps)} delay={0.14} />
        <KPICard icon="💬" bg="#EFF6FF" label="Feedbacks" value={fbCount} delay={0.19} />
        <KPICard icon="🤝" bg="#F0FDF4" label="1:1 Realizados" value={ooCount} delay={0.24} />
        <KPICard icon="🎯" bg="#FEF3C7" label="Taxa de Resposta" value={enpsScores.length > 0 ? Math.round((enpsScores.length / (hc ?? 1)) * 100) : null} suffix="%" delay={0.29} />
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
      </div>
    </main>
  );
}
