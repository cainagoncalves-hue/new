-- ============================================================
-- MIGRATION 026: Adiciona parâmetro p_mes a get_iso_scores()
--
-- Quando p_mes (formato 'YYYY-MM') é fornecido:
--   · LNPS  → survey mais recente ATÉ o mês de referência (≤ p_mes)
--   · ISBE  → dado mais recente por líder/time ATÉ o mês de referência
--   · Turnover e CID F → filtrados pelo mês de referência exato
--
-- Quando p_mes é NULL (default) o comportamento é idêntico à migração 022.
-- Chamadas sem argumento (módulo ISO, hub) continuam funcionando.
-- ============================================================

-- Remove assinatura antiga (sem parâmetro) e eventual versão com parâmetro
DROP FUNCTION IF EXISTS get_iso_scores();
DROP FUNCTION IF EXISTS get_iso_scores(text);

CREATE OR REPLACE FUNCTION get_iso_scores(p_mes text DEFAULT NULL)
RETURNS TABLE (
  gestor_nome        text,
  area               text,
  headcount          bigint,
  turnover_score     numeric,
  turnover_rate      numeric,
  turnover_n         bigint,
  cidf_score         numeric,
  cidf_rate          numeric,
  cidf_n             bigint,
  lnps_raw           numeric,
  lnps_score         numeric,
  lnps_n             bigint,
  lnps_is_area_avg   boolean,
  lnps_area_label    text,
  isbe_raw           numeric,
  isbe_score         numeric,
  isbe_n             numeric,
  isbe_is_area_avg   boolean,
  isbe_area_label    text,
  perguntas_isbe     jsonb,
  iso_score          numeric,
  lnps_date          text,
  isbe_mes           text
)
LANGUAGE sql
STABLE
AS $$
WITH

-- ── Líderes ativos (headcount por gestor) ────────────────────────────────────
leaders AS (
  SELECT
    TRIM(nome_gestor)          AS gestor,
    TRIM(MIN(nome_time))       AS area,
    COUNT(*)                   AS n
  FROM elofy_users
  WHERE status = 'Ativo'
    AND nome_gestor IS NOT NULL AND nome_gestor <> ''
    AND lower(nome_gestor) NOT LIKE '%elofy%'
    AND nome NOT IN ('Z Elofy', 'Gente Cultura')
  GROUP BY TRIM(nome_gestor)
),

leader_teams AS (
  SELECT DISTINCT
    TRIM(nome_gestor)        AS gestor,
    lower(TRIM(nome_time))   AS team
  FROM elofy_users
  WHERE status = 'Ativo'
    AND nome_gestor IS NOT NULL AND nome_gestor <> ''
    AND lower(nome_gestor) NOT LIKE '%elofy%'
    AND nome NOT IN ('Z Elofy', 'Gente Cultura')
    AND nome_time IS NOT NULL AND nome_time <> ''
),

-- ── LNPS ─────────────────────────────────────────────────────────────────────
lnps_surveys_months AS (
  SELECT
    id_pesquisa,
    MAX(CASE
      WHEN data_envio_pesquisa ~ '^\d{4}-\d{2}' THEN LEFT(data_envio_pesquisa, 7)
      WHEN data_envio_pesquisa ~ '^\d{2}/\d{2}/\d{4}' THEN
        CONCAT(SUBSTR(data_envio_pesquisa, 7, 4), '-', SUBSTR(data_envio_pesquisa, 4, 2))
      ELSE ''
    END) AS month_key
  FROM elofy_survey_standard
  WHERE lower(nome_pesquisa) LIKE '%lnps%'
    AND data_envio_pesquisa IS NOT NULL
  GROUP BY id_pesquisa
),
-- MUDANÇA 1: limita ao survey mais recente ≤ p_mes quando informado
best_lnps AS (
  SELECT id_pesquisa, month_key
  FROM lnps_surveys_months
  WHERE month_key <> ''
    AND (p_mes IS NULL OR month_key <= p_mes)
  ORDER BY month_key DESC
  LIMIT 1
),

lnps_resp AS (
  SELECT
    s.nome_gestor                AS gestor,
    lower(TRIM(s.time))          AS team,
    CAST(s.resposta AS numeric)  AS score
  FROM elofy_survey_standard s
  JOIN best_lnps b ON s.id_pesquisa = b.id_pesquisa
  WHERE s.resposta ~ '^\d+(\.\d+)?$'
    AND CAST(s.resposta AS numeric) BETWEEN 0 AND 10
),

