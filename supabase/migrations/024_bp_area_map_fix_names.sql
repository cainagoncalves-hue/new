-- ============================================================
-- MIGRATION 024: Corrige nomes em bp_area_map
-- O seed original usava ALL CAPS; o Elofy usa Title Case.
-- Esta migration apaga tudo e reinserida com os nomes exatos
-- conforme retornados pela API do Elofy (elofy_users.nome_time).
-- ============================================================

TRUNCATE bp_area_map RESTART IDENTITY;

INSERT INTO bp_area_map (nome_time, bp) VALUES
  -- ── Cainã · Comercial & Marketing ──────────────────────────
  (' Growth',                                'caina'),
  ('Diretoria Comercial ',                   'caina'),
  ('Diretoria Marketing ',                   'caina'),
  ('Marketing Digital',                      'caina'),
  ('Marketing Eventos',                      'caina'),
  ('Comunicação Produto ',                   'caina'),
  ('Pré-vendas',                             'caina'),
  ('Vendas Internas - Leonardo ',            'caina'),
  ('Vendas Internas - Tomas ',              'caina'),
  ('Regional BA',                            'caina'),
  ('Regional ES',                            'caina'),
  ('Regional GO',                            'caina'),
  ('Regional MG ',                           'caina'),
  ('Regional MS',                            'caina'),
  ('Regional MT',                            'caina'),
  ('Regional NE',                            'caina'),
  ('Regional PR',                            'caina'),
  ('Regional RJ',                            'caina'),
  ('Regional RS/SC',                         'caina'),
  ('Regional SP',                            'caina'),
  -- ── Izabela · CX/CS & Financeiro ───────────────────────────
  ('CS',                                     'izabela'),
  ('CS - Reversão',                          'izabela'),
  ('CS - Time Aline',                        'izabela'),
  ('CS - Time Luana',                        'izabela'),
  ('CX',                                     'izabela'),
  ('Suporte',                                'izabela'),
  ('Suporte - Time Edmilson',                'izabela'),
  ('Suporte - Time Enock',                   'izabela'),
  ('Suporte - Time Gabriela',                'izabela'),
  ('Suporte - Time Nathalia',                'izabela'),
  ('Adm/Financeiro - Time Luciana',          'izabela'),
  ('Adm/Financeiro - Time Walquíra',         'izabela'),
  ('Diretoria Financeira',                   'izabela'),
  ('Controladoria ',                         'izabela'),
  ('OSM',                                    'izabela'),
  -- ── Renata/Paula · Tecnologia & RH ─────────────────────────
  ('DEV - Time Felipe',                      'renata_paula'),
  ('DEV - Time Gilmar',                      'renata_paula'),
  ('DEV - Time Jony',                        'renata_paula'),
  ('DEV - Time Leandro',                     'renata_paula'),
  ('Diretoria Tecnologia',                   'renata_paula'),
  ('TI - Infraestrutura',                    'renata_paula'),
  ('Pesquisa & Produto',                     'renata_paula'),
  ('NIX',                                    'renata_paula'),
  ('Recrutamento e Seleção',                 'renata_paula'),
  ('Desenvolvimento Humano Organizacional',  'renata_paula'),
  ('Departamento Pessoal',                   'renata_paula'),
  ('Diretoria Gente & Cultura',              'renata_paula')
  -- Ignorados (sem BP): 'ADMIN', 'Diretoria Geral'
ON CONFLICT (nome_time) DO UPDATE SET bp = EXCLUDED.bp;

-- Reconstrói bp_gestor_map com os nomes corretos
SELECT rebuild_bp_gestor_map();
