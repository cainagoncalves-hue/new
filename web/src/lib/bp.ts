/**
 * Helpers para buscar o mapeamento área→BP e gestor→BP do Supabase.
 * Substitui as constantes BP_AREAS e LEADER_DATA hardcoded nas páginas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type BPKey = "caina" | "izabela" | "renata_paula";

/**
 * Retorna o mapeamento bp → string[] de times.
 * Usado nas páginas Server Component para montar o filtro por área.
 *
 * @example
 * const bpAreas = await getBPAreas(supabase);
 * const areaFilter = bp !== "geral" ? (bpAreas[bp as BPKey] ?? null) : null;
 */
export async function getBPAreas(
  supabase: SupabaseClient,
): Promise<Record<BPKey, string[]>> {
  const { data } = await supabase
    .from("bp_area_map")
    .select("nome_time, bp");

  const result: Record<BPKey, string[]> = {
    caina: [],
    izabela: [],
    renata_paula: [],
  };

  for (const row of data ?? []) {
    const key = row.bp as BPKey;
    if (key in result) result[key].push(row.nome_time as string);
  }

  return result;
}

/**
 * Retorna a lista de gestores com o BP de cada um.
 * Usado no layout para alimentar o FilterBar (Client Component).
 *
 * Um gestor pode aparecer em mais de um BP se gerenciar times de BPs diferentes.
 */
export async function getBPLeaders(
  supabase: SupabaseClient,
): Promise<{ nome_gestor: string; bp: BPKey }[]> {
  const { data } = await supabase
    .from("bp_gestor_map")
    .select("nome_gestor, bp")
    .order("nome_gestor");

  return (data ?? []) as { nome_gestor: string; bp: BPKey }[];
}