lnps_agg_gestor_raw AS (
  SELECT
    gestor,
    COUNT(*) AS n,
    (SUM(CASE WHEN score >= 9 THEN 1 ELSE 0 END)::numeric
     - SUM(CASE WHEN score <= 6 THEN 1 ELSE 0 END)::numeric
    ) / COUNT(*)::numeric * 100 AS nps_raw
  FROM lnps_resp
  WHERE gestor IS NOT NULL AND gestor <> ''
  GROUP BY gestor
),
lnps_by_gestor AS (
  SELECT gestor, n, nps_raw, (nps_raw + 100) / 2 AS nps_score
  FROM lnps_agg_gestor_raw
),

lnps_multi_team_agg AS (
  SELECT
    lt.gestor,
    COUNT(*) AS n,
    (SUM(CASE WHEN lr.score >= 9 THEN 1 ELSE 0 END)::numeric
     - SUM(CASE WHEN lr.score <= 6 THEN 1 ELSE 0 END)::numeric
    ) / COUNT(*)::numeric * 100 AS nps_raw
  FROM leader_teams lt
  JOIN lnps_resp lr ON lt.team = lr.team
  GROUP BY lt.gestor
  HAVING COUNT(*) > 0
),
lnps_multi_team_fallback AS (
  SELECT gestor, n, nps_raw, (nps_raw + 100) / 2 AS nps_score
  FROM lnps_multi_team_agg
),

-- ── ISBE ─────────────────────────────────────────────────────────────────────
isbe_dates_months AS (
  SELECT
    data_pulso,
    id_gestor,
    CASE
      WHEN data_pulso ~ '^\d{4}-\d{2}' THEN LEFT(data_pulso, 7)
      WHEN data_pulso ~ '^\d{2}/\d{2}/\d{4}' THEN
        CONCAT(SUBSTR(data_pulso, 7, 4), '-', SUBSTR(data_pulso, 4, 2))
      ELSE ''
    END AS month_key
  FROM elofy_survey_pulse
  WHERE lower(nome_pesquisa) LIKE '%bem estar%'
    AND data_pulso IS NOT NULL
    AND id_gestor IS NOT NULL AND id_gestor <> ''
),
-- MUDANÇA 2: mês mais recente global ≤ p_mes
latest_isbe_month AS (
  SELECT month_key FROM isbe_dates_months
  WHERE month_key <> ''
    AND (p_mes IS NULL OR month_key <= p_mes)
  ORDER BY month_key DESC LIMIT 1
),
-- MUDANÇA 3: mês mais recente por gestor ≤ p_mes
isbe_latest_per_gestor AS (
  SELECT id_gestor, MAX(month_key) AS latest_month
  FROM isbe_dates_months
  WHERE month_key <> ''
    AND (p_mes IS NULL OR month_key <= p_mes)
  GROUP BY id_gestor
),
isbe_latest_dates_per_gestor AS (
  SELECT DISTINCT d.id_gestor, d.data_pulso
  FROM isbe_dates_months d
  JOIN isbe_latest_per_gestor l
    ON d.id_gestor = l.id_gestor AND d.month_key = l.latest_month
),

isbe_raw_scores AS (
  SELECT
    p.id_gestor,
    NULLIF(p.gestor, '')         AS gestor_raw,
    lower(TRIM(p.time))          AS team,
    p.categoria_pergunta         AS categoria,
    p.pergunta,
    CASE
      WHEN p.score_resposta ~ '^\d+(\.\d+)?$'
        AND CAST(p.score_resposta AS numeric) BETWEEN 1 AND 4
        THEN CAST(p.score_resposta AS numeric)
      WHEN lower(trim(p.resposta)) = 'discordo totalmente'  THEN 1
      WHEN lower(trim(p.resposta)) = 'discordo'             THEN 2
      WHEN lower(trim(p.resposta)) = 'concordo'             THEN 3
      WHEN lower(trim(p.resposta)) = 'concordo totalmente'  THEN 4
      WHEN lower(trim(p.resposta)) = 'nunca'                THEN 1
      WHEN lower(trim(p.resposta)) = 'raramente'            THEN 2
      WHEN lower(trim(p.resposta)) = 'frequentemente'       THEN 3
      WHEN lower(trim(p.resposta)) = 'sempre'               THEN 4
      ELSE NULL
    END AS score
  FROM elofy_survey_pulse p
  JOIN isbe_latest_dates_per_gestor d
    ON p.id_gestor = d.id_gestor AND p.data_pulso = d.data_pulso
  WHERE lower(p.nome_pesquisa) LIKE '%bem estar%'
),

