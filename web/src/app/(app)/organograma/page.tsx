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

function buildTree(
  rows: { nome_colaborador: string | null; nome_gestor: string | null; nome_cargo: string | null }[]
): OrgNode[] {
  const people = new Map<string, { role: string }>();
  const parentOf = new Map<string, string>(); // child → manager

  for (const row of rows) {
    const name = (row.nome_colaborador ?? "").trim();
    const mgr  = (row.nome_gestor ?? "").trim();
    const role = (row.nome_cargo ?? "").trim();
    if (!name || name === mgr) continue;

    if (!people.has(name)) people.set(name, { role });

    if (mgr) {
      parentOf.set(name, mgr);
      if (!people.has(mgr)) people.set(mgr, { role: "" });
    }
  }

  // childrenOf: manager → [direct reports]
  const childrenOf = new Map<string, string[]>();
  for (const [child, mgr] of parentOf) {
    if (!childrenOf.has(mgr)) childrenOf.set(mgr, []);
    childrenOf.get(mgr)!.push(child);
  }

  // Roots: appear as manager but have no manager themselves
  const roots: string[] = [];
  for (const [mgr] of childrenOf) {
    if (!parentOf.has(mgr)) roots.push(mgr);
  }

  // Build recursive tree nodes with cycle prevention
  function build(name: string, visited: Set<string>): OrgNode {
    if (visited.has(name)) return { id: name, name, role: "", children: [] };
    const next = new Set(visited);
    next.add(name);
    const children = (childrenOf.get(name) ?? [])
      .map((c) => build(c, next))
      // Larger subtrees first so the tree feels balanced
      .sort((a, b) => b.children.length - a.children.length);
    return { id: name, name, role: people.get(name)?.role ?? "", children };
  }

  return roots
    .sort((a, b) => (childrenOf.get(b)?.length ?? 0) - (childrenOf.get(a)?.length ?? 0))
    .map((r) => build(r, new Set()));
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
    .from("elofy_sucessao")
    .select("nome_colaborador, nome_gestor, nome_cargo");
  if (areaFilter) q = q.in("nome_time", areaFilter);
  if (leader)     q = q.eq("nome_gestor", leader);

  const { data: rows } = await q;
  const roots = buildTree(rows ?? []);

  const totalPeople = (() => {
    function count(n: OrgNode): number {
      return 1 + n.children.reduce((s, c) => s + count(c), 0);
    }
    return roots.reduce((s, r) => s + count(r), 0);
  })();

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
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text-900)",
          }}
        >
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
          <div
            key={label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 22px",
              boxShadow: "var(--sh)",
            }}
          >
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 26,
                fontWeight: 800,
                color: "var(--brand)",
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-300)", marginTop: 4 }}>{label}</div>
          </div>
        ))}

        {/* Legend */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 11,
            color: "var(--text-300)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 16px",
          }}
        >
          <span>Clique no nó para expandir/recolher</span>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "var(--brand)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            3
          </span>
          <span>= nº de subordinados</span>
        </div>
      </div>

      {/* Tree */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "var(--sh)",
          overflow: "hidden",
        }}
      >
        <OrgTreeClient roots={roots} />
      </div>
    </main>
  );
}
