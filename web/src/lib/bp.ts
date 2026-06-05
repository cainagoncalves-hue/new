/**
 * Helpers para buscar o mapeamento área→BP e gestor→BP do Supabase.
 * Substitui as constantes BP_AREAS e LEADER_DATA hardcoded nas páginas.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type BPKey = "caina" | "izabela" | "renata_paula";

/**
 * Retorna o mapeamento bp → string[] de times.
 * Retorna null para um BP se não houver times mapeados (evita .in(col, [])
 * que gera WHERE col IN () e retorna zero linhas).
 *
 * @example
 * const bpAreas = await getBPAreas(supabase);
 * const areaFilter = bp !== "geral" ? (bpAreas[bp as BPKey] ?? null) : null;
 */
export async function getBPAreas(
  supabase: SupabaseClient,
): Promise<Record<BPKey, string[] | null>> {
  const { data, error } = await supabase
    .from("bp_area_map")
    .select("nome_time, bp");

  if (error) console.error("[getBPAreas] erro:", error.message);

  const acc: Record<BPKey, string[]> = {
    caina: [],
    izabela: [],
    renata_paula: [],
  };

  for (const row of data ?? []) {
    const key = row.bp as BPKey;
    if (key in acc) acc[key].push(row.nome_time as string);
  }

  // Converte arrays vazios em null para evitar .in(col, [])
  return {
    caina:        acc.caina.length        > 0 ? acc.caina        : null,
    izabela:      acc.izabela.length      > 0 ? acc.izabela      : null,
    renata_paula: acc.renata_paula.length > 0 ? acc.renata_paula : null,
  };
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
  const { data, error } = await supabase
    .from("bp_gestor_map")
    .select("nome_gestor, bp")
    .order("nome_gestor");

  if (error) console.error("[getBPLeaders] erro:", error.message);

  return (data ?? []) as { nome_gestor: string; bp: BPKey }[];
}
