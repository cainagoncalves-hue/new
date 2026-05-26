import { createClient } from "@/lib/supabase/server";
import { excludeAdmins } from "@/lib/adminAccounts";
import OrgTreeClient, { OrgNode } from "./OrgTreeClient";

export default async function OrgPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { leader = "" } = await searchParams;
  const supabase = await createClient();

  // ── 1. Fetch all users ────────────────────────────────────────────────────
  let q = excludeAdmins(
    supabase.from("elofy_users").select("nome, nome_gestor, cargo").eq("status", "Ativo"),
    "nome"
  );

  if (leader) q = q.eq("nome_gestor", leader);

  const { data: users } = await q;

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

  return (
    <div style={{ height: "calc(100vh - 120px)", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      <OrgTreeClient roots={tree} />
    </div>
  );
}
