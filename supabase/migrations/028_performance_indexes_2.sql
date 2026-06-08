-- ============================================================
-- MIGRATION 028: Índices de performance para queries de survey
-- e bp maps que estavam causando full table scans.
-- ============================================================

-- Habilita trigram (necessário para ILIKE '%xxx%' usar índice)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- elofy_survey_standard
-- Queries críticas: ILIKE '%lnps%', ILIKE '%enps%', eq(id_pesquisa),
-- ORDER BY data_envio_pesquisa — todas sem índice até agora.
-- ============================================================

-- GIN trigram: único tipo de índice que suporta substring ILIKE
CREATE INDEX IF NOT EXISTS idx_survey_standard_nome_pesquisa_trgm
  ON elofy_survey_standard USING GIN (nome_pesquisa gin_trgm_ops);

-- B-tree em id_pesquisa: usado em .eq("id_pesquisa", id) após encontrar o survey
CREATE INDEX IF NOT EXISTS idx_survey_standard_id_pesquisa
  ON elofy_survey_standard (id_pesquisa);

-- B-tree em data_envio_pesquisa: usado em ORDER BY e range queries
CREATE INDEX IF NOT EXISTS idx_survey_standard_data_envio
  ON elofy_survey_standard (data_envio_pesquisa DESC);

-- ============================================================
-- elofy_survey_pulse
-- Queries críticas no RPC get_iso_scores: ILIKE '%bem estar%'
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_survey_pulse_nome_pesquisa_trgm
  ON elofy_survey_pulse USING GIN (nome_pesquisa gin_trgm_ops);

-- ============================================================
-- elofy_users — índices compostos parciais para filtros de
-- nome_gestor e nome_time com status='Ativo' (padrão em todas
-- as queries de headcount, leader scope e CTE leaders do RPC)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_elofy_users_nome_gestor_status
  ON elofy_users (nome_gestor, status)
  WHERE status = 'Ativo';

CREATE INDEX IF NOT EXISTS idx_elofy_users_nome_time_status
  ON elofy_users (nome_time, status)
  WHERE status = 'Ativo';

-- ============================================================
-- bp_area_map e bp_gestor_map
-- Campos de lookup/JOIN sem índice na migration 018
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bp_area_map_nome_time
  ON bp_area_map (nome_time);

CREATE INDEX IF NOT EXISTS idx_bp_gestor_map_nome_gestor
  ON bp_gestor_map (nome_gestor);
