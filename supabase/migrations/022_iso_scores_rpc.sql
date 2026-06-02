-- ============================================================
-- MIGRATION 022: Função RPC get_iso_scores()
-- Move cálculos de ISO/ISBE do Next.js para o PostgreSQL.
-- Retorna 1 linha por líder ativo com todos os scores e
-- detalhamento ISBE por pergunta (JSONB).
--
-- NOTA: CTEs não podem ter o mesmo nome que colunas de
-- RETURNS TABLE (conflito de escopo no PostgreSQL). Por isso
-- headcount → leaders, turnover → turnover_cte, cidf → cidf_cte.
-- ============================================================

DROP FUNCTION IF EXISTS get_iso_scores();

CREATE OR REPLACE FUNCTION get_iso_scores()
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
-- Conta liderados ativos; exclui contas admin da plataforma Elofy.
-- CTE nomeada "leaders" (não "headcount") para evitar conflito com a
-- coluna de saída de mesmo nome na RETURNS TABLE.
leaders AS (
  SELECT
    nome_gestor            AS gestor,
    MIN(nome_time)         AS area,
    COUNT(*)               AS n
  FROM elofy_users
  WHERE status = 'Ativo'
    AND nome_gestor IS NOT NULL
    AND nome_gestor <> ''
    AND lower(nome_gestor) NOT LIKE '%elofy%'
    AND nome NOT IN ('Z Elofy', 'Gente Cultura')
  GROUP BY nome_gestor
),

-- ── LNPS — survey mais recente ────────────────────────────────────────────────
-- Converte data_envio_pesquisa → YYYY-MM (suporta yyyy-MM-dd e dd/MM/yyyy)
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
best_lnps AS (
  SELECT id_pesquisa, month_key
  FROM lnps_surveys_months
  WHERE month_key <> ''
  ORDER BY month_key DESC
  LIMIT 1
),

-- Respostas da survey LNPS mais recente (escala 0-10)
lnps_resp AS (
  SELECT
    s.nome_gestor               AS gestor,
    s.time                      AS team,
    CAST(s.resposta AS numeric) AS score
  FROM elofy_survey_standard s
  JOIN best_lnps b ON s.id_pesquisa = b.id_pesquisa
  WHERE s.resposta ~ '^\d+(\.\d+)?$'
    AND CAST(s.resposta AS numeric) BETWEEN 0 AND 10
),

-- NPS bruto por gestor: (promotores - detratores) / total × 100
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
-- Normalizado: (nps_raw + 100) / 2  →  escala 0-100
lnps_by_gestor AS (
  SELECT gestor, n, nps_raw, (nps_raw + 100) / 2 AS nps_score
  FROM lnps_agg_gestor_raw
),

-- Fallback: NPS por time (média da área)
lnps_agg_team_raw AS (
  SELECT
    team,
    COUNT(*) AS n,
    (SUM(CASE WHEN score >= 9 THEN 1 ELSE 0 END)::numeric
     - SUM(CASE WHEN score <= 6 THEN 1 ELSE 0 END)::numeric
    ) / COUNT(*)::numeric * 100 AS nps_raw
  FROM lnps_resp
  WHERE team IS NOT NULL AND team <> ''
  GROUP BY team
),
lnps_by_team AS (
  SELECT team, n, nps_raw, (nps_raw + 100) / 2 AS nps_score
  FROM lnps_agg_team_raw
),

-- ── ISBE — mês mais recente POR LÍDER ────────────────────────────────────────
-- Cada líder (id_gestor) usa seu próprio mês mais recente de dados ISBE.
-- Isso evita que um novo ciclo de survey (ex: mai/2026 com poucos respondentes)
-- oculte os dados de líderes que não participaram desse ciclo mas têm dados
-- em meses anteriores (ex: Anderson=mar/26, Gabriel=abr/26, Gilmar=abr/26).

-- Converte data_pulso → YYYY-MM (suporta yyyy-MM-dd e dd/MM/yyyy)
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
-- Mês mais recente global — usado no header da página (isbe_mes)
latest_isbe_month AS (
  SELECT month_key
  FROM isbe_dates_months
  WHERE month_key <> ''
  ORDER BY month_key DESC
  LIMIT 1
),
-- Mês mais recente por id_gestor
isbe_latest_per_gestor AS (
  SELECT id_gestor, MAX(month_key) AS latest_month
  FROM isbe_dates_months
  WHERE month_key <> ''
  GROUP BY id_gestor
),
-- data_pulso exatos de cada gestor no seu mês mais recente
isbe_latest_dates_per_gestor AS (
  SELECT DISTINCT d.id_gestor, d.data_pulso
  FROM isbe_dates_months d
  JOIN isbe_latest_per_gestor l
    ON d.id_gestor = l.id_gestor AND d.month_key = l.latest_month
),

