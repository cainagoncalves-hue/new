-- Reuniões 1-1
create table if not exists elofy_one_one (
  id                        uuid primary key default gen_random_uuid(),
  elofy_id                  text unique not null,
  id_empresa                text,
  nome_empresa              text,
  template                  text,
  status_one_one            text,
  id_usuario_remetente      text,
  nome_usuario_remetente    text,
  status_remetente          text,
  id_gestor_remetente       text,
  nome_gestor_remetente     text,
  data                      date,
  horario                   text,
  duracao                   integer,
  id_usuario_convidado      text,
  nome_usuario_convidado    text,
  status_convidado          text,
  motivo                    text,
  situacao                  text,
  id_ciclo_avaliacao        text,
  nome_ciclo_avaliacao      text,
  tags                      text,
  compartilhado             jsonb,
  iniciativas               jsonb,
  talking_points            jsonb,
  raw_data                  jsonb,
  synced_at                 timestamptz default now()
);

-- Sucessão
create table if not exists elofy_succession (
  id                    uuid primary key default gen_random_uuid(),
  elofy_id              text unique not null,
  id_empresa            text,
  nome_empresa          text,
  nome_cargo            text,
  descricao             text,
  dificuldade           text,
  impacto               text,
  situacao_cargo        text,
  classificacao         text,
  requisitos_posicao    text,
  usuarios_atuais       jsonb,
  sucessao              jsonb,
  raw_data              jsonb,
  synced_at             timestamptz default now()
);