gestor_name_map AS (
  SELECT DISTINCT ON (id_gestor) id_gestor, gestor_raw AS nome
  FROM isbe_raw_scores
  WHERE id_gestor IS NOT NULL AND gestor_raw IS NOT NULL
  ORDER BY id_gestor
),

isbe_scored AS (
  SELECT
    COALESCE(r.gestor_raw, m.nome, '') AS gestor,
    r.team,
    r.categoria,
    r.pergunta,
    r.score
  FROM isbe_raw_scores r
  LEFT JOIN gestor_name_map m ON r.id_gestor = m.id_gestor
  WHERE r.score IS NOT NULL
),

isbe_by_gestor AS (
  SELECT gestor,
    AVG(score)                                                          AS avg_score,
    ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT pergunta), 0))      AS n_respondents
  FROM isbe_scored WHERE gestor <> ''
  GROUP BY gestor
),
isbe_per_q_gestor AS (
  SELECT gestor, categoria, pergunta, AVG(score) AS q_avg, COUNT(*) AS q_n
  FROM isbe_scored WHERE gestor <> ''
  GROUP BY gestor, categoria, pergunta
),
isbe_questions_gestor AS (
  SELECT gestor,
    jsonb_agg(jsonb_build_object(
      'pergunta', pergunta, 'categoria', categoria,
      'avgRaw',   ROUND(q_avg::numeric, 4),
      'score',    ROUND((((q_avg - 1) / 3.0) * 100)::numeric, 2),
      'n',        q_n
    ) ORDER BY categoria, pergunta) AS perguntas
  FROM isbe_per_q_gestor GROUP BY gestor
),

-- ── ISBE fallback por time ────────────────────────────────────────────────────
isbe_team_date_map AS (
  SELECT
    lower(TRIM(time))   AS team,
    data_pulso,
    CASE
      WHEN data_pulso ~ '^\d{4}-\d{2}' THEN LEFT(data_pulso, 7)
      WHEN data_pulso ~ '^\d{2}/\d{2}/\d{4}' THEN
        CONCAT(SUBSTR(data_pulso, 7, 4), '-', SUBSTR(data_pulso, 4, 2))
      ELSE ''
    END AS month_key
  FROM elofy_survey_pulse
  WHERE lower(nome_pesquisa) LIKE '%bem estar%'
    AND data_pulso IS NOT NULL
    AND time IS NOT NULL AND TRIM(time) <> ''
),
-- MUDANÇA 4: mês mais recente por time ≤ p_mes
isbe_team_latest AS (
  SELECT team, MAX(month_key) AS latest_month
  FROM isbe_team_date_map
  WHERE month_key <> ''
    AND (p_mes IS NULL OR month_key <= p_mes)
  GROUP BY team
),
isbe_team_latest_dates AS (
  SELECT DISTINCT d.team, d.data_pulso
  FROM isbe_team_date_map d
  JOIN isbe_team_latest l ON d.team = l.team AND d.month_key = l.latest_month
),
isbe_team_scores AS (
  SELECT
    lower(TRIM(p.time))    AS team,
    p.categoria_pergunta   AS categoria,
    p.pergunta,
    CASE
      WHEN p.score_resposta ~ '^\d+(\.\d+)?$'
        AND CAST(p.score_resposta AS numeric) BETWEEN 1 AND 4
        THEN CAST(p.score_resposta AS numeric)
      WHEN lower(trim(p.resposta)) = 'discordo totalmente'  THEN 1
      WHEN lower(trim(p.resposta)) = 'discordo'             THEN 2
      WHEN lower(trim(p.resposta)) = 'concordo'             THEN 3
      WHEN lower(trim(p.resposta)) = 'concordo totalmente'  THEN 4
      WHEN lower(trim(p.resposta)) = 'nunca'                THEN 1
      WHEN lower(trim(p.resposta)) = 'raramente'            THEN 2
      WHEN lower(trim(p.resposta)) = 'frequentemente'       THEN 3
      WHEN lower(trim(p.resposta)) = 'sempre'               THEN 4
      ELSE NULL
    END AS score
  FROM elofy_survey_pulse p
  JOIN isbe_team_latest_dates tld
    ON lower(TRIM(p.time)) = tld.team AND p.data_pulso = tld.data_pulso
  WHERE lower(p.nome_pesquisa) LIKE '%bem estar%'
),

