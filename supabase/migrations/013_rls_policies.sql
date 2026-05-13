-- ============================================================
-- MIGRATION 013: Row-Level Security em todas as tabelas
-- NOTA: service_role bypassa RLS automaticamente (sync das Edge Functions)
-- Padrão: RLS habilitado + default deny + policies explícitas
-- ============================================================

-- ============================================================
-- TABELAS DO SISTEMA (novas — migrations 011)
-- ============================================================

-- app_users: admin vê todos; usuário vê o próprio perfil
alter table app_users enable row level security;

create policy "app_users: admin ve todos"
  on app_users for select
  using (get_current_user_role() = 'admin');

create policy "app_users: usuario ve proprio perfil"
  on app_users for select
  using (id = auth.uid());

create policy "app_users: apenas admin insere"
  on app_users for insert
  with check (get_current_user_role() = 'admin');

create policy "app_users: apenas admin atualiza"
  on app_users for update
  using (get_current_user_role() = 'admin')
  with check (get_current_user_role() = 'admin');

-- bp_team_assignments: admin gerencia; BP vê sua própria carteira
alter table bp_team_assignments enable row level security;

create policy "bp_assignments: admin ve todos"
  on bp_team_assignments for select
  using (get_current_user_role() = 'admin');

create policy "bp_assignments: BP ve propria carteira"
  on bp_team_assignments for select
  using (
    get_current_user_role() = 'bp'
    and bp_user_id = auth.uid()
  );

create policy "bp_assignments: apenas admin modifica"
  on bp_team_assignments for all
  using (get_current_user_role() = 'admin')
  with check (get_current_user_role() = 'admin');

-- app_audit_log: admin vê todos; usuário vê os próprios; sem UPDATE/DELETE
alter table app_audit_log enable row level security;

create policy "audit_log: admin ve todos"
  on app_audit_log for select
  using (get_current_user_role() = 'admin');

create policy "audit_log: usuario ve proprios"
  on app_audit_log for select
  using (user_id = auth.uid());

-- Nenhuma policy de UPDATE ou DELETE: imutável por design via RLS
-- INSERT é feito via service_role (triggers e Edge Functions)

-- ============================================================
-- elofy_users — dados sensíveis (CPF, email, login)
-- ============================================================
alter table elofy_users enable row level security;

create policy "elofy_users: acesso por role"
  on elofy_users for select
  using (
    get_current_user_role() = 'admin'
    -- Líder: apenas liderados diretos
    or (
      get_current_user_role() = 'lider'
      and id_gestor = get_current_elofy_id()
    )
    -- Diretor: árvore recursiva completa
    or (
      get_current_user_role() = 'diretor'
      and elofy_id in (
        select s.elofy_id
        from get_subordinates_recursive(get_current_elofy_id()) s
      )
    )
    -- BP: colaboradores nos times da carteira
    or (
      get_current_user_role() = 'bp'
      and elofy_id in (
        select m.elofy_id from get_bp_team_members() m
      )
    )
    -- Qualquer role autenticado vê o próprio registro
    or elofy_id = get_current_elofy_id()
  );

-- Apenas Admin faz UPDATE manual (dados chegam via sync Elofy)
create policy "elofy_users: apenas admin atualiza"
  on elofy_users for update
  using (get_current_user_role() = 'admin')
  with check (get_current_user_role() = 'admin');

-- ============================================================
-- TABELAS ESTRUTURAIS — leitura ampla para todos os roles autenticados
-- (times, cargos, empresa são referências, não dados individuais)
-- ============================================================
alter table elofy_teams enable row level security;

create policy "elofy_teams: todos roles autenticados"
  on elofy_teams for select
  using (get_current_user_role() is not null);

alter table elofy_positions enable row level security;

create policy "elofy_positions: todos roles autenticados"
  on elofy_positions for select
  using (get_current_user_role() is not null);

alter table elofy_company enable row level security;

create policy "elofy_company: todos roles autenticados"
  on elofy_company for select
  using (get_current_user_role() is not null);

-- ============================================================
-- elofy_feedbacks — dado sensível: conteúdo de feedbacks individuais
-- Regra: vê feedbacks cujo destinatário esteja no escopo
-- ============================================================
alter table elofy_feedbacks enable row level security;

