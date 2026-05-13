-- ============================================================
-- MIGRATION 018: Índices de performance para suporte ao RLS
-- Todos os índices são idempotentes (IF NOT EXISTS)
-- Índices parciais WHERE status = 'Ativo' reduzem tamanho e
-- aceleram as queries que sempre filtram por colaboradores ativos
-- ============================================================

-- ============================================================
-- elofy_users — coluna mais consultada em todas as policies RLS
-- ============================================================

-- id_gestor: usado em queries de lider (diretos) e hierarquia recursiva
create index if not exists idx_elofy_users_id_gestor
  on elofy_users(id_gestor)
  where status = 'Ativo';

-- id_time: usado em queries de BP e headcount
create index if not exists idx_elofy_users_id_time
  on elofy_users(id_time)
  where status = 'Ativo';

-- elofy_id + status: consulta composta nas funções de permissão
create index if not exists idx_elofy_users_elofy_id_status
  on elofy_users(elofy_id, status);

-- status: filtros gerais de headcount
create index if not exists idx_elofy_users_status
  on elofy_users(status);

-- tipo_cargo: filtros de gestores vs. contribuidores
create index if not exists idx_elofy_users_tipo_cargo
  on elofy_users(tipo_cargo)
  where status = 'Ativo';

-- ============================================================
-- elofy_feedbacks — lookup por participantes e data
-- ============================================================
create index if not exists idx_feedbacks_destinatario
  on elofy_feedbacks(id_usuario_destinatario);

create index if not exists idx_feedbacks_remetente
  on elofy_feedbacks(id_usuario_remetente);

create index if not exists idx_feedbacks_data
  on elofy_feedbacks(data_feedback desc);

-- ============================================================
-- elofy_one_one — lookup por participantes e data
-- ============================================================
create index if not exists idx_one_one_convidado
  on elofy_one_one(id_usuario_convidado);

create index if not exists idx_one_one_remetente
  on elofy_one_one(id_usuario_remetente);

create index if not exists idx_one_one_data
  on elofy_one_one(data desc);

-- ============================================================
-- elofy_survey_pulse — lookup por respondente, gestor e time
-- ============================================================
create index if not exists idx_survey_pulse_usuario
  on elofy_survey_pulse(id_usuario);

create index if not exists idx_survey_pulse_gestor
  on elofy_survey_pulse(id_gestor);

create index if not exists idx_survey_pulse_time
  on elofy_survey_pulse(id_time);

create index if not exists idx_survey_pulse_data
  on elofy_survey_pulse(data_pulso);

-- ============================================================
-- elofy_survey_standard / temporal / dismiss
-- ============================================================
create index if not exists idx_survey_standard_usuario
  on elofy_survey_standard(id_usuario);

create index if not exists idx_survey_temporal_avaliado
  on elofy_survey_temporal(id_usuario_avaliado);

create index if not exists idx_survey_temporal_respondente
  on elofy_survey_temporal(id_usuario_respondente);

create index if not exists idx_survey_dismiss_desligado
  on elofy_survey_dismiss(id_usuario_desligado);

-- ============================================================
-- elofy_feelings — lookup por usuário e gestor
-- ============================================================
create index if not exists idx_feelings_usuario
  on elofy_feelings(id_usuario);

create index if not exists idx_feelings_gestor
  on elofy_feelings(id_gestor);

create index if not exists idx_feelings_time
  on elofy_feelings(id_time);

-- ============================================================
-- AVALIAÇÕES — lookup por avaliado
-- ============================================================
create index if not exists idx_cycle_review_public_avaliado
  on elofy_cycle_review_public(id_usuario_avaliado);

create index if not exists idx_cycle_review_detailed_avaliado
  on elofy_cycle_review_detailed(id_avaliado);

-- Lookup no JOIN de steps → detailed
create index if not exists idx_cycle_review_steps_detailed_id
  on elofy_cycle_review_steps(cycle_review_detailed_id);

-- Lookup no JOIN de items → steps
create index if not exists idx_cycle_review_items_step_id
  on elofy_cycle_review_items(step_id);

create index if not exists idx_cycle_ninebox_avaliado
  on elofy_cycle_review_ninebox(id_usuario_avaliado);

create index if not exists idx_cycle_ninebox_data_fim
  on elofy_cycle_review_ninebox(id_usuario_avaliado, data_fim desc);

create index if not exists idx_cycle_note_step_avaliado
  on elofy_cycle_review_note_step(id_usuario_avaliado);

create index if not exists idx_cycle_avg_comp_avaliado
  on elofy_cycle_review_avg_competencies(id_usuario_avaliado);

create index if not exists idx_cycle_avg_results_avaliado
  on elofy_cycle_review_avg_results(id_usuario_avaliado);

-- ============================================================
-- PDI E INICIATIVAS — lookup por responsável
-- ============================================================
create index if not exists idx_pdi_responsavel
  on elofy_pdi(id_responsavel);

create index if not exists idx_initiatives_responsavel
  on elofy_initiatives(id_responsavel);

create index if not exists idx_initiatives_pdi_responsavel
  on elofy_initiatives_pdi(id_responsavel);

create index if not exists idx_initiatives_one_one_responsavel
  on elofy_initiatives_one_one(id_responsavel);

-- ============================================================
-- OKRs E METAS — lookup por responsável
-- ============================================================
create index if not exists idx_okrs_responsavel
  on elofy_okrs_v2(id_responsavel);

create index if not exists idx_goals_contract_responsavel
  on elofy_goals_contract_v2(id_responsavel);

create index if not exists idx_objectives_responsavel
  on elofy_objectives(id_responsavel);

create index if not exists idx_key_results_responsavel
  on elofy_key_results(id_responsavel);

create index if not exists idx_drivers_responsavel
  on elofy_drivers(id_responsavel);

-- ============================================================
-- ELOGIOS — lookup por usuário elogiado e remetente
-- ============================================================
create index if not exists idx_praises_elogiado
  on elofy_praises_board(id_usuario_elogiado);

create index if not exists idx_praises_remetente
  on elofy_praises_board(id_usuario_remetente);

-- ============================================================
-- app_audit_log — já tem índices na migration 011
-- Adicionar índice composto para queries de auditoria por tabela + data
-- ============================================================
create index if not exists idx_audit_log_table_created
  on app_audit_log(table_name, created_at desc)
  where action in ('UPDATE', 'DELETE');
