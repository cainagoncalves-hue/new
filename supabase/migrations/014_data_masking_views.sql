-- ============================================================
-- MIGRATION 014: Mascaramento de dados sensíveis
-- Funções de mascaramento + views seguras para o frontend
-- IMPORTANTE: O frontend deve usar as views, não as tabelas brutas
-- ============================================================

-- ------------------------------------------------------------
-- Funções auxiliares de mascaramento
-- IMMUTABLE: resultado determinístico dado o mesmo input
-- ------------------------------------------------------------

-- mask_cpf: exibe apenas os 2 últimos dígitos
-- Entrada: "123.456.789-01" ou "12345678901"
-- Saída:   "***.***.***-01"
create or replace function mask_cpf(cpf text)
returns text
language sql
immutable
as $$
  select case
    when cpf is null then null
    when length(regexp_replace(cpf, '[^0-9]', '', 'g')) = 11
      then '***.***.***-' || right(regexp_replace(cpf, '[^0-9]', '', 'g'), 2)
    else '***masked***'
  end;
$$;

-- mask_email: preserva domínio, mascara usuário parcialmente
-- Entrada: "joao.silva@empresa.com"
-- Saída:   "jo***@empresa.com"
create or replace function mask_email(email text)
returns text
language sql
immutable
as $$
  select case
    when email is null then null
    when position('@' in email) > 2
      then left(email, 2) || '***' || substring(email from position('@' in email))
    when position('@' in email) > 0
      then '***' || substring(email from position('@' in email))
    else '***masked***'
  end;
$$;

-- ------------------------------------------------------------
-- VIEW: v_elofy_users
-- View principal de colaboradores com dados sensíveis mascarados
-- O frontend usa ESTA view, nunca a tabela elofy_users diretamente
--
-- security_invoker = true:
--   A view herda o contexto RLS do usuário autenticado.
--   Combinado com RLS em elofy_users, o usuário só vê
--   os registros que a policy permite E com campos mascarados.
-- ------------------------------------------------------------
create or replace view v_elofy_users
with (security_invoker = true)
as
select
  elofy_id,
  nome,
  matricula,
  status,
  data_admissao,
  data_desligamento,
  id_gestor,
  nome_gestor,
  -- Email mascarado para roles não-admin
  case
    when get_current_user_role() = 'admin' then email
    else mask_email(email)
  end as email,
  -- Login mascarado para roles não-admin
  case
    when get_current_user_role() = 'admin' then login
    else mask_email(login)
  end as login,
  tipo_cargo,
  id_cargo,
  cargo,
  nivel_responsabilidade,
  id_time,
  nome_time,
  -- CPF mascarado para roles não-admin
  case
    when get_current_user_role() = 'admin' then cpf
    else mask_cpf(cpf)
  end as cpf,
  colaborador_chave,
  id_empresa,
  synced_at
  -- raw_data omitido: pode conter campos extras sensíveis
from elofy_users;

comment on view v_elofy_users is
  'View segura de elofy_users. CPF e email mascarados para roles não-admin. RLS da tabela base é respeitado via security_invoker. Use esta view no frontend.';

-- ------------------------------------------------------------
-- VIEW: v_elofy_users_summary
-- Versão sem nenhum PII — apenas dados organizacionais
-- Ideal para dropdowns, autocomplete, listagens de seleção
-- ------------------------------------------------------------
create or replace view v_elofy_users_summary
with (security_invoker = true)
as
select
  elofy_id,
  nome,
  cargo,
  tipo_cargo,
  id_time,
  nome_time,
  id_gestor,
  nome_gestor,
  status
from elofy_users;

comment on view v_elofy_users_summary is
  'View sem PII para uso em dropdowns e seleção de colaboradores. Sem email, CPF ou login.';