create policy "elofy_feedbacks: acesso por escopo do destinatario"
  on elofy_feedbacks for select
  using (
    get_current_user_role() = 'admin'
    -- Destinatário no escopo do usuário
    or current_user_can_see_elofy_id(id_usuario_destinatario)
    -- Líder/BP/Diretor que é o remetente (enviou o feedback)
    or (
      get_current_user_role() in ('lider', 'diretor', 'bp')
      and id_usuario_remetente = get_current_elofy_id()
    )
  );

-- ============================================================
-- elofy_one_one — reuniões 1:1
-- Regra: vê reuniões onde algum participante esteja no escopo
-- ============================================================
alter table elofy_one_one enable row level security;

create policy "elofy_one_one: acesso por escopo"
  on elofy_one_one for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_convidado)
    or current_user_can_see_elofy_id(id_usuario_remetente)
    -- Participante direto sempre vê suas reuniões
    or id_usuario_remetente = get_current_elofy_id()
    or id_usuario_convidado = get_current_elofy_id()
  );

-- ============================================================
-- elofy_survey_pulse — dado muito sensível: score individual de eNPS/LNPS
-- ============================================================
alter table elofy_survey_pulse enable row level security;

create policy "elofy_survey_pulse: acesso por escopo do respondente"
  on elofy_survey_pulse for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario)
  );

-- ============================================================
-- elofy_survey_standard — pesquisas padrão e enquetes
-- ============================================================
alter table elofy_survey_standard enable row level security;

create policy "elofy_survey_standard: acesso por escopo"
  on elofy_survey_standard for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario)
  );

-- ============================================================
-- elofy_survey_temporal — pesquisas 360° (respondente avalia avaliado)
-- ============================================================
alter table elofy_survey_temporal enable row level security;

create policy "elofy_survey_temporal: acesso por escopo"
  on elofy_survey_temporal for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_avaliado)
    or current_user_can_see_elofy_id(id_usuario_respondente)
  );

-- ============================================================
-- elofy_survey_dismiss — pesquisas de desligamento (muito sensível)
-- ============================================================
alter table elofy_survey_dismiss enable row level security;

create policy "elofy_survey_dismiss: acesso por escopo"
  on elofy_survey_dismiss for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_desligado)
  );

-- ============================================================
-- elofy_feelings — termômetro de sentimentos (dado sensível)
-- ============================================================
alter table elofy_feelings enable row level security;

create policy "elofy_feelings: acesso por escopo"
  on elofy_feelings for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario)
  );

-- ============================================================
-- AVALIAÇÕES DE DESEMPENHO — dados muito sensíveis
-- ============================================================
alter table elofy_cycle_review_public enable row level security;

create policy "cycle_review_public: acesso por escopo do avaliado"
  on elofy_cycle_review_public for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_avaliado)
  );

alter table elofy_cycle_review_detailed enable row level security;

create policy "cycle_review_detailed: acesso por escopo do avaliado"
  on elofy_cycle_review_detailed for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_avaliado)
  );

alter table elofy_cycle_review_ninebox enable row level security;

create policy "cycle_review_ninebox: acesso por escopo do avaliado"
  on elofy_cycle_review_ninebox for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_avaliado)
  );

alter table elofy_cycle_review_note_step enable row level security;

create policy "cycle_review_note_step: acesso por escopo do avaliado"
  on elofy_cycle_review_note_step for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_avaliado)
  );

alter table elofy_cycle_review_avg_competencies enable row level security;

create policy "cycle_avg_competencies: acesso por escopo do avaliado"
  on elofy_cycle_review_avg_competencies for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_avaliado)
  );

alter table elofy_cycle_review_avg_results enable row level security;

create policy "cycle_avg_results: acesso por escopo do avaliado"
  on elofy_cycle_review_avg_results for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_avaliado)
  );

-- Steps e Items: verificam via JOIN com o pai (cycle_review_detailed)
alter table elofy_cycle_review_steps enable row level security;

create policy "cycle_review_steps: acesso via avaliado do pai"
  on elofy_cycle_review_steps for select
  using (
    get_current_user_role() = 'admin'
    or exists (
      select 1 from elofy_cycle_review_detailed d
      where d.elofy_id = cycle_review_detailed_id
        and current_user_can_see_elofy_id(d.id_avaliado)
    )
  );

alter table elofy_cycle_review_items enable row level security;

create policy "cycle_review_items: acesso via avaliado do pai"
  on elofy_cycle_review_items for select
  using (
    get_current_user_role() = 'admin'
    or exists (
      select 1
      from elofy_cycle_review_steps s
      inner join elofy_cycle_review_detailed d
        on d.elofy_id = s.cycle_review_detailed_id
      where s.elofy_id = step_id
        and current_user_can_see_elofy_id(d.id_avaliado)
    )
  );

