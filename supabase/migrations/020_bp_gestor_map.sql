-- ============================================================
-- MIGRATION 020: Mapeamento gestor → Business Partner
-- Permite filtrar colaboradores acompanhados por BP responsável
-- ============================================================

CREATE TABLE IF NOT EXISTS bp_gestor_map (
  id          SERIAL PRIMARY KEY,
  nome_gestor TEXT NOT NULL,
  bp          TEXT NOT NULL,  -- 'caina' | 'izabela' | 'renata_paula'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nome_gestor, bp)
);

-- Seed: extraído de elofy_users usando o mapeamento time → BP existente
INSERT INTO bp_gestor_map (nome_gestor, bp)
SELECT DISTINCT nome_gestor, 'caina' AS bp
FROM elofy_users
WHERE nome_time IN (
  'DIRETORIA COMERCIAL','DIRETORIA MARKETING','MARKETING -  DIGITAL',
  'MARKETING -  EVENTOS','PRÉ-VENDAS','VENDAS INTERNAS','REGIONAL BA',
  'REGIONAL ES','REGIONAL GO','REGIONAL MG','REGIONAL MS','REGIONAL MT',
  'REGIONAL NE','REGIONAL PR','REGIONAL RJ','REGIONAL RS/SC','REGIONAL SP'
)
  AND nome_gestor IS NOT NULL AND nome_gestor <> '' AND status = 'Ativo'

UNION

SELECT DISTINCT nome_gestor, 'izabela' AS bp
FROM elofy_users
WHERE nome_time IN (
  'CS','CS - Time Aline','CS - Time Luana','CX','CX - Reversão','CX - Time Gabriel',
  'SUPORTE','SUPORTE - Time Edmilson','SUPORTE - Time Enock','SUPORTE - Time Gabriela',
  'SUPORTE - Time Nathalia','ADMINISTRATIVO/FINANCEIRO REC','ADMINISTRATIVO/FINANCEIRO SP',
  'DIRETORIA FINANCEIRA','OSM','SERVIÇOS GERAIS REC','SERVIÇOS GERAIS SP','DIRETORIA OPERAÇÕES'
)
  AND nome_gestor IS NOT NULL AND nome_gestor <> '' AND status = 'Ativo'

UNION

SELECT DISTINCT nome_gestor, 'renata_paula' AS bp
FROM elofy_users
WHERE nome_time IN (
  'DEV - Time Felipe','DEV - Time Gilmar','DEV - Time Jony','DEV - Time Leandro',
  'DIRETORIA TECNOLOGIA','TI - INFRAESTRUTURA','PESQUISA & PRODUTO','NIX',
  'Recrutamento e Seleção','Desenvolvimento Humano Organizacional',
  'Departamento Pessoal','DIRETORIA GENTE & CULTURA'
)
  AND nome_gestor IS NOT NULL AND nome_gestor <> '' AND status = 'Ativo'

ON CONFLICT (nome_gestor, bp) DO NOTHING;
