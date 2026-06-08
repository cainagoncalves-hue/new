/**
 * Contas administrativas da plataforma Elofy.
 * Não são colaboradores reais — devem ser excluídas de todos os módulos.
 */
export const ADMIN_ACCOUNTS = ["Z Elofy", "Gente Cultura"];

/**
 * Aplica filtro de exclusão a uma query Supabase.
 * @param query  Qualquer query Supabase (retorno de .from().select()...)
 * @param column Nome da coluna que contém o nome da pessoa (ex: "nome", "nome_colaborador")
 */
export function excludeAdmins<T>(query: T, column: string): T {
  const list = ADMIN_ACCOUNTS.map(n => `"${n}"`).join(",");
  return (query as any).not(column, "in", `(${list})`) as T;
}
