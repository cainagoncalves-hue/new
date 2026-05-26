import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import OrgTreeClient, { OrgNode } from "./OrgTreeClient";

const BP_AREAS: Record<string, string[]> = {
  caina: ["DIRETORIA COMERCIAL","DIRETORIA MARKETING","MARKETING -  DIGITAL","MARKETING -  EVENTOS","PRÉ-VENDAS","VENDAS INTERNAS","REGIONAL BA","REGIONAL ES","REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT","REGIONAL NE","REGIONAL PR","REGIONAL RJ","REGIONAL RS/SC","REGIONAL SP"],
  izabela: ["CS","CS - Time Aline","CS - Time Luana","CX","CX - Reversão","CX - Time Gabriel","SUPORTE","SUPORTE - Time Edmilson","SUPORTE - Time Enock","SUPORTE - Time Gabriela","SUPORTE - Time Nathalia","ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP","DIRETORIA OPERAÇÕES"],
  renata_paula: ["DEV - Time Felipe","DEV - Time Gilmar","DEV - Time Jony","DEV - Time Leandro","DIRETORIA TECNOLOGIA","TI - INFRAESTRUTURA","PESQUISA & PRODUTO","NIX","Recrutamento e Seleção","Desenvolvimento Humano Organizacional","Departamento Pessoal","DIRETORIA GENTE & CULTURA"],
};

const BP_LABELS: Record<string, string> = {
  caina: "Cainã · Comercial & Marketing",
  izabela: "Izabela · CX/CS & Financeiro",
  renata_paula: "Renata/Paula · Tecnologia & RH",
};

// Same leader→areas mapping used throughout the app
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

type UserRow = {
  nome_colaborador: string | null;
  nome_gestor: string | null;
  nome_time: string | null;
};

function buildTree(rows: UserRow[], areaFilter: string[] | null, leaderFilter: string): OrgNode[] {
  // ── Approach 1: build from nome_gestor (same pattern as IMG page) ──────────
  // mgrMap[gestor] = list of their direct reports
  const mgrMap = new Map<string, string[]>();
  const teamOf  = new Map<string, string>(); // person → time

  for (const u of rows) {
    const person = (u.nome_colaborador ?? "").trim();
    const mgr    = (u.nome_gestor    ?? "").trim();
    const team   = (u.nome_time      ?? "").trim();
    if (!person) continue;
    teamOf.set(person, team);
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;
    if (!mgrMap.has(mgr)) mgrMap.set(mgr, []);
    mgrMap.get(mgr)!.push(person);
  }

  // Roots = appear as manager key but NOT as anyone's direct report
  const allReports = new Set<string>();
  for (const reports of mgrMap.values()) reports.forEach(r => allReports.add(r));

  const roots = [...mgrMap.keys()].filter(m => !allReports.has(m));

  if (roots.length > 0) {
    const visited = new Set<string>();
    function buildNode(name: string): OrgNode {
      if (visited.has(name)) return { id: name, name, role: teamOf.get(name) ?? "", children: [] };
      visited.add(name);
      const children = (mgrMap.get(name) ?? [])
        .map(r => buildNode(r))
        .sort((a, b) => b.children.length - a.children.length);
      return { id: name, name, role: teamOf.get(name) ?? "", children };
    }
    return roots
      .sort((a, b) => (mgrMap.get(b)?.length ?? 0) - (mgrMap.get(a)?.length ?? 0))
      .map(r => buildNode(r));
  }

  // ── Approach 2 (fallback): use LEADER_AREAS + nome_time ───────────────────
  // Build: leader → [OrgNode of each employee in their areas]
  const teamToLeader: Record<string, string> = {};
  for (const [leader, areas] of Object.entries(LEADER_AREAS)) {
    for (const area of areas) teamToLeader[area] = leader;
  }

  // Determine which leaders to show
  let leadersToShow: string[];
  if (leaderFilter) {
    leadersToShow = [leaderFilter];
  } else if (areaFilter) {
    const leaderSet = new Set<string>();
    for (const area of areaFilter) {
      const l = teamToLeader[area];
      if (l) leaderSet.add(l);
    }
    leadersToShow = [...leaderSet];
  } else {
    leadersToShow = Object.keys(LEADER_AREAS);
  }

  // Group employees by their leader (via team)
  const leaderReports = new Map<string, OrgNode[]>();
  for (const u of rows) {
    const person = (u.nome_colaborador ?? "").trim();
    const team   = (u.nome_time      ?? "").trim();
    if (!person || !team) continue;
    const leader = teamToLeader[team];
    if (!leader || !leadersToShow.includes(leader)) continue;
    if (!leaderReports.has(leader)) leaderReports.set(leader, []);
    leaderReports.get(leader)!.push({
      id: `${leader}:${person}`,
      name: person,
      role: team,
      children: [],
    });
  }

  return leadersToShow
    .filter(l => leaderReports.has(l))
    .map(l => ({
      id: l,
      name: l,
      role: "",
      children: leaderReports.get(l)!
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function countNodes(n: OrgNode): number {
  return 1 + n.children.reduce((s, c) => s + countNodes(c), 0);
}

export default async function OrgPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();

  const areaFilter = bp !== "geral" && BP_AREAS[bp] ? BP_AREAS[bp] : null;

  let q = supabase
    .from("elofy_users")
    .select("nome_colaborador, nome_gestor, nome_time")
    .eq("status", "Ativo");
  if (areaFilter) q = q.in("nome_time", areaFilter);
  if (leader)     q = q.eq("nome_gestor", leader);

  const { data: rows } = await q;
  const roots = buildTree(rows ?? [], areaFilter, leader);
  const totalPeople = roots.reduce((s, r) => s + countNodes(r), 0);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>
            ← Hub
          </Link>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <span style={{ fontSize: 13, color: "var(--text-500)" }}>Organograma</span>
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
          Organograma
        </h1>
        {(bp !== "geral" || leader) && (
          <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
            {leader ? `Líder: ${leader}` : BP_LABELS[bp] ?? bp}
          </p>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        {[
          { label: "Gestores / raízes", value: roots.length },
          { label: "Colaboradores mapeados", value: totalPeople },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 22px", boxShadow: "var(--sh)" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-300)", marginTop: 4 }}>{label}</div>
          </div>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--text-300)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 16px" }}>
          <span>Clique no nó para expandir / recolher</span>
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--brand)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>3</span>
          <span>= nº subordinados</span>
        </div>
      </div>

      {/* Tree */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--sh)", overflow: "hidden" }}>
        <OrgTreeClient roots={roots} />
      </div>
    </main>
  );
}
