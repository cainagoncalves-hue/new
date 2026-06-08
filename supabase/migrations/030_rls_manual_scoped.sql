-- ============================================================
-- MIGRATION 030: RLS com escopo nas tabelas manual_*
-- Substitui as policies de leitura genéricas (qualquer role vê tudo)
-- por policies que respeitam a hierarquia de visibilidade via
-- current_user_can_see_elofy_id() — mesma função usada nas tabelas elofy_*
-- ============================================================

-- ── manual_desligamentos ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bp_read_desligamentos" ON manual_desligamentos;

CREATE POLICY "scoped_read_desligamentos" ON manual_desligamentos
  FOR SELECT USING (
    get_current_user_role() = 'admin'
    OR (
      get_current_user_role() IN ('bp', 'diretor', 'lider')
      AND current_user_can_see_elofy_id(
        -- Traduz nome_gestor para elofy_id para verificar escopo de acesso
        (SELECT elofy_id FROM elofy_users
         WHERE nome = nome_gestor AND status = 'Ativo'
         LIMIT 1)
      )
    )
  );

-- ── manual_cidf ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bp_read_cidf" ON manual_cidf;

CREATE POLICY "scoped_read_cidf" ON manual_cidf
  FOR SELECT USING (
    get_current_user_role() = 'admin'
    OR (
      get_current_user_role() IN ('bp', 'diretor', 'lider')
      AND current_user_can_see_elofy_id(
        (SELECT elofy_id FROM elofy_users
         WHERE nome = nome_gestor AND status = 'Ativo'
         LIMIT 1)
      )
    )
  );

-- ── manual_talentos_chave ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "bp_read_talentos" ON manual_talentos_chave;

CREATE POLICY "scoped_read_talentos" ON manual_talentos_chave
  FOR SELECT USING (
    get_current_user_role() = 'admin'
    OR (
      get_current_user_role() IN ('bp', 'diretor', 'lider')
      AND current_user_can_see_elofy_id(
        (SELECT elofy_id FROM elofy_users
         WHERE nome = nome_gestor AND status = 'Ativo'
         LIMIT 1)
      )
    )
  );

-- ── manual_img_indicadores ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "bp_read_img" ON manual_img_indicadores;

CREATE POLICY "scoped_read_img" ON manual_img_indicadores
  FOR SELECT USING (
    get_current_user_role() = 'admin'
    OR (
      get_current_user_role() IN ('bp', 'diretor', 'lider')
      AND current_user_can_see_elofy_id(
        (SELECT elofy_id FROM elofy_users
         WHERE nome = nome_gestor AND status = 'Ativo'
         LIMIT 1)
      )
    )
  );
