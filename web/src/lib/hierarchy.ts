import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Dado o nome de um líder, retorna todos os nomes de gestores no subtree
 * abaixo dele (inclusive o próprio líder).
 *
 * Algoritmo: BFS sobre o mapa manager→liderados diretos construído a partir
 * de elofy_users. Só entra na fila quem também for gestor de alguém — ou seja,
 * só navegamos por nós que têm filhos na árvore.
 *
 * Uso: substituir `.eq("nome_gestor", leader)` por
 *      `.in("nome_gestor", subtreeLeaders)` nas queries de cada módulo,
 *      expandindo o filtro para toda a hierarquia abaixo do líder selecionado.
 */
export async function getLeaderSubtree(
  supabase: SupabaseClient,
  leaderName: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("elofy_users")
    .select("nome, nome_gestor")
    .eq("status", "Ativo");

  if (!data || data.length === 0) return [leaderName.trim()];

  // Monta mapa manager (trimado) → lista de nomes de liderados diretos
  const childrenOf: Record<string, string[]> = {};
  for (const u of data) {
    const mgr  = (u.nome_gestor ?? "").trim();
    const nome = (u.nome        ?? "").trim();
    if (mgr && nome) (childrenOf[mgr] ??= []).push(nome);
  }

  // BFS: coleta todos os gestores no subtree (inclusive o líder raiz)
  const result: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [leaderName.trim()];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    // Enfileira liderados diretos que são eles mesmos gestores
    for (const child of childrenOf[current] ?? []) {
      if (!visited.has(child) && child in childrenOf) {
        queue.push(child);
      }
    }
  }

  return result;
}