-- ============================================================
-- PDI E INICIATIVAS
-- ============================================================
alter table elofy_pdi enable row level security;

create policy "elofy_pdi: acesso por escopo do responsavel"
  on elofy_pdi for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

alter table elofy_initiatives enable row level security;

create policy "elofy_initiatives: acesso por escopo do responsavel"
  on elofy_initiatives for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

alter table elofy_initiatives_pdi enable row level security;

create policy "elofy_initiatives_pdi: acesso por escopo"
  on elofy_initiatives_pdi for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

alter table elofy_initiatives_one_one enable row level security;

create policy "elofy_initiatives_one_one: acesso por escopo"
  on elofy_initiatives_one_one for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

-- ============================================================
-- OKRs E METAS
-- ============================================================
alter table elofy_okrs_v2 enable row level security;

create policy "elofy_okrs_v2: acesso por escopo"
  on elofy_okrs_v2 for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

alter table elofy_goals_contract_v2 enable row level security;

create policy "elofy_goals_contract_v2: acesso por escopo"
  on elofy_goals_contract_v2 for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

alter table elofy_objectives enable row level security;

create policy "elofy_objectives: acesso por escopo"
  on elofy_objectives for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

alter table elofy_key_results enable row level security;

create policy "elofy_key_results: acesso por escopo"
  on elofy_key_results for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

alter table elofy_drivers enable row level security;

create policy "elofy_drivers: acesso por escopo"
  on elofy_drivers for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_responsavel)
  );

-- ============================================================
-- FEEDBACK SOCIAL — mural de elogios (menos sensível)
-- ============================================================
alter table elofy_praises_board enable row level security;

create policy "elofy_praises_board: acesso por escopo"
  on elofy_praises_board for select
  using (
    get_current_user_role() = 'admin'
    or current_user_can_see_elofy_id(id_usuario_elogiado)
    or current_user_can_see_elofy_id(id_usuario_remetente)
  );

-- ============================================================
-- TABELAS DE CICLOS/PERÍODOS/CONFIGURAÇÃO — leitura ampla
-- Dados de configuração sem PII individual
-- ============================================================
alter table elofy_surveys enable row level security;
create policy "elofy_surveys: todos roles autenticados"
  on elofy_surveys for select
  using (get_current_user_role() is not null);

alter table elofy_periods enable row level security;
create policy "elofy_periods: todos roles autenticados"
  on elofy_periods for select
  using (get_current_user_role() is not null);

alter table elofy_periods_detailed enable row level security;
create policy "elofy_periods_detailed: todos roles autenticados"
  on elofy_periods_detailed for select
  using (get_current_user_role() is not null);

alter table elofy_cycles enable row level security;
create policy "elofy_cycles: todos roles autenticados"
  on elofy_cycles for select
  using (get_current_user_role() is not null);

alter table elofy_cycle_review_config enable row level security;
create policy "elofy_cycle_review_config: todos roles autenticados"
  on elofy_cycle_review_config for select
  using (get_current_user_role() is not null);

alter table elofy_competencies enable row level security;
create policy "elofy_competencies: todos roles autenticados"
  on elofy_competencies for select
  using (get_current_user_role() is not null);

alter table elofy_base_indicators enable row level security;
create policy "elofy_base_indicators: todos roles autenticados"
  on elofy_base_indicators for select
  using (get_current_user_role() is not null);

-- ============================================================
-- SUCESSÃO — apenas Admin (dado estratégico sensível)
-- ============================================================
alter table elofy_succession enable row level security;
create policy "elofy_succession: apenas admin"
  on elofy_succession for select
  using (get_current_user_role() = 'admin');

-- ============================================================
-- OPERACIONAIS DO SISTEMA — apenas Admin
-- ============================================================
alter table elofy_sync_logs enable row level security;
create policy "elofy_sync_logs: apenas admin"
  on elofy_sync_logs for select
  using (get_current_user_role() = 'admin');

alter table elofy_integration_situation enable row level security;
create policy "integration_situation: apenas admin"
  on elofy_integration_situation for select
  using (get_current_user_role() = 'admin');

alter table elofy_integration_batch enable row level security;
create policy "integration_batch: apenas admin"
  on elofy_integration_batch for select
  using (get_current_user_role() = 'admin');
