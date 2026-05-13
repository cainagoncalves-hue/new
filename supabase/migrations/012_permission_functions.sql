-- ============================================================
-- MIGRATION 012: Funções centrais de permissão
-- Todas são SECURITY DEFINER para evitar recursão em RLS
-- ============================================================

-- ------------------------------------------------------------
-- get_current_user_role()
-- Retorna o role do usuário autenticado (admin|bp|lider|diretor)
-- Retorna NULL se não cadastrado ou inativo
-- ------------------------------------------------------------
create or replace function get_current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from app_users
  where id = auth.uid()
    and is_active = true;
$$;

comment on function get_current_user_role() is
  'Retorna o role do usuário autenticado. STABLE permite cache dentro da transação. SECURITY DEFINER evita recursão em RLS.';

-- ------------------------------------------------------------
-- get_current_elofy_id()
-- Retorna o elofy_id vinculado ao usuário autenticado
-- ------------------------------------------------------------
create or replace function get_current_elofy_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select elofy_id
  from app_users
  where id = auth.uid()
    and is_active = true;
$$;

-- ------------------------------------------------------------
-- get_subordinates_recursive(manager_elofy_id text)
-- CTE recursiva: retorna TODOS os subordinados de um gestor
-- (diretos + indiretos em todos os níveis hierárquicos)
-- Usado pelo role Diretor
-- ------------------------------------------------------------
create or replace function get_subordinates_recursive(manager_elofy_id text)
returns table(elofy_id text, depth integer)
language sql
stable
security definer
set search_path = public
as $$
  with recursive subordinates as (
    -- Nível 1: liderados diretos
    select
      u.elofy_id,
      1 as depth
    from elofy_users u
    where u.id_gestor = manager_elofy_id
      and u.status = 'Ativo'
      and u.elofy_id <> manager_elofy_id  -- evita auto-referência

    union all

    -- Níveis 2+: liderados dos liderados
    select
      u.elofy_id,
      s.depth + 1
    from elofy_users u
    inner join subordinates s on u.id_gestor = s.elofy_id
    where u.status = 'Ativo'
      and u.elofy_id <> u.id_gestor       -- evita ciclos por dados inconsistentes
  )
  select elofy_id, depth
  from subordinates;
$$;

comment on function get_subordinates_recursive(text) is
  'CTE recursiva sobre elofy_users.id_gestor. Retorna toda a árvore abaixo do manager. Filtra apenas Ativos para evitar hierarquias penduradas por desligamentos.';

-- ------------------------------------------------------------
-- get_bp_team_members(bp_auth_uid uuid)
-- Retorna elofy_ids de colaboradores nos times da carteira do BP
-- Inclui sub-times de primeiro nível (filhos diretos na hierarquia)
-- ------------------------------------------------------------
create or replace function get_bp_team_members(bp_auth_uid uuid default auth.uid())
returns table(elofy_id text, team_elofy_id text)
language sql
stable
security definer
set search_path = public
as $$
  with bp_teams as (
    select elofy_team_id
    from bp_team_assignments
    where bp_user_id = bp_auth_uid
  ),
  -- Expande para incluir sub-times diretos (filhos na hierarquia de times)
  all_teams as (
    select t.elofy_id as team_id
    from elofy_teams t
    inner join bp_teams bt on (
      t.elofy_id = bt.elofy_team_id
      or t.id_time_pai = bt.elofy_team_id
    )
    where t.status = 'Ativo'
  )
  select
    u.elofy_id,
    u.id_time as team_elofy_id
  from elofy_users u
  inner join all_teams at_ on u.id_time = at_.team_id
  where u.status = 'Ativo';
$$;

comment on function get_bp_team_members(uuid) is
  'Retorna colaboradores na carteira do BP. Inclui sub-times de 1º nível. Para hierarquia mais profunda, expandir a CTE all_teams recursivamente.';

-- ------------------------------------------------------------
-- current_user_can_see_elofy_id(target_elofy_id text)
-- Função de conveniência usada nas policies RLS
-- Centraliza toda a lógica de permissão por role
-- ------------------------------------------------------------
create or replace function current_user_can_see_elofy_id(target_elofy_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role          text;
  v_my_elofy_id  text;
begin
  v_role         := get_current_user_role();
  v_my_elofy_id := get_current_elofy_id();

  -- Sem role = sem acesso
  if v_role is null then
    return false;
  end if;

  -- Admin vê tudo
  if v_role = 'admin' then
    return true;
  end if;

  -- Usuário sempre pode ver a si mesmo
  if target_elofy_id = v_my_elofy_id then
    return true;
  end if;

  -- Líder: apenas liderados diretos (id_gestor = meu elofy_id)
  if v_role = 'lider' then
    return exists (
      select 1 from elofy_users
      where elofy_id = target_elofy_id
        and id_gestor = v_my_elofy_id
        and status = 'Ativo'
    );
  end if;

  -- Diretor: toda a árvore abaixo (recursivo)
  if v_role = 'diretor' then
    return exists (
      select 1 from get_subordinates_recursive(v_my_elofy_id) s
      where s.elofy_id = target_elofy_id
    );
  end if;

  -- BP: colaboradores nos times da carteira
  if v_role = 'bp' then
    return exists (
      select 1 from get_bp_team_members()
      where elofy_id = target_elofy_id
    );
  end if;

  return false;
end;
$$;

comment on function current_user_can_see_elofy_id(text) is
  'Resolve permissão de acesso a um colaborador específico. Centraliza a lógica de todos os roles. Usada nas policies RLS das tabelas operacionais.';
