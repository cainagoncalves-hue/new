-- ============================================================
-- MIGRATION 031: Limite de profundidade na CTE recursiva
-- get_subordinates_recursive() sem depth limit é vulnerável a
-- ciclos em dados inconsistentes de hierarquia (A→B→A),
-- podendo causar loop infinito (DoS). Limitar a 10 níveis.
-- ============================================================

CREATE OR REPLACE FUNCTION get_subordinates_recursive(manager_elofy_id text)
RETURNS TABLE(elofy_id text, depth integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subordinates AS (
    -- Nível 1: liderados diretos
    SELECT
      u.elofy_id,
      1 AS depth
    FROM elofy_users u
    WHERE u.id_gestor = manager_elofy_id
      AND u.status = 'Ativo'
      AND u.elofy_id <> manager_elofy_id  -- evita auto-referência

    UNION ALL

    -- Níveis 2+: liderados dos liderados
    SELECT
      u.elofy_id,
      s.depth + 1
    FROM elofy_users u
    INNER JOIN subordinates s ON u.id_gestor = s.elofy_id
    WHERE u.status = 'Ativo'
      AND u.elofy_id <> u.id_gestor       -- evita ciclos diretos
      AND s.depth < 10                     -- limite de segurança: máximo 10 níveis hierárquicos
  )
  SELECT elofy_id, depth
  FROM subordinates;
$$;

COMMENT ON FUNCTION get_subordinates_recursive(text) IS
  'CTE recursiva sobre elofy_users.id_gestor. Retorna toda a árvore abaixo do manager. '
  'Filtra apenas Ativos. Limitada a 10 níveis para evitar DoS por dados de hierarquia com ciclos.';
