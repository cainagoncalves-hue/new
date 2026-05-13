-- ============================================================
-- MIGRATION 016: Views analíticas para os dashboards
-- DEVE ser executada APÓS migrations 011-015
-- ============================================================

-- ------------------------------------------------------------
-- Função auxiliar: cast seguro para numeric
-- PostgreSQL não tem TRY_CAST nativo — esta função retorna NULL
-- em vez de erro quando o texto não é um número válido
-- ------------------------------------------------------------
create or replace function try_cast_numeric(v text)
returns numeric
language plpgsql
immutable
as $$
begin
  return v::numeric;
exception when others then
  return null;
end;
$$;

-- ============================================================
-- MATERIALIZED VIEW: mv_enps_by_team
-- eNPS calculado por time, gestor e período de pesquisa
-- Fórmula NPS: (% Promotores - % Detratores) × 100
-- Promotores: score 9-10 | Neutros: 7-8 | Detratores: 0-6
--
-- NOTA: Materialized Views não suportam RLS diretamente.
-- A view wrapper v_enps_by_team aplica o filtro de escopo.
-- Refresh: agendar via pg_cron após o sync diário da Elofy.
-- ============================================================
create materialized view if not exists mv_enps_by_team as
with scores as (
  select
    sp.id_pesquisa,
    sp.nome_pesquisa,
    sp.categoria_pergunta,
    sp.id_time,
    sp.time                                as nome_time,
    sp.id_gestor,
    sp.gestor,
    sp.data_pulso,
    try_cast_numeric(sp.score_resposta)    as score_num
  from elofy_survey_pulse sp
  where sp.score_resposta ~ '^[0-9]+(\.[0-9]+)?$'
),
categorized as (
  select
    id_pesquisa,
    nome_pesquisa,
    categoria_pergunta,
    id_time,
    nome_time,
    id_gestor,
    gestor,
    -- Agrupa por mês de referência (data_pulso pode ser text ou date)
    left(data_pulso, 7)                    as mes_ano,  -- formato YYYY-MM
    count(*)                               as total_respondentes,
    count(*) filter (where score_num >= 9) as promotores,
    count(*) filter (where score_num <= 6) as detratores,
    count(*) filter (where score_num between 7 and 8) as neutros
  from scores
  where score_num is not null
  group by 1, 2, 3, 4, 5, 6, 7, 8
)
select
  id_pesquisa,
  nome_pesquisa,
  categoria_pergunta,
  id_time,
  nome_time,
  id_gestor,
  gestor,
  mes_ano,
  total_respondentes,
  promotores,
  detratores,
  neutros,
  -- Score NPS: intervalo -100 a +100
  round(
    (promotores::numeric / nullif(total_respondentes, 0) * 100)
    - (detratores::numeric / nullif(total_respondentes, 0) * 100),
    1
  ) as nps_score
from categorized;

create index if not exists idx_mv_enps_time    on mv_enps_by_team(id_time);
create index if not exists idx_mv_enps_gestor  on mv_enps_by_team(id_gestor);
create index if not exists idx_mv_enps_mes     on mv_enps_by_team(mes_ano);
create index if not exists idx_mv_enps_pesq    on mv_enps_by_team(id_pesquisa);

-- ------------------------------------------------------------
-- VIEW: v_enps_by_team
-- Wrapper com RLS sobre mv_enps_by_team
-- Aplica filtro de escopo conforme o role do usuário autenticado
-- ------------------------------------------------------------
create or replace view v_enps_by_team
with (security_invoker = true)
as
select e.*
from mv_enps_by_team e
where
  get_current_user_role() = 'admin'
  -- Líder: apenas os times dos seus liderados
  or (
    get_current_user_role() = 'lider'
    and e.id_gestor = get_current_elofy_id()
  )
  -- Diretor: times de toda a árvore abaixo dele
  or (
    get_current_user_role() = 'diretor'
    and e.id_time in (
      select u.id_time from elofy_users u
      where u.elofy_id in (
        select s.elofy_id
        from get_subordinates_recursive(get_current_elofy_id()) s
      )
      and u.status = 'Ativo'
    )
  )
  -- BP: times da carteira
  or (
    get_current_user_role() = 'bp'
    and e.id_time in (
      select m.team_elofy_id from get_bp_team_members() m
    )
  );

comment on view v_enps_by_team is
  'Wrapper com escopo sobre mv_enps_by_team. Usa security_invoker para herdar context do usuário. A MV não suporta RLS diretamente.';

