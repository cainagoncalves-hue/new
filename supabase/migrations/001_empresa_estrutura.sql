-- Empresa
create table if not exists elofy_company (
  id         uuid primary key default gen_random_uuid(),
  elofy_id   text unique not null,
  nome       text,
  id_grupo_economico text,
  raw_data   jsonb,
  synced_at  timestamptz default now()
);

-- Times
create table if not exists elofy_teams (
  id                    uuid primary key default gen_random_uuid(),
  elofy_id              text unique not null,
  nome                  text,
  status                text,
  codigo_origem         text,
  id_responsavel        text,
  nome_responsavel      text,
  id_time_pai           text,
  nome_time_pai         text,
  ids_tags              text,
  tags                  text,
  id_empresa            text,
  raw_data              jsonb,
  synced_at             timestamptz default now()
);

-- Cargos
create table if not exists elofy_positions (
  id                    uuid primary key default gen_random_uuid(),
  elofy_id              text unique not null,
  cargo                 text,
  status                text,
  codigo_origem         text,
  descricao             text,
  dificuldade           text,
  impacto               text,
  mapeado_sucessao      text,
  regua                 text,
  id_empresa            text,
  raw_data              jsonb,
  synced_at             timestamptz default now()
);

-- Usuários / Colaboradores
create table if not exists elofy_users (
  id                    uuid primary key default gen_random_uuid(),
  elofy_id              text unique not null,
  nome                  text,
  matricula             text,
  status                text,
  data_admissao         text,
  data_desligamento     text,
  id_gestor             text,
  nome_gestor           text,
  email                 text,
  login                 text,
  tipo_cargo            text,
  id_cargo              text,
  cargo                 text,
  nivel_responsabilidade text,
  id_time               text,
  nome_time             text,
  ids_times_acessiveis  text,
  times_acessiveis      text,
  projeto_pod           text,
  ids_perfil            text,
  perfis                text,
  cpf                   text,
  colaborador_chave     text,
  id_empresa            text,
  raw_data              jsonb,
  synced_at             timestamptz default now()
);
