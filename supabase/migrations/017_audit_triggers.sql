-- ============================================================
-- MIGRATION 017: Triggers de audit log automático
-- Registra modificações nas tabelas críticas em app_audit_log
-- ============================================================

-- ------------------------------------------------------------
-- Função genérica de audit (trigger handler)
-- Funciona como trigger AFTER em qualquer tabela com coluna `id`
-- raw_data é excluído do log para evitar registros gigantes
-- ------------------------------------------------------------
create or replace function audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old      jsonb;
  v_new      jsonb;
  v_record_id text;
begin
  -- Capturar valores e ID do registro
  if TG_OP = 'DELETE' then
    v_old       := to_jsonb(old) - 'raw_data';
    v_new       := null;
    v_record_id := (to_jsonb(old)->>'id')::text;
  elsif TG_OP = 'INSERT' then
    v_old       := null;
    v_new       := to_jsonb(new) - 'raw_data';
    v_record_id := (to_jsonb(new)->>'id')::text;
  else -- UPDATE
    v_old       := to_jsonb(old) - 'raw_data';
    v_new       := to_jsonb(new) - 'raw_data';
    v_record_id := (to_jsonb(new)->>'id')::text;
  end if;

  insert into app_audit_log (
    user_id,
    user_role,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    created_at
  ) values (
    auth.uid(),
    get_current_user_role(),
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new,
    now()
  );

  return coalesce(new, old);
end;
$$;

comment on function audit_log_trigger() is
  'Trigger handler genérico para app_audit_log. Exclui raw_data do log para manter tamanho razoável. Usa SECURITY DEFINER para garantir permissão de INSERT em app_audit_log.';

-- ------------------------------------------------------------
-- Aplicar triggers nas tabelas do sistema
-- Todas as operações (INSERT + UPDATE + DELETE)
-- ------------------------------------------------------------

-- app_users: qualquer modificação de usuário do sistema
create trigger trg_audit_app_users
  after insert or update or delete on app_users
  for each row execute function audit_log_trigger();

-- bp_team_assignments: mudanças nas carteiras dos BPs
create trigger trg_audit_bp_assignments
  after insert or update or delete on bp_team_assignments
  for each row execute function audit_log_trigger();

-- ------------------------------------------------------------
-- elofy_users: apenas UPDATE
-- INSERT e DELETE são operações do sync automatizado (service_role)
-- e não precisam ser auditadas como ação de usuário
-- ------------------------------------------------------------
create trigger trg_audit_elofy_users_update
  after update on elofy_users
  for each row execute function audit_log_trigger();