-- ============================================================
-- VIEW: v_feedback_summary
-- Volume de feedbacks por mês, time e gestor
-- Dashboard: Feedback
-- ============================================================
create or replace view v_feedback_summary
with (security_invoker = true)
as
select
  f.id_usuario_destinatario,
  f.usuario_destinatario,
  f.cargo_destinatario,
  f.time_destinatario,
  f.id_usuario_remetente,
  f.usuario_remetente,
  f.tipo_feedback,
  f.acao,
  f.data_feedback,
  left(f.data_feedback::text, 7)  as mes_ano,
  u.id_time,
  u.nome_time,
  u.id_gestor,
  u.nome_gestor
from elofy_feedbacks f
left join elofy_users u on u.elofy_id = f.id_usuario_destinatario;

comment on view v_feedback_summary is
  'Feedbacks com contexto de time e gestor do destinatário. Usar GROUP BY no cliente para agregação por período.';

-- ------------------------------------------------------------
-- VIEW: v_feedback_volume
-- Versão pré-agregada: volume por mês, time e gestor
-- ------------------------------------------------------------
create or replace view v_feedback_volume
with (security_invoker = true)
as
select
  left(f.data_feedback::text, 7)  as mes_ano,
  u.id_time,
  u.nome_time,
  u.id_gestor,
  u.nome_gestor,
  f.tipo_feedback,
  count(*)                         as total_feedbacks,
  count(distinct f.id_usuario_destinatario) as colaboradores_com_feedback
from elofy_feedbacks f
left join elofy_users u on u.elofy_id = f.id_usuario_destinatario
group by 1, 2, 3, 4, 5, 6;

-- ============================================================
-- VIEW: v_one_one_summary
-- Resumo de reuniões 1:1 por gestor e liderado
-- Dashboard: Reuniões 1:1
-- ============================================================
create or replace view v_one_one_summary
with (security_invoker = true)
as
select
  o.id_usuario_remetente,
  o.nome_usuario_remetente,
  o.id_usuario_convidado,
  o.nome_usuario_convidado,
  o.data,
  left(o.data::text, 7)           as mes_ano,
  o.duracao,
  o.situacao,
  o.motivo,
  u_gestor.id_time                as id_time_gestor,
  u_gestor.nome_time              as nome_time_gestor,
  u_gestor.id_gestor              as id_gestor_do_gestor
from elofy_one_one o
left join elofy_users u_gestor on u_gestor.elofy_id = o.id_usuario_remetente;

-- ------------------------------------------------------------
-- VIEW: v_one_one_volume
-- Versão pré-agregada para KPIs mensais
-- ------------------------------------------------------------
create or replace view v_one_one_volume
with (security_invoker = true)
as
select
  left(o.data::text, 7)           as mes_ano,
  o.id_usuario_remetente          as id_gestor,
  o.nome_usuario_remetente        as nome_gestor,
  u.id_time,
  u.nome_time,
  count(*)                         as total_reunioes,
  count(*) filter (where o.situacao = 'Realizada') as realizadas,
  count(*) filter (where o.situacao = 'Cancelada') as canceladas,
  sum(o.duracao)                   as duracao_total_min,
  round(avg(o.duracao)::numeric, 0) as duracao_media_min
from elofy_one_one o
left join elofy_users u on u.elofy_id = o.id_usuario_remetente
group by 1, 2, 3, 4, 5;

-- ============================================================
-- VIEW: v_headcount_by_team
-- Headcount atual por time e gestor
-- Dashboard: Hub Central (KPI)
-- ============================================================
create or replace view v_headcount_by_team
with (security_invoker = true)
as
select
  u.id_time,
  u.nome_time,
  u.id_gestor,
  u.nome_gestor,
  count(*)                                          as headcount,
  count(*) filter (where u.tipo_cargo = 'Gestor')  as count_gestores,
  count(*) filter (where u.tipo_cargo = 'Contribuidor') as count_contribuidores
from elofy_users u
where u.status = 'Ativo'
group by u.id_time, u.nome_time, u.id_gestor, u.nome_gestor;

-- ============================================================
-- VIEW: v_pdi_summary
-- Resumo de PDI por colaborador
-- Dashboard: IMG / PDI
-- ============================================================
create or replace view v_pdi_summary
with (security_invoker = true)
as
select
  p.id_responsavel,
  p.responsavel,
  p.time_responsavel,
  p.cargo_responsavel,
  u.id_gestor,
  u.nome_gestor,
  u.id_time,
  count(*)                                            as total_pdis,
  count(*) filter (where p.status_pdi ilike '%andamento%') as pdis_em_andamento,
  count(*) filter (where p.status_pdi ilike '%conclu%')    as pdis_concluidos,
  round(avg(try_cast_numeric(p.progresso_pdi)), 1)   as progresso_medio_pct
