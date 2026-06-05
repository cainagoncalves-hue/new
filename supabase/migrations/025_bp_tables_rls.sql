-- ============================================================
-- MIGRATION 025: RLS + GRANTs para bp_area_map e bp_gestor_map
-- Sem isso, usuários autenticados recebem array vazio e o filtro
-- gera WHERE nome_time IN () → zero resultados.
-- ============================================================

-- ------------------------------------------------------------
-- bp_area_map: leitura livre para qualquer usuário autenticado
-- (dados não sensíveis — apenas mapeamento área→BP)
-- ------------------------------------------------------------
GRANT SELECT ON bp_area_map TO anon, authenticated;

ALTER TABLE bp_area_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bp_area_map_select_all"
  ON bp_area_map FOR SELECT
  USING (true);

-- ------------------------------------------------------------
-- bp_gestor_map: idem
-- ------------------------------------------------------------
GRANT SELECT ON bp_gestor_map TO anon, authenticated;

ALTER TABLE bp_gestor_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bp_gestor_map_select_all"
  ON bp_gestor_map FOR SELECT
  USING (true);