-- Parse dos scores usando o mês mais recente de cada gestor
-- Tenta score_resposta numérico (1-4); fallback para mapeamento de texto
isbe_raw_scores AS (
  SELECT
    p.id_gestor,
    NULLIF(p.gestor, '')          AS gestor_raw,
    p.time                        AS team,
    p.categoria_pergunta          AS categoria,
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
  -- JOIN garante que cada líder usa apenas o seu mês mais recente
  JOIN isbe_latest_dates_per_gestor d
    ON p.id_gestor = d.id_gestor AND p.data_pulso = d.data_pulso
  WHERE lower(p.nome_pesquisa) LIKE '%bem estar%'
),

-- Resolve nome do gestor via id_gestor (quando a coluna gestor está vazia)
gestor_name_map AS (
  SELECT DISTINCT ON (id_gestor) id_gestor, gestor_raw AS nome
  FROM isbe_raw_scores
  WHERE id_gestor IS NOT NULL AND gestor_raw IS NOT NULL
  ORDER BY id_gestor
),

-- Linhas com score válido e nome do gestor resolvido
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

-- Agregação geral por gestor: score médio e contagem de respondentes
isbe_by_gestor AS (
  SELECT
    gestor,
    AVG(score)                                                         AS avg_score,
    ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT pergunta), 0))     AS n_respondents
  FROM isbe_scored
  WHERE gestor <> ''
  GROUP BY gestor
),

-- Detalhe por pergunta para o card expandido do líder
isbe_per_q_gestor AS (
  SELECT gestor, categoria, pergunta, AVG(score) AS q_avg, COUNT(*) AS q_n
  FROM isbe_scored
  WHERE gestor <> ''
  GROUP BY gestor, categoria, pergunta
),
isbe_questions_gestor AS (
  SELECT
    gestor,
    jsonb_agg(
      jsonb_build_object(
        'pergunta',  pergunta,
        'categoria', categoria,
        'avgRaw',    ROUND(q_avg::numeric, 4),
        'score',     ROUND((((q_avg - 1) / 3.0) * 100)::numeric, 2),
        'n',         q_n
      ) ORDER BY categoria, pergunta
    ) AS perguntas
  FROM isbe_per_q_gestor
  GROUP BY gestor
),

-- Fallback: ISBE por time (média da área)
isbe_by_team AS (
  SELECT
    team,
    AVG(score)                                                         AS avg_score,
    ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT pergunta), 0))     AS n_respondents
  FROM isbe_scored
  WHERE team IS NOT NULL AND team <> ''
  GROUP BY team
),
isbe_per_q_team AS (
  SELECT team, categoria, pergunta, AVG(score) AS q_avg, COUNT(*) AS q_n
  FROM isbe_scored
  WHERE team IS NOT NULL AND team <> ''
  GROUP BY team, categoria, pergunta
),
isbe_questions_team AS (
  SELECT
    team,
    jsonb_agg(
      jsonb_build_object(
        'pergunta',  pergunta,
        'categoria', categoria,
        'avgRaw',    ROUND(q_avg::numeric, 4),
        'score',     ROUND((((q_avg - 1) / 3.0) * 100)::numeric, 2),
        'n',         q_n
      ) ORDER BY categoria, pergunta
    ) AS perguntas
  FROM isbe_per_q_team
  GROUP BY team
),

-- ── Turnover voluntário ───────────────────────────────────────────────────────
-- CTE nomeada "turnover_cte" para evitar conflito com colunas de saída.
turnover_cte AS (
  SELECT nome_gestor AS gestor, COUNT(*) AS n
  FROM manual_desligamentos
  WHERE tipo = 'voluntario'
    AND nome_gestor IS NOT NULL AND nome_gestor <> ''
  GROUP BY nome_gestor
),