isbe_multi_team_scored AS (
  SELECT lt.gestor, s.categoria, s.pergunta, s.score
  FROM leader_teams lt
  JOIN isbe_team_scores s ON lt.team = s.team
  WHERE s.score IS NOT NULL
),
isbe_multi_team_fallback AS (
  SELECT gestor,
    AVG(score)                                                          AS avg_score,
    ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT pergunta), 0))      AS n_respondents
  FROM isbe_multi_team_scored
  GROUP BY gestor
  HAVING COUNT(*) > 0
),
isbe_per_q_multi_team AS (
  SELECT gestor, categoria, pergunta, AVG(score) AS q_avg, COUNT(*) AS q_n
  FROM isbe_multi_team_scored
  GROUP BY gestor, categoria, pergunta
),
isbe_questions_multi_team AS (
  SELECT gestor,
    jsonb_agg(jsonb_build_object(
      'pergunta', pergunta, 'categoria', categoria,
      'avgRaw',   ROUND(q_avg::numeric, 4),
      'score',    ROUND((((q_avg - 1) / 3.0) * 100)::numeric, 2),
      'n',        q_n
    ) ORDER BY categoria, pergunta) AS perguntas
  FROM isbe_per_q_multi_team GROUP BY gestor
),

-- ── Turnover voluntário ───────────────────────────────────────────────────────
-- MUDANÇA 5: quando p_mes fornecido, filtra pelo mês exato de referência
turnover_cte AS (
  SELECT nome_gestor AS gestor, COUNT(*) AS n
  FROM manual_desligamentos
  WHERE tipo = 'voluntario'
    AND nome_gestor IS NOT NULL AND nome_gestor <> ''
    AND (p_mes IS NULL OR TO_CHAR(mes_referencia, 'YYYY-MM') = p_mes)
  GROUP BY nome_gestor
),

-- ── CID F ─────────────────────────────────────────────────────────────────────
-- MUDANÇA 6: quando p_mes fornecido, filtra pelo mês exato de referência
cidf_cte AS (
  SELECT nome_gestor AS gestor, COUNT(DISTINCT nome_colaborador) AS n
  FROM manual_cidf
  WHERE ausencia_cidf = true
    AND nome_gestor IS NOT NULL AND nome_gestor <> ''
    AND (p_mes IS NULL OR TO_CHAR(mes_referencia, 'YYYY-MM') = p_mes)
  GROUP BY nome_gestor
),

