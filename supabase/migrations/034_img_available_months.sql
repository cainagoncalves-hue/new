-- ============================================================
-- MIGRATION 034: get_img_available_months — meses disponíveis no módulo IMG
--
-- Antes, o seletor de período do IMG só listava meses com upload manual
-- em manual_img_indicadores. Mas o pilar Pessoas inclui Acompanhamento
-- (feedback ou 1:1), que vem do sync automático da Elofy — então um mês
-- já deveria aparecer assim que houver QUALQUER dado relevante ao IMG,
-- não só depois do fechamento manual dos outros indicadores.
--
-- SECURITY INVOKER (padrão, sem DEFINER): cada UNION respeita o RLS da
-- tabela de origem, então o resultado já vem escopado para o usuário
-- chamador sem precisar reimplementar a lógica de escopo aqui.
-- ============================================================

CREATE OR REPLACE FUNCTION get_img_available_months()
RETURNS TABLE(mes_key text)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT to_char(mes_referencia, 'YYYY-MM') AS mes_key
  FROM manual_img_indicadores

  UNION

  SELECT DISTINCT to_char(data_feedback, 'YYYY-MM')
  FROM elofy_feedbacks
  WHERE data_feedback IS NOT NULL

  UNION

  SELECT DISTINCT to_char(data, 'YYYY-MM')
  FROM elofy_one_one
  WHERE data IS NOT NULL
    AND situacao = 'Realizada';
$$;

GRANT EXECUTE ON FUNCTION get_img_available_months() TO authenticated;
