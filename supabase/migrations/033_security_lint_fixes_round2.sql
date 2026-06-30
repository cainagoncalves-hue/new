-- ============================================================
-- MIGRATION 033: Segunda rodada de correções do linter (pós 032)
--
-- 1. extension_in_public: a migration 028 instalou pg_trgm no schema
--    public sem especificar schema. Move para o schema extensions
--    (já presente em extra_search_path no config.toml).
--
-- 2. anon_security_definer_function_executable (residual): a 032 revogou
--    EXECUTE apenas de PUBLIC nessas 5 funções. O Supabase concede EXECUTE
--    em funções novas diretamente para anon/authenticated via uma regra de
--    "default privileges" do projeto — uma fonte de privilégio separada do
--    pseudo-role PUBLIC. Revogar de PUBLIC não desfaz uma concessão direta
--    a anon. Aqui revogamos de anon explicitamente, mantendo authenticated
--    (exigido pelas RLS policies que chamam essas funções diretamente).
-- ============================================================

-- ------------------------------------------------------------
-- 1. pg_trgm fora do schema public
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- ------------------------------------------------------------
-- 2. Revoga EXECUTE de anon explicitamente (não só de PUBLIC)
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION get_current_user_role()             FROM anon;
REVOKE EXECUTE ON FUNCTION get_current_elofy_id()              FROM anon;
REVOKE EXECUTE ON FUNCTION current_user_can_see_elofy_id(text) FROM anon;
REVOKE EXECUTE ON FUNCTION get_subordinates_recursive(text)    FROM anon;
REVOKE EXECUTE ON FUNCTION get_bp_team_members(uuid)           FROM anon;
