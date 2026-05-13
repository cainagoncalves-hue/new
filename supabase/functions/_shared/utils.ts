/** Converte DD/MM/YYYY → YYYY-MM-DD para colunas date/timestamp do Postgres. */
export function parseDate(val: unknown): string | null {
  if (!val || val === "") return null;
  const s = String(val);
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s || null;
}

/** Converte para number, retorna null se vazio/inválido. */
export function toNum(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/** Converte para integer arredondado, retorna null se vazio/inválido. */
export function toInt(val: unknown): number | null {
  const n = toNum(val);
  return n !== null ? Math.round(n) : null;
}

/** Remove linhas com elofy_id duplicado (mantém a primeira ocorrência). */
export function dedup<T extends Record<string, unknown>>(rows: T[], key = "elofy_id"): T[] {
  const seen = new Set<unknown>();
  return rows.filter((r) => {
    if (seen.has(r[key])) return false;
    seen.add(r[key]);
    return true;
  });
}