-- ── Score final por líder ─────────────────────────────────────────────────────
scores AS (
  SELECT
    l.gestor,
    l.area,
    l.n                                                                   AS hc,

    COALESCE(tv.n, 0)                                                     AS turnover_n,
    CASE WHEN l.n > 0 THEN COALESCE(tv.n, 0)::numeric / l.n ELSE NULL
    END                                                                    AS turnover_rate,
    CASE WHEN l.n > 0 THEN
      CASE WHEN COALESCE(tv.n, 0)::numeric / l.n <= 0.008
        THEN 100.0
        ELSE GREATEST(0, (0.008 / (COALESCE(tv.n, 0)::numeric / l.n)) * 100)
      END
    ELSE NULL END                                                          AS turnover_score,

    COALESCE(cf.n, 0)                                                     AS cidf_n,
    CASE WHEN l.n > 0 THEN COALESCE(cf.n, 0)::numeric / l.n ELSE NULL
    END                                                                    AS cidf_rate,
    CASE WHEN l.n > 0 THEN
      CASE WHEN COALESCE(cf.n, 0)::numeric / l.n <= 0.0015
        THEN 100.0
        ELSE GREATEST(0, (0.0015 / (COALESCE(cf.n, 0)::numeric / l.n)) * 100)
      END
    ELSE NULL END                                                          AS cidf_score,

    COALESCE(lg.nps_raw,   ltf.nps_raw)                                  AS lnps_raw,
    COALESCE(lg.nps_score, ltf.nps_score)                                 AS lnps_score,
    COALESCE(lg.n,         ltf.n, 0)                                      AS lnps_n,
    (lg.gestor IS NULL AND ltf.gestor IS NOT NULL)                        AS lnps_is_area_avg,
    CASE WHEN lg.gestor IS NULL AND ltf.gestor IS NOT NULL
         THEN l.area ELSE '' END                                           AS lnps_area_label,

    COALESCE(ig.avg_score, itf.avg_score)                                 AS isbe_raw_val,
    CASE
      WHEN ig.avg_score  IS NOT NULL THEN ((ig.avg_score  - 1) / 3.0) * 100
      WHEN itf.avg_score IS NOT NULL THEN ((itf.avg_score - 1) / 3.0) * 100
      ELSE NULL
    END                                                                    AS isbe_score,
    COALESCE(ig.n_respondents, itf.n_respondents, 0)                      AS isbe_n,
    (ig.gestor IS NULL AND itf.gestor IS NOT NULL)                        AS isbe_is_area_avg,
    CASE WHEN ig.gestor IS NULL AND itf.gestor IS NOT NULL
         THEN l.area ELSE '' END                                           AS isbe_area_label,
    COALESCE(iqg.perguntas, iqmt.perguntas, '[]'::jsonb)                  AS perguntas_isbe,

    (SELECT month_key FROM best_lnps        LIMIT 1)                      AS lnps_date,
    (SELECT month_key FROM latest_isbe_month LIMIT 1)                     AS isbe_mes

  FROM leaders l
  LEFT JOIN turnover_cte             tv   ON l.gestor = tv.gestor
  LEFT JOIN cidf_cte                 cf   ON l.gestor = cf.gestor
  LEFT JOIN lnps_by_gestor           lg   ON l.gestor = lg.gestor
  LEFT JOIN lnps_multi_team_fallback ltf  ON l.gestor = ltf.gestor  AND lg.gestor  IS NULL
  LEFT JOIN isbe_by_gestor           ig   ON l.gestor = ig.gestor
  LEFT JOIN isbe_multi_team_fallback itf  ON l.gestor = itf.gestor  AND ig.gestor  IS NULL
  LEFT JOIN isbe_questions_gestor    iqg  ON l.gestor = iqg.gestor
  LEFT JOIN isbe_questions_multi_team iqmt ON l.gestor = iqmt.gestor AND iqg.gestor IS NULL
)

SELECT
  s.gestor                                                AS gestor_nome,
  s.area,
  s.hc                                                    AS headcount,
  ROUND(s.turnover_score::numeric, 2)                    AS turnover_score,
  s.turnover_rate,
  s.turnover_n,
  ROUND(s.cidf_score::numeric, 2)                        AS cidf_score,
  s.cidf_rate,
  s.cidf_n,
  ROUND(s.lnps_raw::numeric, 2)                          AS lnps_raw,
  ROUND(s.lnps_score::numeric, 2)                        AS lnps_score,
  s.lnps_n,
  s.lnps_is_area_avg,
  s.lnps_area_label,
  ROUND(s.isbe_raw_val::numeric, 4)                      AS isbe_raw,
  ROUND(s.isbe_score::numeric, 2)                        AS isbe_score,
  s.isbe_n,
  s.isbe_is_area_avg,
  s.isbe_area_label,
  s.perguntas_isbe,
  CASE WHEN s.lnps_score IS NOT NULL OR s.isbe_score IS NOT NULL
            OR s.turnover_score IS NOT NULL OR s.cidf_score IS NOT NULL
    THEN ROUND((
      COALESCE(s.turnover_score, 100) * 0.10 +
      COALESCE(s.cidf_score,    100) * 0.10 +
      COALESCE(s.lnps_score,      0) * 0.40 +
      COALESCE(s.isbe_score,      0) * 0.40
    )::numeric)
    ELSE NULL
  END                                                     AS iso_score,
  s.lnps_date,
  s.isbe_mes
FROM scores s
ORDER BY iso_score DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION get_iso_scores(text) TO authenticated;
