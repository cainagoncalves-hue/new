-- Situação de integrações
create table if not exists elofy_integration_situation (
  id                                  uuid primary key default gen_random_uuid(),
  elofy_id                            text unique not null,
  id_lote                             text,
  codigo_movimento                    text,
  codigo_empresa                      text,
  matricula                           text,
  cpf                                 text,
  email_usuario                       text,
  login                               text,
  tipo_usuario                        text,
  nome_completo                       text,
  data_admissao                       text,
  data_desligamento                   text,
  data_nascimento                     text,
  cod_gestor                          text,
  nivel                               text,
  multi_usuario                       text,
  codigo_unidade_funcional            text,
  nome_unidade_funcional              text,
  codigo_unidade_pai                  text,
  codigo_primeiro_gestor_uf           text,
  codigo_segundo_gestor_uf            text,
  atualiza_gestor_colaboradores       text,
  codigo_cargo                        text,
  nome_cargo                          text,
  nome_classificacao                  text,
  situacao_processamento              text,
  mensagem                            text,
  raw_data                            jsonb,
  synced_at                           timestamptz default now()
);

-- Lote de integrações
create table if not exists elofy_integration_batch (
  id                            uuid primary key default gen_random_uuid(),
  elofy_id                      text unique not null,
  codigo_grupo_economico        text,
  data_inicio                   text,
  data_fim                      text,
  qtd_registros_integrados      integer,
  situacao_lote                 text,
  raw_data                      jsonb,
  synced_at                     timestamptz default now()
);
