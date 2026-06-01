-- ============================================================
-- MIGRATION 021: Tabelas de input manual para ISO e IMG
-- Turnover voluntário, CID F, Talentos Chave, Indicadores IMG
-- ============================================================

-- ------------------------------------------------------------
-- Desligamentos (Turnover Voluntário vs Involuntário)
-- Alimenta o índice de Turnover Voluntário do ISO (peso 10%)
-- Meta: ≤ 0,8% (desligamentos voluntários / headcount do gestor)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_desligamentos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_colaborador text NOT NULL,
  nome_gestor      text NOT NULL,
  mes_referencia   date NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('voluntario', 'involuntario')),
  justificativa    text,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desl_gestor_mes ON manual_desligamentos(nome_gestor, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_desl_tipo ON manual_desligamentos(tipo);

-- ------------------------------------------------------------
-- Absenteísmo CID F
-- Alimenta o índice de CID F do ISO (peso 10%)
-- Meta: ≤ 0,15% (colaboradores com CID F / headcount do gestor)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_cidf (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_gestor      text NOT NULL,
  nome_colaborador text NOT NULL,
  mes_referencia   date NOT NULL,
  ausencia_cidf    boolean NOT NULL DEFAULT true,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome_gestor, nome_colaborador, mes_referencia)
);

CREATE INDEX IF NOT EXISTS idx_cidf_gestor_mes ON manual_cidf(nome_gestor, mes_referencia);

-- ------------------------------------------------------------
-- Talentos Chave
-- Usado em ISO (contexto) e IMG (critério: talentos mapeados com plano)
-- Status médio do time compõe o score do gestor no IMG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_talentos_chave (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_colaborador text NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('performance', 'sucessao')),
  nome_gestor      text NOT NULL,
  plano_acao       text,
  status           text NOT NULL DEFAULT 'nao_iniciado'
                   CHECK (status IN ('nao_iniciado', 'em_andamento', 'concluido')),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_talentos_gestor ON manual_talentos_chave(nome_gestor);
CREATE INDEX IF NOT EXISTS idx_talentos_status ON manual_talentos_chave(status);

-- ------------------------------------------------------------
-- Indicadores IMG (preenchimento manual por gestor/mês)
-- Cada linha = um indicador de um gestor em um mês de referência
-- indicador: um dos critérios mensuráveis do IMG
-- valor_pct: 0-100 (percentual atingido)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_img_indicadores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_gestor      text NOT NULL,
  mes_referencia   date NOT NULL,
  indicador        text NOT NULL CHECK (indicador IN (
    'metas_registradas',      -- 100% colaboradores com metas
    'checkins_prazo',          -- Checkins realizados no prazo
    'reuniao_resultado',       -- Reunião de resultado realizada
    'rdm_prazo',               -- RDMs elaborados no prazo
    'headcount_previsto',      -- Headcount dentro do previsto (±5%)
    'custo_folha_previsto',    -- Custo de folha dentro do previsto (±5%)
    'atingimento_metas'        -- Atingimento das metas (mín. 80% do time)
  )),
  valor_pct        numeric(5,2) NOT NULL CHECK (valor_pct >= 0 AND valor_pct <= 100),
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome_gestor, mes_referencia, indicador)
);

CREATE INDEX IF NOT EXISTS idx_img_gestor_mes ON manual_img_indicadores(nome_gestor, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_img_indicador ON manual_img_indicadores(indicador);

-- ------------------------------------------------------------
-- Trigger: atualiza updated_at automaticamente em todas as tabelas
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_manual_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_desligamentos_updated_at
  BEFORE UPDATE ON manual_desligamentos
  FOR EACH ROW EXECUTE FUNCTION update_manual_updated_at();

CREATE TRIGGER trg_cidf_updated_at
  BEFORE UPDATE ON manual_cidf
  FOR EACH ROW EXECUTE FUNCTION update_manual_updated_at();

CREATE TRIGGER trg_talentos_updated_at
  BEFORE UPDATE ON manual_talentos_chave
  FOR EACH ROW EXECUTE FUNCTION update_manual_updated_at();

CREATE TRIGGER trg_img_updated_at
  BEFORE UPDATE ON manual_img_indicadores
  FOR EACH ROW EXECUTE FUNCTION update_manual_updated_at();

-- ------------------------------------------------------------
-- RLS: apenas admins podem INSERT/UPDATE/DELETE
--      leituras seguem a hierarquia de visibilidade
-- ------------------------------------------------------------
ALTER TABLE manual_desligamentos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_cidf             ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_talentos_chave   ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_img_indicadores  ENABLE ROW LEVEL SECURITY;

-- Admins: acesso total
CREATE POLICY "admin_all_desligamentos"   ON manual_desligamentos
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "admin_all_cidf"            ON manual_cidf
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "admin_all_talentos"        ON manual_talentos_chave
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "admin_all_img"             ON manual_img_indicadores
  USING (get_current_user_role() = 'admin')
  WITH CHECK (get_current_user_role() = 'admin');

-- BPs e Diretores: leitura dos registros do seu scope
CREATE POLICY "bp_read_desligamentos" ON manual_desligamentos
  FOR SELECT USING (
    get_current_user_role() IN ('bp', 'diretor', 'lider')
  );

CREATE POLICY "bp_read_cidf" ON manual_cidf
  FOR SELECT USING (
    get_current_user_role() IN ('bp', 'diretor', 'lider')
  );

CREATE POLICY "bp_read_talentos" ON manual_talentos_chave
  FOR SELECT USING (
    get_current_user_role() IN ('bp', 'diretor', 'lider')
  );

CREATE POLICY "bp_read_img" ON manual_img_indicadores
  FOR SELECT USING (
    get_current_user_role() IN ('bp', 'diretor', 'lider')
  );
