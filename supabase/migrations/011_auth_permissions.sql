-- ============================================================
-- MIGRATION 011: Sistema de autenticação e permissões
-- Tabelas: app_users, bp_team_assignments, app_audit_log
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TABELA: app_users
-- Vincula auth.users (Supabase Auth) a elofy_users e define role
-- ------------------------------------------------------------
create table if not exists app_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  elofy_id      text unique references elofy_users(elofy_id) on delete set null,
  role          text not null check (role in ('admin', 'bp', 'lider', 'diretor')),
  display_name  text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column app_users.role is
  'admin: acesso total. bp: carteira de times configurada. lider: liderados diretos. diretor: arvore recursiva completa.';

comment on column app_users.elofy_id is
  'Pode ser NULL para admins externos nao cadastrados como colaboradores Elofy.';

create index if not exists idx_app_users_elofy_id on app_users(elofy_id);
create index if not exists idx_app_users_role on app_users(role);

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_app_users_updated_at
  before update on app_users
  for each row execute function update_updated_at_column();

-- ------------------------------------------------------------
-- TABELA: bp_team_assignments
-- Carteira de times de cada Business Partner — configurada pelo Admin
-- ------------------------------------------------------------
create table if not exists bp_team_assignments (
  id              uuid primary key default gen_random_uuid(),
  bp_user_id      uuid not null references app_users(id) on delete cascade,
  elofy_team_id   text not null references elofy_teams(elofy_id) on delete cascade,
  assigned_by     uuid references app_users(id) on delete set null,
  assigned_at     timestamptz not null default now(),
  unique (bp_user_id, elofy_team_id)
);

comment on table bp_team_assignments is
  'Atribuições de times a BPs. Apenas usuários com role=bp são válidos em bp_user_id (validado por trigger).';

create index if not exists idx_bp_assignments_bp_user on bp_team_assignments(bp_user_id);
create index if not exists idx_bp_assignments_team on bp_team_assignments(elofy_team_id);

-- Garante que apenas usuários com role='bp' recebam atribuições
create or replace function check_bp_role()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from app_users
    where id = new.bp_user_id and role = 'bp'
  ) then
    raise exception 'bp_user_id deve referenciar um usuário com role = ''bp''';
  end if;
  return new;
end;
$$;

create trigger trg_bp_assignment_role_check
  before insert or update on bp_team_assignments
  for each row execute function check_bp_role();

-- ------------------------------------------------------------
-- TABELA: app_audit_log
-- Registro imutável de acessos e modificações — sem UPDATE/DELETE por design
-- ------------------------------------------------------------
create table if not exists app_audit_log (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  user_role   text,
  action      text not null check (action in (
    'SELECT', 'INSERT', 'UPDATE', 'DELETE',
    'LOGIN', 'LOGOUT', 'PERMISSION_DENIED'
  )),
  table_name  text,
  record_id   text,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

comment on table app_audit_log is
  'Audit log imutável. Nenhuma policy de UPDATE ou DELETE existe nesta tabela. Inserções via triggers e Edge Functions usando service_role.';

create index if not exists idx_audit_log_user on app_audit_log(user_id, created_at desc);
create index if not exists idx_audit_log_table on app_audit_log(table_name, created_at desc);
create index if not exists idx_audit_log_action on app_audit_log(action, created_at desc);
create index if not exists idx_audit_log_created on app_audit_log(created_at desc);
