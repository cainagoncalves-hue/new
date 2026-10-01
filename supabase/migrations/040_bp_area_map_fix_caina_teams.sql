-- ============================================================
-- MIGRATION 040: corrige mapeamento bp_area_map do BP Cainã
--
-- Problema 1 (mismatch de espaço): "Diretoria Marketing" e
-- "Marketing - Time Kalinna" estavam cadastrados sem o espaço
-- em branco no final que o nome do time realmente tem em
-- elofy_users ("Diretoria Marketing ", "Marketing - Time
-- Kalinna "). Como o match é por igualdade exata de string, os
-- líderes desses times (Adriano Ferreira, Kalinna Da Silva
-- Santos) sumiam silenciosamente de qualquer página filtrada
-- pelo BP Cainã (NPS, ISO, Feedback, Home).
--
-- Problema 2 (time nunca cadastrado): "Time Rober" e "Time
-- Lincoln " (subtimes de Regional SP, liderados por Roberval
-- Bruno Dos Santos e Lincoln Henry Augusto, que reportam a Jorge
-- Do Nascimento Junior — já no BP Cainã) nunca foram incluídos
-- em bp_area_map.
--
-- Confirmado com o usuário: Irla Barbosa De Miranda / "Reputacao
-- de Marca" NÃO faz parte da estrutura de Marketing/Comercial —
-- não entra no BP Cainã.
-- ============================================================

UPDATE bp_area_map SET nome_time = 'Diretoria Marketing '
  WHERE nome_time = 'Diretoria Marketing' AND bp = 'caina';

UPDATE bp_area_map SET nome_time = 'Marketing - Time Kalinna '
  WHERE nome_time = 'Marketing - Time Kalinna' AND bp = 'caina';

INSERT INTO bp_area_map (nome_time, bp) VALUES
  ('Time Rober', 'caina'),
  ('Time Lincoln ', 'caina')
ON CONFLICT (nome_time) DO NOTHING;

-- Recria a função (idempotente, mesma definição da 035) e roda na hora,
-- pra bp_gestor_map refletir a correção imediatamente em vez de só no
-- próximo sync-estrutura.
CREATE OR REPLACE FUNCTION rebuild_bp_gestor_map()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE bp_gestor_map;

  INSERT INTO bp_gestor_map (nome_gestor, bp)
  SELECT DISTINCT u.nome_gestor, a.bp
  FROM elofy_users u
  JOIN bp_area_map a ON a.nome_time = u.nome_time
  WHERE u.status = 'Ativo'
    AND u.nome_gestor IS NOT NULL
    AND u.nome_gestor <> '';
END;
$$;

SELECT rebuild_bp_gestor_map();
