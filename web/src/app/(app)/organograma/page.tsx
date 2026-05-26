import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import OrgTreeClient, { OrgNode } from "./OrgTreeClient";

export default async function OrgPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { leader = "" } = await searchParams;
  const supabase = await createClient();

  // ── 1. Fetch all users ────────────────────────────────────────────────────
  let q = supabase
    .from("elofy_users")
    .select("nome, nome_gestor, cargo, status");

  if (leader) q = q.eq("nome_gestor", leader);

  const { data: users, error } = await q;

  // ── 2. Build adjacency from nome_gestor ───────────────────────────────────
  // childrenOf[manager] = list of direct reports
  const childrenOf = new Map<string, string[]>();
  // parentOf[person] = their manager
  const parentOf   = new Map<string, string>();
  // cargoOf[person]  = their role
  const cargoOf    = new Map<string, string>();

  for (const u of users ?? []) {
    const name  = (u.nome        ?? "").trim();
    const mgr   = (u.nome_gestor ?? "").trim();
    const cargo = (u.cargo       ?? "").trim();

    if (!name) continue;
    cargoOf.set(name, cargo);

    if (mgr && mgr !== name) {
      parentOf.set(name, mgr);
      if (!childrenOf.has(mgr)) childrenOf.set(mgr, []);
      childrenOf.get(mgr)!.push(name);
    }
  }

  // ── 3. Roots = managers that have no manager themselves ───────────────────
  const roots = [...childrenOf.keys()]
    .filter(mgr => !parentOf.has(mgr))
    .sort((a, b) => (childrenOf.get(b)?.length ?? 0) - (childrenOf.get(a)?.length ?? 0));

  // ── 4. Build OrgNode tree recursively ────────────────────────────────────
  function build(name: string, visited = new Set<string>()): OrgNode {
    if (visited.has(name)) return { id: name, name, role: "", children: [] };
    const v = new Set(visited).add(name);
    const children = (childrenOf.get(name) ?? [])
      .map(c => build(c, v))
      .sort((a, b) => b.children.length - a.children.length);
    return { id: name, name, role: cargoOf.get(name) ?? "", children };
  }

  const tree = roots.map(r => build(r));

  const totalRows   = users?.length ?? 0;
  const totalPeople = tree.reduce(function count(s, n): number {
    return s + 1 + n.children.reduce(count, 0);
  }, 0);

  return (
    <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>← Hub</Link>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <span style={{ fontSize: 13, color: "var(--text-500)" }}>Organograma</span>
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
          Organograma
        </h1>
        {leader && (
          <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>Líder: {leader}</p>
        )}
      </div>

      {/* Debug strip — remove once data is confirmed ─────────────────── */}
      <div style={{ marginBottom: 24, padding: "10px 16px", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, fontSize: 12, fontFamily: "monospace", color: "#713f12" }}>
        elofy_users → <strong>{totalRows}</strong> linhas recebidas &nbsp;|&nbsp;
        error: <strong>{error ? error.message : "none"}</strong> &nbsp;|&nbsp;
        raízes encontradas: <strong>{roots.length}</strong> &nbsp;|&nbsp;
        nós na árvore: <strong>{totalPeople}</strong>
        {totalRows > 0 && (
          <> &nbsp;|&nbsp; ex: nome=&quot;{users?.[0]?.nome ?? "null"}&quot; gestor=&quot;{users?.[0]?.nome_gestor ?? "null"}&quot; status=&quot;{(users?.[0] as any)?.status ?? "null"}&quot;</>
        )}
      </div>
      {/* ─────────────────────────────────────────────────────────────── */}

      {/* Summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        {[
          { label: "Gestores / raízes", value: roots.length },
          { label: "Colaboradores", value: totalPeople },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 22px", boxShadow: "var(--sh)" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "var(--brand)", lineHeight: 1 }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-300)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tree */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--sh)", overflow: "hidden" }}>
        <OrgTreeClient roots={tree} />
      </div>
    </main>
  );
}
