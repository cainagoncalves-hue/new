-- ============================================================
-- MIGRATION 032: Correções do linter de segurança do Supabase
--
-- 4 categorias de WARN corrigidas:
-- 1. function_search_path_mutable        → SET search_path em 8 funções
-- 2. materialized_view_in_api            → revoga SELECT direto em mv_enps_by_team
-- 3/4. *_security_definer_function_executable → revoga EXECUTE de anon/authenticated
--      onde não é necessário; fecha bypass de escopo em get_subordinates_recursive
--      e get_bp_team_members (aceitavam um id arbitrário via parâmetro — qualquer
--      usuário autenticado podia ler a árvore de QUALQUER gestor ou a carteira de
--      QUALQUER BP). Mantém as mesmas assinaturas (zero call-sites alterados):
--      o parâmetro passa a ser ignorado e a função sempre resolve a própria
--      identidade via auth.uid()/get_current_elofy_id().
--
-- (auth_leaked_password_protection é configuração de Auth no Dashboard,
--  não corrigível via migration — mesmo caso do max_rows desta sessão.)
-- ============================================================

-- ------------------------------------------------------------
-- 1. search_path fixo — ALTER FUNCTION, sem reescrever corpo
-- ------------------------------------------------------------
ALTER FUNCTION public.update_updated_at_column()   SET search_path = public;
ALTER FUNCTION public.check_bp_role()              SET search_path = public;
ALTER FUNCTION public.mask_cpf(text)               SET search_path = public;
ALTER FUNCTION public.mask_email(text)             SET search_path = public;
ALTER FUNCTION public.try_cast_numeric(text)       SET search_path = public;
ALTER FUNCTION public.update_manual_updated_at()   SET search_path = public;
ALTER FUNCTION public.rebuild_bp_gestor_map()      SET search_path = public;
ALTER FUNCTION public.get_iso_scores(text)         SET search_path = public;

-- ------------------------------------------------------------
-- 2. mv_enps_by_team — não é usada por nenhum código do app
--    (confirmado por grep em web/src e supabase/functions).
--    v_enps_by_team (security_invoker + filtro de role) continua
--    sendo o único caminho de leitura, como já documentado na migration 016.
-- ------------------------------------------------------------
REVOKE SELECT ON mv_enps_by_team FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 3. Funções de baixo risco (retornam só dados do próprio usuário) —
--    revoga de anon, mantém authenticated (exigido pelas RLS policies
--    que as chamam diretamente no USING, executando como authenticated)
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION get_current_user_role()             FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_current_user_role()             TO authenticated;

REVOKE EXECUTE ON FUNCTION get_current_elofy_id()              FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_current_elofy_id()              TO authenticated;

REVOKE EXECUTE ON FUNCTION current_user_can_see_elofy_id(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION current_user_can_see_elofy_id(text) TO authenticated;

-- ------------------------------------------------------------
-- 4. Funções sem motivo para serem chamadas via RPC público
--    - audit_log_trigger: trigger handler puro; disparo de trigger não
--      exige EXECUTE do role que faz o INSERT/UPDATE, só a chamada
--      direta via RPC exige — revogar é seguro.
--    - rebuild_bp_gestor_map: só é chamada por supabase/functions/sync-estrutura
--      via SUPABASE_SERVICE_ROLE_KEY, que tem grants próprios no Supabase.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION audit_log_trigger()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION rebuild_bp_gestor_map() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 5. Vulnerabilidade real: get_subordinates_recursive e get_bp_team_members
--    aceitavam um id de destino arbitrário via parâmetro. Nenhum call-site
--    interno usa isso (todos passam a própria identidade) — qualquer usuário
--    autenticado podia sobrescrever o parâmetro via RPC direto e ler a árvore
--    de QUALQUER gestor ou a carteira de QUALQUER BP, contornando o escopo
--    por role. Mantém a assinatura (nenhuma policy/view/função precisa
--    mudar) — o parâmetro agora é ignorado e a função sempre resolve a
--    própria identidade do chamador internamente.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_subordinates_recursive(manager_elofy_id text)
RETURNS TABLE(elofy_id text, depth integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subordinates AS (
    -- Nível 1: liderados diretos do CHAMADOR (manager_elofy_id é ignorado)
    SELECT
      u.elofy_id,
      1 AS depth
    FROM elofy_users u
    WHERE u.id_gestor = get_current_elofy_id()
      AND u.status = 'Ativo'
      AND u.elofy_id <> get_current_elofy_id()

    UNION ALL

    -- Níveis 2+: liderados dos liderados
    SELECT
      u.elofy_id,
      s.depth + 1
    FROM elofy_users u
    INNER JOIN subordinates s ON u.id_gestor = s.elofy_id
    WHERE u.status = 'Ativo'
      AND u.elofy_id <> u.id_gestor
      AND s.depth < 10
  )
  SELECT elofy_id, depth
  FROM subordinates;
$$;

COMMENT ON FUNCTION get_subordinates_recursive(text) IS
  'CTE recursiva sobre elofy_users.id_gestor. SEMPRE resolve a árvore do usuário '
  'autenticado via get_current_elofy_id() — o parâmetro manager_elofy_id é ignorado '
  'desde a migration 032 para impedir que um chamador consulte a árvore de outro gestor. '
  'Limitada a 10 níveis para evitar DoS por dados de hierarquia com ciclos.';

CREATE OR REPLACE FUNCTION get_bp_team_members(bp_auth_uid uuid DEFAULT auth.uid())
RETURNS TABLE(elofy_id text, team_elofy_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bp_teams AS (
    -- bp_auth_uid é ignorado: sempre a carteira do CHAMADOR (auth.uid())
    SELECT elofy_team_id
    FROM bp_team_assignments
    WHERE bp_user_id = auth.uid()
  ),
  all_teams AS (
    SELECT t.elofy_id AS team_id
    FROM elofy_teams t
    INNER JOIN bp_teams bt ON (
      t.elofy_id = bt.elofy_team_id
      OR t.id_time_pai = bt.elofy_team_id
    )
    WHERE t.status = 'Ativo'
  )
  SELECT
    u.elofy_id,
    u.id_time AS team_elofy_id
  FROM elofy_users u
  INNER JOIN all_teams at_ ON u.id_time = at_.team_id
  WHERE u.status = 'Ativo';
$$;

COMMENT ON FUNCTION get_bp_team_members(uuid) IS
  'Retorna colaboradores na carteira do BP autenticado. SEMPRE usa auth.uid() — o '
  'parâmetro bp_auth_uid é ignorado desde a migration 032 para impedir que um '
  'chamador consulte a carteira de outro BP.';

REVOKE EXECUTE ON FUNCTION get_subordinates_recursive(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_subordinates_recursive(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION get_bp_team_members(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_bp_team_members(uuid) TO authenticated;
