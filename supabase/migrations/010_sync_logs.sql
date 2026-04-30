-- Log de sincronizações
create table if not exists elofy_sync_logs (
  id              uuid primary key default gen_random_uuid(),
  entity          text not null,
  status          text not null check (status in ('success', 'error', 'running', 'token_expired')),
  records_synced  integer default 0,
  error_message   text,
  started_at      timestamptz default now(),
  finished_at     timestamptz
);

create index if not exists idx_sync_logs_entity on elofy_sync_logs(entity);
create index if not exists idx_sync_logs_started_at on elofy_sync_logs(started_at desc);
