-- ============================================================
-- MIGRATION 029: Audit triggers para tabelas manual_*
-- Exigido pela LGPD Art. 37 — registro de operações de tratamento
-- Reutiliza a função audit_log_trigger() criada na migration 017
-- ============================================================

-- manual_desligamentos: registra quem criou/alterou/excluiu registros de desligamento
CREATE TRIGGER trg_audit_manual_desligamentos
  AFTER INSERT OR UPDATE OR DELETE ON manual_desligamentos
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- manual_cidf: dados sensíveis de saúde (CID F) — auditoria obrigatória (LGPD Art. 11)
CREATE TRIGGER trg_audit_manual_cidf
  AFTER INSERT OR UPDATE OR DELETE ON manual_cidf
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- manual_talentos_chave: mapeamento de talentos — rastreabilidade de alterações
CREATE TRIGGER trg_audit_manual_talentos
  AFTER INSERT OR UPDATE OR DELETE ON manual_talentos_chave
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- manual_img_indicadores: indicadores de gestão — rastreabilidade de preenchimento
CREATE TRIGGER trg_audit_manual_img
  AFTER INSERT OR UPDATE OR DELETE ON manual_img_indicadores
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