from elofy_pdi p
left join elofy_users u on u.elofy_id = p.id_responsavel
group by p.id_responsavel, p.responsavel, p.time_responsavel, p.cargo_responsavel,
         u.id_gestor, u.nome_gestor, u.id_time;

-- ============================================================
-- VIEW: v_okr_summary
-- Resumo de OKRs por responsável
-- Dashboard: IMG / OKRs
-- ============================================================
create or replace view v_okr_summary
with (security_invoker = true)
as
select
  o.id_responsavel,
  o.nome_responsavel,
  o.nome_time_responsavel,
  o.cargo,
  o.id_periodo,
  o.periodo,
  u.id_gestor,
  u.nome_gestor,
  u.id_time,
  count(*)                                         as total_objetivos,
  count(*) filter (where o.ativo = 'true')         as objetivos_ativos,
  round(avg(try_cast_numeric(o.progresso)), 1)     as progresso_medio_pct
from elofy_okrs_v2 o
left join elofy_users u on u.elofy_id = o.id_responsavel
group by o.id_responsavel, o.nome_responsavel, o.nome_time_responsavel,
         o.cargo, o.id_periodo, o.periodo, u.id_gestor, u.nome_gestor, u.id_time;

-- ============================================================
-- VIEW: v_ninebox_current
-- Posicionamento mais recente no 9-box por colaborador
-- Dashboard: Mapeamento de Talentos
-- ============================================================
create or replace view v_ninebox_current
with (security_invoker = true)
as
select distinct on (n.id_usuario_avaliado)
  n.id_usuario_avaliado,
  n.nome_usuario_avaliado,
  n.id_gestor,
  n.nome_gestor,
  n.id_revisao_ciclo,
  n.nome_revisao,
  n.periodo,
  n.media_final_ciclo,
  n.quadrante_nbox,
  n.quadrante_nbox_calibrado,
  n.pessoa_chave,
  n.talento,
  n.singular,
  u.id_time,
  u.nome_time,
  u.cargo as cargo_atual,
  u.status
from elofy_cycle_review_ninebox n
left join elofy_users u on u.elofy_id = n.id_usuario_avaliado
order by n.id_usuario_avaliado, n.data_fim desc nulls last;

comment on view v_ninebox_current is
  'Posição 9-box mais recente por colaborador (DISTINCT ON + ORDER BY data_fim DESC). Inclui quadrante calibrado quando disponível.';

-- ============================================================
-- VIEW: v_feelings_summary
-- Sentimentos por período, time e gestor
-- Dashboard: ISO (Saúde Organizacional)
-- ============================================================
create or replace view v_feelings_summary
with (security_invoker = true)
as
select
  f.id_time,
  f.time                         as nome_time,
  f.id_gestor,
  f.gestor,
  f.tipo_sentimento,
  left(f.data_criacao, 7)        as mes_ano,
  count(*)                        as quantidade
from elofy_feelings f
where f.data_criacao is not null
  and f.data_criacao <> ''
group by 1, 2, 3, 4, 5, 6;

-- ============================================================
-- VIEW: v_hub_kpis
-- KPIs consolidados para o Hub Central
-- Valores calculados no escopo do usuário autenticado
-- ============================================================
create or replace view v_hub_kpis
with (security_invoker = true)
as
select
  -- Headcount total visível para o usuário (via RLS de elofy_users)
  (
    select count(*)
    from elofy_users
    where status = 'Ativo'
  ) as headcount_ativo,

  -- Feedbacks do mês corrente (via RLS de elofy_feedbacks)
  (
    select count(*)
    from elofy_feedbacks
    where data_feedback >= date_trunc('month', current_date)::date
  ) as feedbacks_mes,

  -- Colaboradores únicos que receberam feedback no mês
  (
    select count(distinct id_usuario_destinatario)
    from elofy_feedbacks
    where data_feedback >= date_trunc('month', current_date)::date
  ) as colaboradores_com_feedback_mes,

  -- 1:1s realizados no mês corrente
  (
    select count(*)
    from elofy_one_one
    where data >= date_trunc('month', current_date)::date
      and situacao = 'Realizada'
  ) as one_ones_realizados_mes,

  -- Score médio de pulse no mês (eNPS/LNPS geral visível)
  (
    select round(avg(try_cast_numeric(score_resposta)), 1)
    from elofy_survey_pulse
    where score_resposta ~ '^[0-9]+(\.[0-9]+)?$'
      and left(data_pulso, 7) = to_char(current_date, 'YYYY-MM')
  ) as score_medio_pulse_mes,

  current_date as data_referencia;

comment on view v_hub_kpis is
  'KPIs agregados do hub. Como usa security_invoker, os counts são calculados sobre os dados visíveis para o usuário autenticado (RLS aplicado).';
