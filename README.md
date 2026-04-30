# Checkin BP — Integração Elofy → Supabase

Sincroniza todos os 38 endpoints da API pública do Elofy para tabelas PostgreSQL no Supabase via Edge Functions agendadas.

---

## Pré-requisitos

- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started) instalado
- Projeto Supabase criado em [supabase.com](https://supabase.com)
- Credenciais de acesso à API do Elofy

---

## Setup

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Preencha ELOFY_EMAIL, ELOFY_PASSWORD, SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
```

### 2. Linkar ao projeto Supabase

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
```

### 3. Rodar as migrations

```bash
supabase db push
```

Isso criará todas as 30+ tabelas no banco de dados.

### 4. Configurar secrets das Edge Functions

```bash
supabase secrets set ELOFY_EMAIL=seu_email@empresa.com
supabase secrets set ELOFY_PASSWORD=sua_senha
supabase secrets set ELOFY_BASE_URL=https://api.elofy.com.br
```

### 5. Deploy das Edge Functions

```bash
supabase functions deploy sync-estrutura
supabase functions deploy sync-competencias
supabase functions deploy sync-avaliacoes
supabase functions deploy sync-okrs
supabase functions deploy sync-pdi
supabase functions deploy sync-feedback
supabase functions deploy sync-one-one-sucessao
supabase functions deploy sync-pesquisas
supabase functions deploy sync-integracao
supabase functions deploy sync-all
```

### 6. Configurar cron no Supabase

No Supabase Dashboard → **Database → Extensions**, habilite `pg_cron` e `pg_net`.

Depois execute no SQL Editor:

```sql
select cron.schedule(
  'elofy-sync-daily',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'https://SEU_PROJECT_REF.supabase.co/functions/v1/sync-all',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || 'SUA_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

---

## Teste manual

```bash
# Testar localmente com Supabase CLI
supabase functions serve --env-file .env

# Em outro terminal:
curl -X POST http://localhost:54321/functions/v1/sync-estrutura \
  -H "Authorization: Bearer $(supabase status | grep 'anon key' | awk '{print $NF}')"
```

---

## Verificação

```sql
-- Ver logs de sincronização
select entity, status, records_synced, started_at, finished_at
from elofy_sync_logs
order by started_at desc
limit 20;

-- Confirmar cron agendado
select * from cron.job;

-- Ver últimas execuções do cron
select * from cron.job_run_details
order by start_time desc
limit 10;
```

---

## Tabelas criadas

| Tabela | Endpoint Elofy |
|---|---|
| `elofy_company` | `/dataQuery/company` |
| `elofy_teams` | `/dataQuery/teams` |
| `elofy_positions` | `/dataQuery/positions` |
| `elofy_users` | `/dataQuery/users` |
| `elofy_competencies` | `/dataQuery/competencies` |
| `elofy_cycle_review_config` | `/dataQuery/cycle_review_config` |
| `elofy_cycle_review_detailed` | `/dataQuery/cycle_review_detailed` |
| `elofy_cycle_review_steps` | nested em cycle_review_detailed |
| `elofy_cycle_review_items` | nested em cycle_review_steps |
| `elofy_cycle_review_public` | `/dataQuery/cycle_review_public` |
| `elofy_cycle_review_note_step` | `/dataQuery/cycle_review_public_note_step` |
| `elofy_cycle_review_avg_competencies` | `/dataQuery/cycle_review_average_step_competencies` |
| `elofy_cycle_review_avg_results` | `/dataQuery/cycle_review_average_step_results` |
| `elofy_cycle_review_ninebox` | `/dataQuery/cycle_review_ninebox` |
| `elofy_periods` | `/dataQuery/periods` |
| `elofy_periods_detailed` | `/dataQuery/periods_detailed` |
| `elofy_cycles` | `/dataQuery/cycles` |
| `elofy_drivers` | `/dataQuery/drivers` |
| `elofy_objectives` | `/dataQuery/objectives` |
| `elofy_key_results` | `/dataQuery/key_results` |
| `elofy_okrs_v2` | `/v2/dataQuery/okrs` |
| `elofy_goals_contract_v2` | `/v2/dataQuery/goals_contract` |
| `elofy_base_indicators` | `/dataQuery/base_indicators` |
| `elofy_pdi` | `/dataQuery/pdi` |
| `elofy_initiatives` | `/dataQuery/initiatives` |
| `elofy_initiatives_pdi` | `/dataQuery/initiatives_pdi` |
| `elofy_initiatives_one_one` | `/dataQuery/initiatives_one_one` |
| `elofy_feedbacks` | `/dataQuery/feedbacks` |
| `elofy_praises_board` | `/dataQuery/praises_board` |
| `elofy_feelings` | `/dataQuery/feelings` |
| `elofy_one_one` | `/dataQuery/one_one` |
| `elofy_succession` | `/dataQuery/succession` |
| `elofy_surveys` | `/dataQuery/surveys` |
| `elofy_survey_dismiss` | `/dataQuery/survey_dismiss` |
| `elofy_survey_pulse` | `/dataQuery/survey_pulse` |
| `elofy_survey_standard` | `/dataQuery/survey_standard` |
| `elofy_survey_temporal` | `/dataQuery/survey_temporal` |
| `elofy_integration_situation` | `/dataQuery/integration_situation` |
| `elofy_integration_batch` | `/dataQuery/integration_batch` |
| `elofy_sync_logs` | controle interno |
