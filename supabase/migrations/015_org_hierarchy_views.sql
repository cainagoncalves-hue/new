-- ============================================================
-- MIGRATION 015: Views de hierarquia organizacional
-- ============================================================

-- ------------------------------------------------------------
-- VIEW: v_org_hierarchy
-- Árvore completa da organização com profundidade e caminho
-- security_invoker = true: herda RLS de elofy_users
-- Detecta e evita ciclos com array path[]
-- ------------------------------------------------------------
create or replace view v_org_hierarchy
with (security_invoker = true)
as
with recursive org_tree as (
  -- Raiz: usuários sem gestor ou com self-reference
  select
    u.elofy_id,
    u.nome,
    u.id_gestor,
    u.nome_gestor,
    u.cargo,
    u.tipo_cargo,
    u.id_time,
    u.nome_time,
    u.status,
    0 as depth,
    array[u.elofy_id] as path
  from elofy_users u
  where (
    u.id_gestor is null
    or u.id_gestor = ''
    or u.id_gestor = u.elofy_id
  )
  and u.status = 'Ativo'

  union all

  -- Subordinados recursivos
  select
    u.elofy_id,
    u.nome,
    u.id_gestor,
    u.nome_gestor,
    u.cargo,
    u.tipo_cargo,
    u.id_time,
    u.nome_time,
    u.status,
    ot.depth + 1,
    ot.path || u.elofy_id
  from elofy_users u
  inner join org_tree ot on u.id_gestor = ot.elofy_id
  where u.status = 'Ativo'
    -- Proteção anti-ciclo: só continua se não visitou este nó
    and not (u.elofy_id = any(ot.path))
)
select
  elofy_id,
  nome,
  id_gestor,
  nome_gestor,
  cargo,
  tipo_cargo,
  id_time,
  nome_time,
  depth,
  path,
  array_length(path, 1) - 1 as nivel_hierarquico
from org_tree;

comment on view v_org_hierarchy is
  'Árvore org completa com depth e path[]. Proteção anti-ciclo via array. security_invoker herda RLS de elofy_users — cada usuário só vê a sub-árvore do seu escopo.';

-- ------------------------------------------------------------
-- VIEW: v_team_hierarchy
-- Hierarquia de times com headcount direto
-- ------------------------------------------------------------
create or replace view v_team_hierarchy
with (security_invoker = true)
as
with recursive team_tree as (
  -- Raiz: times sem time-pai
  select
    t.elofy_id,
    t.nome,
    t.status,
    t.id_responsavel,
    t.nome_responsavel,
    t.id_time_pai,
    t.nome_time_pai,
    0 as depth,
    array[t.elofy_id] as path
  from elofy_teams t
  where (t.id_time_pai is null or t.id_time_pai = '')
    and t.status = 'Ativo'

  union all

  -- Sub-times
  select
    t.elofy_id,
    t.nome,
    t.status,
    t.id_responsavel,
    t.nome_responsavel,
    t.id_time_pai,
    t.nome_time_pai,
    tt.depth + 1,
    tt.path || t.elofy_id
  from elofy_teams t
  inner join team_tree tt on t.id_time_pai = tt.elofy_id
  where t.status = 'Ativo'
    and not (t.elofy_id = any(tt.path))
),
member_count as (
  select id_time, count(*) as headcount
  from elofy_users
  where status = 'Ativo'
  group by id_time
)
select
  tt.elofy_id,
  tt.nome,
  tt.id_responsavel,
  tt.nome_responsavel,
  tt.id_time_pai,
  tt.nome_time_pai,
  tt.depth,
  tt.path,
  coalesce(mc.headcount, 0) as headcount_direto
from team_tree tt
left join member_count mc on mc.id_time = tt.elofy_id;

comment on view v_team_hierarchy is
  'Hierarquia de times com profundidade e headcount direto. Útil para navegação de estrutura e filtros do Admin.';

-- ------------------------------------------------------------
-- VIEW: v_leaders_summary
-- Visão consolidada dos líderes: headcount, times e gestor imediato
-- Útil para filtros de seleção de líder nos dashboards
-- ------------------------------------------------------------
create or replace view v_leaders_summary
with (security_invoker = true)
as
select
  u.elofy_id,
  u.nome,
  u.cargo,
  u.id_time,
  u.nome_time,
  u.id_gestor,
  u.nome_gestor,
  u.status,
  coalesce(liderados.headcount, 0) as headcount_liderados
from elofy_users u
left join (
  select id_gestor, count(*) as headcount
  from elofy_users
  where status = 'Ativo'
    and id_gestor is not null
    and id_gestor <> ''
  group by id_gestor
) liderados on liderados.id_gestor = u.elofy_id
where u.tipo_cargo = 'Gestor'
  and u.status = 'Ativo';

comment on view v_leaders_summary is
  'Visão dos líderes com contagem de liderados diretos. Para dropdowns de filtro nos dashboards.';