-- ── CID F ─────────────────────────────────────────────────────────────────────
-- CTE nomeada "cidf_cte" por consistência.
cidf_cte AS (
  SELECT nome_gestor AS gestor, COUNT(DISTINCT nome_colaborador) AS n
  FROM manual_cidf
  WHERE ausencia_cidf = true
    AND nome_gestor IS NOT NULL AND nome_gestor <> ''
  GROUP BY nome_gestor
),

-- ── Score final por líder ─────────────────────────────────────────────────────
scores AS (
  SELECT
    l.gestor,
    l.area,
    l.n                                                                   AS hc,

    -- Turnover
    COALESCE(tv.n, 0)                                                     AS turnover_n,
    CASE WHEN l.n > 0 THEN COALESCE(tv.n, 0)::numeric / l.n ELSE NULL
    END                                                                    AS turnover_rate,
    CASE WHEN l.n > 0 THEN
      CASE WHEN COALESCE(tv.n, 0)::numeric / l.n <= 0.008
        THEN 100.0
        ELSE GREATEST(0, (0.008 / (COALESCE(tv.n, 0)::numeric / l.n)) * 100)
      END
    ELSE NULL END                                                          AS turnover_score,

    -- CID F
    COALESCE(cf.n, 0)                                                     AS cidf_n,
    CASE WHEN l.n > 0 THEN COALESCE(cf.n, 0)::numeric / l.n ELSE NULL
    END                                                                    AS cidf_rate,
    CASE WHEN l.n > 0 THEN
      CASE WHEN COALESCE(cf.n, 0)::numeric / l.n <= 0.0015
        THEN 100.0
        ELSE GREATEST(0, (0.0015 / (COALESCE(cf.n, 0)::numeric / l.n)) * 100)
      END
    ELSE NULL END                                                          AS cidf_score,

    -- LNPS (com fallback para média da área)
    COALESCE(lg.nps_raw,   lt.nps_raw)                                   AS lnps_raw,
    COALESCE(lg.nps_score, lt.nps_score)                                  AS lnps_score,
    COALESCE(lg.n,         lt.n,  0)                                      AS lnps_n,
    (lg.gestor IS NULL AND lt.team IS NOT NULL)                           AS lnps_is_area_avg,
    CASE WHEN lg.gestor IS NULL AND lt.team IS NOT NULL THEN l.area
         ELSE '' END                                                       AS lnps_area_label,

    -- ISBE (com fallback para média da área)
    COALESCE(ig.avg_score, it.avg_score)                                  AS isbe_raw_val,
    CASE
      WHEN ig.avg_score IS NOT NULL THEN ((ig.avg_score - 1) / 3.0) * 100
      WHEN it.avg_score IS NOT NULL THEN ((it.avg_score - 1) / 3.0) * 100
      ELSE NULL
    END                                                                    AS isbe_score,
    COALESCE(ig.n_respondents, it.n_respondents, 0)                       AS isbe_n,
    (ig.gestor IS NULL AND it.team IS NOT NULL)                           AS isbe_is_area_avg,
    CASE WHEN ig.gestor IS NULL AND it.team IS NOT NULL THEN l.area
         ELSE '' END                                                       AS isbe_area_label,
    COALESCE(iq.perguntas, iqt.perguntas, '[]'::jsonb)                   AS perguntas_isbe,

    -- Metadados das pesquisas (iguais para todos os líderes)
    (SELECT month_key FROM best_lnps LIMIT 1)                             AS lnps_date,
    (SELECT month_key FROM latest_isbe_month LIMIT 1)                     AS isbe_mes

  FROM leaders l
  LEFT JOIN turnover_cte        tv  ON l.gestor = tv.gestor
  LEFT JOIN cidf_cte            cf  ON l.gestor = cf.gestor
  LEFT JOIN lnps_by_gestor      lg  ON l.gestor = lg.gestor
  LEFT JOIN lnps_by_team        lt  ON l.area   = lt.team AND lg.gestor IS NULL
  LEFT JOIN isbe_by_gestor      ig  ON l.gestor = ig.gestor
  LEFT JOIN isbe_by_team        it  ON l.area   = it.team AND ig.gestor IS NULL
  LEFT JOIN isbe_questions_gestor iq  ON l.gestor = iq.gestor
  LEFT JOIN isbe_questions_team   iqt ON l.area   = iqt.team AND iq.gestor IS NULL
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

GRANT EXECUTE ON FUNCTION get_iso_scores() TO authenticated;
