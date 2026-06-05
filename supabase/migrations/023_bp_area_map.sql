-- ============================================================
-- MIGRATION 023: bp_area_map — fonte de verdade área → BP
-- Substitui o BP_AREAS hardcoded no Next.js.
-- A tabela bp_gestor_map (020) passa a ser reconstruída
-- automaticamente após cada sync-estrutura.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabela principal: nome_time → bp
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bp_area_map (
  id         SERIAL PRIMARY KEY,
  nome_time  TEXT NOT NULL UNIQUE,
  bp         TEXT NOT NULL CHECK (bp IN ('caina', 'izabela', 'renata_paula')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bp_area_map_bp ON bp_area_map(bp);

-- ------------------------------------------------------------
-- 2. Seed com o mapeamento atual
-- ------------------------------------------------------------
INSERT INTO bp_area_map (nome_time, bp) VALUES
  -- Cainã · Comercial & Marketing
  ('DIRETORIA COMERCIAL',                    'caina'),
  ('DIRETORIA MARKETING',                    'caina'),
  ('MARKETING -  DIGITAL',                   'caina'),
  ('MARKETING -  EVENTOS',                   'caina'),
  ('PRÉ-VENDAS',                             'caina'),
  ('VENDAS INTERNAS',                        'caina'),
  ('REGIONAL BA',                            'caina'),
  ('REGIONAL ES',                            'caina'),
  ('REGIONAL GO',                            'caina'),
  ('REGIONAL MG',                            'caina'),
  ('REGIONAL MS',                            'caina'),
  ('REGIONAL MT',                            'caina'),
  ('REGIONAL NE',                            'caina'),
  ('REGIONAL PR',                            'caina'),
  ('REGIONAL RJ',                            'caina'),
  ('REGIONAL RS/SC',                         'caina'),
  ('REGIONAL SP',                            'caina'),
  -- Izabela · CX/CS & Financeiro
  ('CS',                                     'izabela'),
  ('CS - Time Aline',                        'izabela'),
  ('CS - Time Luana',                        'izabela'),
  ('CX',                                     'izabela'),
  ('CX - Reversão',                          'izabela'),
  ('CX - Time Gabriel',                      'izabela'),
  ('SUPORTE',                                'izabela'),
  ('SUPORTE - Time Edmilson',                'izabela'),
  ('SUPORTE - Time Enock',                   'izabela'),
  ('SUPORTE - Time Gabriela',                'izabela'),
  ('SUPORTE - Time Nathalia',                'izabela'),
  ('ADMINISTRATIVO/FINANCEIRO REC',          'izabela'),
  ('ADMINISTRATIVO/FINANCEIRO SP',           'izabela'),
  ('DIRETORIA FINANCEIRA',                   'izabela'),
  ('OSM',                                    'izabela'),
  ('SERVIÇOS GERAIS REC',                    'izabela'),
  ('SERVIÇOS GERAIS SP',                     'izabela'),
  ('DIRETORIA OPERAÇÕES',                    'izabela'),
  -- Renata/Paula · Tecnologia & RH
  ('DEV - Time Felipe',                      'renata_paula'),
  ('DEV - Time Gilmar',                      'renata_paula'),
  ('DEV - Time Jony',                        'renata_paula'),
  ('DEV - Time Leandro',                     'renata_paula'),
  ('DIRETORIA TECNOLOGIA',                   'renata_paula'),
  ('TI - INFRAESTRUTURA',                    'renata_paula'),
  ('PESQUISA & PRODUTO',                     'renata_paula'),
  ('NIX',                                    'renata_paula'),
  ('Recrutamento e Seleção',                 'renata_paula'),
  ('Desenvolvimento Humano Organizacional',  'renata_paula'),
  ('Departamento Pessoal',                   'renata_paula'),
  ('DIRETORIA GENTE & CULTURA',              'renata_paula')
ON CONFLICT (nome_time) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Função: reconstrói bp_gestor_map após cada sync
-- Lógica: um gestor pertence ao BP da maioria dos seus
-- liderados diretos ativos. Em caso de empate, o gestor
-- aparece nos dois BPs (comportamento correto para dropdowns).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION rebuild_bp_gestor_map()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove gestores que não existem mais como ativos
  DELETE FROM bp_gestor_map
  WHERE nome_gestor NOT IN (
    SELECT DISTINCT u.nome_gestor
    FROM elofy_users u
    WHERE u.status = 'Ativo'
      AND u.nome_gestor IS NOT NULL
      AND u.nome_gestor <> ''
  );

  -- Insere associações gestor → bp derivadas de bp_area_map
  -- (cada gestor fica visível no BP onde tem ao menos 1 liderado)
  INSERT INTO bp_gestor_map (nome_gestor, bp)
  SELECT DISTINCT u.nome_gestor, a.bp
  FROM elofy_users u
  JOIN bp_area_map a ON a.nome_time = u.nome_time
  WHERE u.status = 'Ativo'
    AND u.nome_gestor IS NOT NULL
    AND u.nome_gestor <> ''
  ON CONFLICT (nome_gestor, bp) DO NOTHING;
END;
$$;

-- ------------------------------------------------------------
-- 4. Primeira reconstrução (popula bp_gestor_map imediatamente)
-- ------------------------------------------------------------
SELECT rebuild_bp_gestor_map();
