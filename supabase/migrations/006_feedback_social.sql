-- Feedbacks
create table if not exists elofy_feedbacks (
  id                            uuid primary key default gen_random_uuid(),
  elofy_id                      text unique not null,
  id_empresa                    text,
  acao                          text,
  data_feedback                 date,
  prazo_esperado                date,
  id_usuario_remetente          text,
  matricula_remetente           text,
  usuario_remetente             text,
  cargo_remetente               text,
  time_remetente                text,
  id_usuario_destinatario       text,
  matricula_destinatario        text,
  usuario_destinatario          text,
  cargo_destinatario            text,
  time_destinatario             text,
  tipo_feedback                 text,
  solicitacao                   text,
  pergunta                      text,
  resposta                      text,
  valores_competencias          text,
  raw_data                      jsonb,
  synced_at                     timestamptz default now()
);

-- Mural de elogios
create table if not exists elofy_praises_board (
  id                    uuid primary key default gen_random_uuid(),
  elofy_id              text unique not null,
  id_empresa            text,
  elogio                text,
  data                  date,
  hora                  text,
  id_usuario_remetente  text,
  usuario_remetente     text,
  badge                 text,
  tags                  text,
  id_usuario_elogiado   text,
  usuario_elogiado      text,
  raw_data              jsonb,
  synced_at             timestamptz default now()
);

-- Termômetro de sentimentos
create table if not exists elofy_feelings (
  id                    uuid primary key default gen_random_uuid(),
  elofy_id              text unique not null,
  id_empresa            text,
  id_usuario            text,
  usuario               text,
  id_cargo              text,
  cargo                 text,
  id_time               text,
  time                  text,
  id_gestor             text,
  gestor                text,
  id_tipo_sentimento    text,
  tipo_sentimento       text,
  id_motivo             text,
  motivo                text,
  comentario            text,
  data_criacao          text,
  hora_criacao          text,
  categorias_trabalho   jsonb,
  raw_data              jsonb,
  synced_at             timestamptz default now()
);
