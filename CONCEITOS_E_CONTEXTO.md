# Checkin BP — Conceitos, Critérios e Contextos do Projeto

> Documento de referência completo. Cobre tudo que foi construído, decidido e definido neste projeto desde sua criação. Serve como base de conhecimento para novas sessões, onboarding de parceiros e auditorias de check-in.

---

## 1. Visão Geral do Projeto

O **Checkin BP** é um sistema de acompanhamento mensal de metas dos Business Partners de RH da SIEG Soluções Fiscais. A premissa central é simples: o BP alimenta o projeto com dados reais, define métricas e critérios de cálculo uma única vez, e a partir daí pode solicitar o resultado de qualquer mês com uma única instrução — todos os cálculos são feitos automaticamente.

O projeto evoluiu em duas camadas complementares:

**Camada 1 — Dashboards HTML locais:** painéis interativos gerados com arquivos `.html` + `.json`, sem dependência de servidor ou banco de dados. Rodam direto no navegador.

**Camada 2 — Integração Elofy → Supabase:** pipeline de sincronização que puxa os dados brutos da plataforma Elofy (sistema de gestão de pessoas usado na SIEG) para um banco de dados PostgreSQL no Supabase, via Edge Functions agendadas. Essa camada viabiliza análises futuras mais sofisticadas e automação completa dos check-ins.

---

## 2. Contexto Organizacional

### 2.1 A empresa

**SIEG Soluções Fiscais** é uma empresa SaaS voltada para automação de processos fiscais no mercado contábil. Atende mais de 20 mil empresas clientes. O quadro de pessoal conta com aproximadamente **579 colaboradores cadastrados**, dos quais **331 estão ativos** (excluindo o time de Administração para fins de análise de RH).

### 2.2 A área de RH — Gente & Cultura

A área é chamada de **Gente & Cultura** e opera com três Business Partners, cada um com carteira de áreas definida:

| BP | Carteira de Áreas |
|---|---|
| **Cainã** | Comercial e Marketing |
| **Izabela** | CX/CS e Financeiro |
| **Renata / Paula** | Tecnologia e RH interno (Gente & Cultura) |

### 2.3 Mapeamento detalhado BP → Áreas (Times)

**Cainã — Comercial & Marketing (105 colaboradores ativos, 14 líderes)**
- DIRETORIA COMERCIAL
- DIRETORIA MARKETING
- MARKETING DIGITAL
- MARKETING EVENTOS
- PRÉ-VENDAS
- VENDAS INTERNAS
- REGIONAL BA
- REGIONAL ES
- REGIONAL GO
- REGIONAL MG
- REGIONAL MS
- REGIONAL MT
- REGIONAL NE
- REGIONAL PR
- REGIONAL RJ
- REGIONAL RS/SC
- REGIONAL SP

**Izabela — CX/CS & Financeiro (146 colaboradores ativos, 13 líderes)**
- CS
- CS - Time Aline
- CS - Time Luana
- CX
- CX - Reversão
- CX - Time Gabriel
- SUPORTE (e times derivados)
- ADMINISTRATIVO/FINANCEIRO (REC/SP)
- DIRETORIA FINANCEIRA
- OSM
- SERVIÇOS GERAIS (REC/SP)
- DIRETORIA OPERAÇÕES

**Renata / Paula — Tecnologia & RH (77 colaboradores ativos, 11 líderes)**
- DEV - Felipe
- DEV - Gilmar
- DEV - Jony
- DEV - Leandro
- DIRETORIA TECNOLOGIA
- TI - INFRAESTRUTURA
- PESQUISA & PRODUTO
- NIX
- Recrutamento e Seleção
- Desenvolvimento Humano Organizacional
- Departamento Pessoal
- DIRETORIA GENTE & CULTURA

### 2.4 Plataforma de Gestão de Pessoas

A SIEG utiliza o **Elofy** como plataforma de gestão de pessoas. Toda a coleta de dados parte dessa ferramenta, que expõe uma API pública com 38+ endpoints cobrindo: estrutura organizacional, ciclos de avaliação de desempenho, OKRs, PDIs, feedbacks, pesquisas de clima/engajamento, reuniões 1:1, planejamento de sucessão e integração de novos colaboradores.

---

## 3. Estrutura de Arquivos do Projeto

### 3.1 Diretório principal

```
C:\Users\Cainã Gonçalves\Documents\Claude\Projects\Checkin BP\
```

### 3.2 Arquivos de dados (JSONs)

| Arquivo | Conteúdo | Período de Referência |
|---|---|---|
| `employees.json` | 579 colaboradores (331 ativos excl. Admin) | Vigente |
| `ENPS.json` | Respostas de eNPS — 244 respondentes | 1º TRI 2026 (Mar/2026) |
| `LNPS.json` | Respostas de LNPS — 238 respondentes | 1º TRI 2026 (Mar/2026) |
| `ISBE.json` | Índice de Bem-Estar — 1729 respostas (Favorabilidade) | Dez/2025 |
| `Feedback.json` | 54 feedbacks registrados | Abr/2026 |
| `1-1.json` | 100 registros de reuniões 1:1 | Abr/2026 |

### 3.3 Dashboards HTML

| Arquivo | Módulo | Escopo de dados |
|---|---|---|
| `index.html` | Hub central com filtros e KPIs | Todos os BPs e líderes |
| `NPS_Dashboard_BP.html` | eNPS e LNPS por carteira de BP | 38 líderes, 1º TRI 2026 |
| `ISO_Dashboard_Marco2026.html` | ISO — Saúde Organizacional | Completo para Cainã (12 líderes); ISBE+eNPS para os demais |
| `Feedback_Abril2026.html` | Relatório de Feedback | 38 líderes, Abr/2026 |
| `IMG_Dashboard_Marco.html` | Indicadores de Metas e Gestão (IMG) | 11 líderes da carteira Cainã |

### 3.4 Infraestrutura de integração (Supabase)

```
supabase/
├── migrations/          # 10 arquivos SQL criando 39 tabelas
├── functions/           # 11 Edge Functions (Deno/TypeScript)
│   ├── _shared/         # Clientes reutilizáveis (Elofy, Supabase, notify)
│   ├── sync-estrutura/
│   ├── sync-competencias/
│   ├── sync-avaliacoes/
│   ├── sync-okrs/
│   ├── sync-pdi/
│   ├── sync-feedback/
│   ├── sync-one-one-sucessao/
│   ├── sync-pesquisas/
│   ├── sync-integracao/
│   ├── check-token/
│   └── sync-all/        # Orquestrador que chama todas as funções
└── config.toml
```

---

## 4. Métricas e Indicadores

### 4.1 Métricas monitoradas nos check-ins

#### eNPS — Employee Net Promoter Score
- **O que mede:** Probabilidade de o colaborador recomendar a empresa como lugar para trabalhar.
- **Escala:** 0 a 10.
- **Fórmula:** `(% Promotores − % Detratores) × 100`
  - Promotores: notas 9 e 10
  - Neutros: notas 7 e 8
  - Detratores: notas 0 a 6
- **Resultado é adimensional**, varia de −100 a +100.
- **Periodicidade no projeto:** trimestral (medido no 1º TRI 2026).
- **Respondentes 1º TRI 2026:** 244 de 331 elegíveis.
- **Benchmarks internos 1º TRI 2026:**

| Escopo | eNPS |
|---|---|
| Geral SIEG | 85 |
| Cainã (Comercial/Marketing) | 87 |
| Izabela (CX/CS/Fin.) | 79 |
| Renata/Paula (Tech/RH) | 90 |

#### LNPS — Leader Net Promoter Score
- **O que mede:** Probabilidade de o colaborador recomendar seu líder direto.
- **Mesma lógica de cálculo do eNPS**, aplicada à avaliação do gestor imediato.
- **Respondentes 1º TRI 2026:** 238.
- **Benchmarks internos 1º TRI 2026:**

| Escopo | LNPS |
|---|---|
| Geral SIEG | 77 |
| Cainã | 75 |
| Izabela | 68 |
| Renata/Paula | 93 |

#### ISBE — Índice de Saúde e Bem-Estar (ISO)
- **O que mede:** Favorabilidade geral em dimensões de saúde organizacional e bem-estar.
- **Cálculo:** Percentual de respostas favoráveis sobre o total de respostas válidas.
- **Base de dados:** 1729 respostas (Dez/2025).
- **Benchmarks:**

| Escopo | ISBE Favorabilidade |
|---|---|
| Geral SIEG | 68% |
| Cainã | 66% |
| Izabela | 65% |
| Renata/Paula | 74% |

> **Importante:** O ISBE foi a base disponível para os dashboards no período. O módulo ISO completo (com turnover, CIDF etc.) foi totalmente construído apenas para a carteira do Cainã. Para os demais BPs, o módulo exibe ISBE + eNPS com nota de indisponibilidade para os demais indicadores.

#### Feedbacks
- **O que mede:** Volume de feedbacks registrados na plataforma Elofy no período.
- **Tipos mapeados:** feedbacks espontâneos e solicitados.
- **Referência Abr/2026:** 54 feedbacks totais.

| Escopo | Feedbacks |
|---|---|
| Cainã | 16 |
| Izabela | 20 |
| Renata/Paula | 11 |
| Sem categorização | 7 |

#### Reuniões 1:1
- **O que mede:** Volume de reuniões 1:1 realizadas entre líder e liderado.
- **Referência Abr/2026:** 100 registros.

| Escopo | 1:1s |
|---|---|
| Cainã | 32 |
| Izabela | 31 |
| Renata/Paula | 33 |
| Sem categorização | 4 |

#### IMG — Indicadores de Metas e Gestão
- **O que mede:** Cumprimento de indicadores individuais por líder (dados vindos de planilha externa — PLANILHA DE VERIFICAÇÃO IMG MARÇO.xlsx).
- **Escopo atual:** 11 líderes da carteira Cainã.
- **Limitação:** não expansível para outras carteiras, pois os dados de origem estão em planilha manual e não no Elofy.

#### Headcount
- **Total de colaboradores ativos:** 331 (excluindo Administração).
- **Critério de ativo:** colaboradores com status ativo no Elofy, sem data de desligamento.
- **Escopo dos 579:** inclui histórico de desligados e área administrativa.

---

## 5. Arquitetura dos Dashboards HTML

### 5.1 Design System

Todos os dashboards seguem o padrão visual da SIEG:

| Elemento | Valor |
|---|---|
| Fonte principal (headings) | Syne |
| Fonte corpo | DM Sans |
| Cor primária | `#6D28D9` (roxo) |
| Variações | `#7C3AED`, `#8B5CF6` |
| Background | Branco (não dark mode) |
| Fonte carregada via | Google Fonts CDN |

### 5.2 Hub principal — `index.html`

Funciona como ponto de entrada e painel consolidado. Funcionalidades:

- **Filtro por BP:** 4 botões — Geral, Cainã, Izabela, Renata/Paula.
- **Filtro por líder:** Dropdown dinâmico. Quando um BP é selecionado, o dropdown exibe apenas os líderes daquela carteira.
- **6 KPI cards** com animação de contagem progressiva ao carregar.
- **Banner contextual:** exibe as áreas/times do filtro ativo.
- **4 module cards** linkando para os HTMLs individuais, com propagação dos filtros via URL params (`?bp=...&leader=...`).
- **Dados calculados no cliente** (JavaScript puro), sem chamada de servidor.
- **Estrutura de dados pré-calculada** por área e por líder, agregada a partir do JSON de colaboradores.

### 5.3 Propagação de filtros via URL

O hub propaga os filtros selecionados para cada módulo via parâmetros de URL. Cada módulo lê os params ao carregar e filtra seus dados automaticamente. Isso garante que o contexto do BP / líder seja preservado ao navegar entre módulos.

Exemplo: `NPS_Dashboard_BP.html?bp=Caina&leader=Regional+SP`

### 5.4 Escopo de líderes por módulo

| Módulo | Líderes com dados completos | Observação |
|---|---|---|
| NPS | 38 (todos) | eNPS e LNPS completos |
| ISO | 12 (carteira Cainã) | Demais: ISBE + eNPS apenas |
| Feedback | 38 (todos) | Summary grid dinâmico por BP |
| IMG | 11 (carteira Cainã) | Dados de planilha externa |

---

## 6. Arquitetura da Integração Elofy → Supabase

### 6.1 Visão geral do pipeline

```
Elofy API (38+ endpoints)
        ↓ (autenticação por email/senha)
Edge Functions (Deno/TypeScript no Supabase)
        ↓ (upsert por elofy_id)
PostgreSQL no Supabase (39 tabelas)
        ↓ (pg_cron, todo dia às 03h)
Dados sempre frescos para análise
```

### 6.2 Autenticação na API do Elofy

- **Método:** email + senha (Basic Auth / Token).
- **Credenciais armazenadas como Secrets** do Supabase (nunca em código).
- Variáveis: `ELOFY_EMAIL`, `ELOFY_PASSWORD`, `ELOFY_BASE_URL`.
- A função `check-token` verifica a validade do token antes de cada sincronização.

### 6.3 Estratégia de upsert

Todas as tabelas usam `elofy_id` (identificador do Elofy) como chave de unicidade. O padrão de escrita é sempre **upsert** (`ON CONFLICT (elofy_id) DO UPDATE`), garantindo idempotência: rodar a sincronização múltiplas vezes não duplica registros.

### 6.4 Padrão de tabelas

Cada tabela segue a mesma estrutura base:

```sql
id         uuid (PK, gerado automaticamente)
elofy_id   text (unique — identificador do Elofy)
[campos]   text / numeric / date / jsonb
raw_data   jsonb (resposta bruta completa da API — seguro contra mudanças de schema)
synced_at  timestamptz (timestamp da última sincronização)
```

O campo `raw_data` é fundamental: preserva o JSON completo retornado pela API, o que permite recuperar campos que ainda não foram mapeados como colunas explícitas sem necessidade de re-sincronizar.

### 6.5 Funções de sincronização

| Função | Endpoints cobertos | Tabelas populadas |
|---|---|---|
| `sync-estrutura` | company, teams, positions, users | 4 tabelas |
| `sync-competencias` | competencies, cycle_review_config | 2 tabelas |
| `sync-avaliacoes` | cycle_review_detailed (nested), cycle_review_public, cycle_review_note_step, avg_competencies, avg_results, ninebox | 7 tabelas |
| `sync-okrs` | periods, periods_detailed, cycles, drivers, objectives, key_results, okrs_v2, goals_contract_v2, base_indicators | 9 tabelas |
| `sync-pdi` | pdi, initiatives, initiatives_pdi, initiatives_one_one | 4 tabelas |
| `sync-feedback` | feedbacks, praises_board, feelings | 3 tabelas |
| `sync-one-one-sucessao` | one_one, succession | 2 tabelas |
| `sync-pesquisas` | surveys, survey_dismiss, survey_pulse, survey_standard, survey_temporal | 5 tabelas |
| `sync-integracao` | integration_situation, integration_batch | 2 tabelas |
| `sync-all` | Orquestrador — chama todas as anteriores | — |

### 6.6 Agendamento automático

O cron é configurado via extensão **pg_cron** do Supabase:

```sql
select cron.schedule(
  'elofy-sync-daily',
  '0 3 * * *',  -- Executa todo dia às 03h (UTC)
  $$ ... net.http_post → sync-all $$
);
```

### 6.7 Logs de sincronização

Tabela `elofy_sync_logs` registra cada execução com:
- `entity`: qual função rodou
- `status`: sucesso ou falha
- `records_synced`: quantos registros foram upsertados
- `started_at` / `finished_at`: timestamps de início e fim

---

## 7. Catálogo Completo de Tabelas (39 tabelas)

### Módulo: Estrutura Organizacional

| Tabela | O que armazena |
|---|---|
| `elofy_company` | Dados da empresa (SIEG) |
| `elofy_teams` | Times/departamentos com hierarquia |
| `elofy_positions` | Cargos com dificuldade, impacto e elegibilidade para sucessão |
| `elofy_users` | Colaboradores (ativo/inativo, gestor, cargo, time, CPF, etc.) |

### Módulo: Competências e Configuração de Ciclos

| Tabela | O que armazena |
|---|---|
| `elofy_competencies` | Definição de competências avaliadas (categoria, comportamentos esperados/não esperados) |
| `elofy_cycle_review_config` | Configuração de cada revisão de ciclo (etapas habilitadas, público, calibração, ninebox etc.) |

### Módulo: Avaliações de Desempenho

| Tabela | O que armazena |
|---|---|
| `elofy_cycle_review_detailed` | Avaliação individual por avaliador (autoavaliação, pares, gestor, equipe, cliente) |
| `elofy_cycle_review_steps` | Etapas dentro de cada avaliação (competências, resultados, valores) com média por fase |
| `elofy_cycle_review_items` | Itens avaliados dentro de cada etapa (nota, conceito, comentário) |
| `elofy_cycle_review_public` | Score consolidado por colaborador avaliado (médias por tipo de avaliador) |
| `elofy_cycle_review_note_step` | Notas e conceitos por fase + calibração + ninebox por colaborador |
| `elofy_cycle_review_avg_competencies` | Médias de competências por colaborador (todas as perspectivas) |
| `elofy_cycle_review_avg_results` | Médias de resultados por item avaliado (todas as perspectivas) |
| `elofy_cycle_review_ninebox` | Posicionamento no ninebox (eixo X, eixo Y, quadrante, pessoa chave, talento, singular) |

### Módulo: OKRs e Metas

| Tabela | O que armazena |
|---|---|
| `elofy_periods` | Períodos de OKR com configurações de escala e periodicidade |
| `elofy_periods_detailed` | Detalhamento de cada período (quais módulos estão ativos: PDI, feedback, 1:1, OKR, NBox etc.) |
| `elofy_cycles` | Ciclos dentro de cada período |
| `elofy_drivers` | Direcionadores estratégicos (pilares que orientam os OKRs) |
| `elofy_objectives` | Objetivos OKR por responsável, com progresso e sentimento |
| `elofy_key_results` | Key Results de cada objetivo (meta, ponto de partida, medição atual, progresso, fórmula) |
| `elofy_okrs_v2` | OKRs no modelo v2 da API (inclui corresponsáveis e KRs aninhados) |
| `elofy_goals_contract_v2` | Contrato de metas v2 (metas individuais estruturadas) |
| `elofy_base_indicators` | Indicadores base com metas e check-ins mensais (Jan–Dez + anual) |

### Módulo: PDI e Iniciativas

| Tabela | O que armazena |
|---|---|
| `elofy_pdi` | Planos de Desenvolvimento Individual por colaborador |
| `elofy_initiatives` | Iniciativas de desenvolvimento genéricas |
| `elofy_initiatives_pdi` | Iniciativas vinculadas a PDIs |
| `elofy_initiatives_one_one` | Iniciativas vinculadas a reuniões 1:1 |

### Módulo: Feedback e Cultura

| Tabela | O que armazena |
|---|---|
| `elofy_feedbacks` | Feedbacks registrados (remetente, destinatário, tipo, pergunta, resposta) |
| `elofy_praises_board` | Elogios públicos no mural (badge, tags, texto) |
| `elofy_feelings` | Termômetro de sentimentos (tipo de sentimento, motivo, comentário) |

### Módulo: 1:1 e Sucessão

| Tabela | O que armazena |
|---|---|
| `elofy_one_one` | Reuniões 1:1 (participantes, data, duração, talking points, iniciativas, status) |
| `elofy_succession` | Planejamento de sucessão por cargo (titulares atuais, sucessores, dificuldade, impacto) |

### Módulo: Pesquisas

| Tabela | O que armazena |
|---|---|
| `elofy_surveys` | Relatório geral de pesquisas (sem respostas individuais) com adesão |
| `elofy_survey_dismiss` | Pesquisas de desligamento com perguntas e respostas individuais |
| `elofy_survey_pulse` | Pesquisas Pulse (NPS-like, score por pergunta/categoria) |
| `elofy_survey_standard` | Pesquisas padrão e enquetes (respostas individuais por pergunta) |
| `elofy_survey_temporal` | Pesquisas temporais (avaliações com perspectiva de respondente vs. avaliado) |

### Módulo: Integração de Colaboradores

| Tabela | O que armazena |
|---|---|
| `elofy_integration_situation` | Situação da integração de novos colaboradores |
| `elofy_integration_batch` | Lotes de integração (batches de onboarding) |

### Controle interno

| Tabela | O que armazena |
|---|---|
| `elofy_sync_logs` | Log de execução de cada sincronização (status, registros, tempo) |

---

## 8. Dados Históricos e Benchmarks Consolidados (1º TRI 2026)

| Métrica | Geral SIEG | Cainã | Izabela | Renata/Paula |
|---|---|---|---|---|
| Headcount ativo | 331 | 105 | 146 | 77 |
| Líderes | 38 | 14 | 13 | 11 |
| eNPS | 85 | 87 | 79 | 90 |
| LNPS | 77 | 75 | 68 | 93 |
| ISBE Favorabilidade | 68% | 66% | 65% | 74% |
| Feedbacks (Abr/2026) | 54 | 16 | 20 | 11 |
| 1:1s (Abr/2026) | 100 | 32 | 31 | 33 |

---

## 9. Critérios Técnicos e Decisões de Design

### 9.1 Exclusão da área Administrativa

O headcount de análise exclui a área de **Administração** para fins de todos os cálculos de RH. O motivo é que essa área agrega perfis que distorcem os indicadores (RH, Financeiro, Diretoria) e não representa a força de trabalho operacional. O headcount real para análise é **331** (de 579 cadastrados).

### 9.2 Regra de categorização de colaborador por BP

A atribuição de um colaborador a um BP é feita pelo campo **`nome_time`** do colaborador (time ao qual pertence), que é mapeado para o BP via o mapeamento BP → Áreas descrito na seção 2.3. Colaboradores cujo time não aparece em nenhuma carteira ficam como "sem categorização".

### 9.3 Cálculo de eNPS e LNPS

Ambos seguem a metodologia NPS clássica, sem ponderação:
```
NPS = (Nº Promotores / Total respondentes × 100) − (Nº Detratores / Total respondentes × 100)
```
O resultado é arredondado para inteiro. Neutros entram no denominador mas não afetam numerador.

### 9.4 Cálculo de Favorabilidade (ISBE)

```
Favorabilidade = (Respostas favoráveis / Total de respostas válidas) × 100
```
Respostas inválidas/nulas são excluídas do denominador.

### 9.5 Filosofia de dados do projeto

> **Regra inegociável:** nunca inventar dados, nunca preencher lacunas com estimativas sem aviso explícito. Se faltar informação para fechar uma análise, o sistema aponta o que precisa ser coletado.

Isso se reflete em dois padrões técnicos:
- Módulos sem dados disponíveis para determinado BP exibem **"N/D"** com nota explicativa (ex.: turnover e CIDF no módulo ISO para Izabela e Renata/Paula).
- O campo `raw_data jsonb` em todas as tabelas preserva o dado bruto completo, evitando perda de informação por mapeamento incompleto.

### 9.6 Dados calculados no cliente (JavaScript)

Os dashboards HTML calculam todos os indicadores diretamente no navegador, via JavaScript, usando os arquivos JSON como fonte. Isso elimina dependência de servidor para visualização e garante portabilidade total — qualquer pessoa com acesso à pasta pode abrir os dashboards sem configuração adicional.

### 9.7 Supabase como camada de análise futura

O pipeline Supabase não alimenta os dashboards HTML atuais diretamente. Ele é a fundação para a próxima evolução do projeto: consultas SQL, análises mais profundas, histórico de dados ao longo do tempo e, futuramente, dashboards conectados diretamente ao banco.

---

## 10. Tecnologias Utilizadas

| Tecnologia | Papel no projeto |
|---|---|
| **HTML + CSS + JavaScript** | Dashboards interativos (sem frameworks) |
| **JSON** | Fonte de dados para os dashboards |
| **Supabase** | Banco de dados PostgreSQL gerenciado + Edge Functions + pg_cron |
| **Deno / TypeScript** | Runtime das Edge Functions do Supabase |
| **PostgreSQL** | Armazenamento e consulta dos dados sincronizados |
| **pg_cron** | Agendamento automático das sincronizações |
| **pg_net** | Chamadas HTTP dentro do banco (trigger do cron) |
| **Elofy API** | Fonte primária de todos os dados de pessoas |
| **Google Fonts** | Syne e DM Sans para o design system |

---

## 11. Pendências e Limitações Conhecidas

| Item | Descrição | Impacto |
|---|---|---|
| **IMG — escopo limitado** | Dados do IMG vêm de planilha manual, não do Elofy. Cobre apenas carteira Cainã. | Módulo não expansível para Izabela/Renata sem mudança de fonte de dados. |
| **ISO — dados incompletos para Izabela e Renata/Paula** | Turnover, CIDF e outros indicadores do módulo ISO só existem para Cainã. | Exibição parcial com aviso "N/D" para os demais BPs. |
| **ISBE desatualizado** | Base de dados de Dez/2025. Nova pesquisa ainda não realizada. | Benchmark de bem-estar pode estar desatualizado. |
| **Supabase não conectado aos dashboards** | Pipeline criado mas dashboards ainda consomem JSONs locais. | Precisará de uma camada de API/fetch para conectar os dois. |
| **Autenticação Elofy** | Credenciais precisam ser mantidas atualizadas como Secrets no Supabase. | Sincronização falha se token expirar e não for renovado. |

---

## 12. Glossário

| Termo | Definição |
|---|---|
| **BP** | Business Partner de RH — profissional que atua como parceiro estratégico de uma carteira de áreas da empresa. |
| **eNPS** | Employee Net Promoter Score — índice de recomendação da empresa como lugar para trabalhar. |
| **LNPS** | Leader Net Promoter Score — índice de recomendação do líder direto. |
| **ISBE** | Índice de Saúde e Bem-Estar — percentual de favorabilidade em pesquisa de clima/bem-estar organizacional. |
| **ISO** | Saúde Organizacional — módulo que consolida múltiplos indicadores de saúde do ambiente de trabalho (inclui ISBE, turnover, CIDF, eNPS). |
| **IMG** | Indicadores de Metas e Gestão — cumprimento de metas individuais dos líderes. |
| **CIDF** | Índice relacionado à cultura organizacional e feedback (contexto interno SIEG). |
| **1:1** | Reunião individual periódica entre gestor e liderado, registrada no Elofy. |
| **PDI** | Plano de Desenvolvimento Individual — plano estruturado de desenvolvimento de competências do colaborador. |
| **OKR** | Objectives and Key Results — framework de definição e acompanhamento de metas. |
| **KR** | Key Result — resultado-chave que indica o progresso em direção a um objetivo OKR. |
| **Ninebox** | Matriz 9 boxes que posiciona colaboradores em dois eixos (ex.: desempenho x potencial). |
| **Elofy** | Plataforma de gestão de pessoas usada pela SIEG. |
| **Supabase** | Plataforma de banco de dados PostgreSQL gerenciado com suporte a Edge Functions. |
| **Edge Function** | Função serverless (Deno/TypeScript) rodando no Supabase, responsável por buscar dados do Elofy e gravar no banco. |
| **Upsert** | Operação de banco que insere o registro se não existir, ou atualiza se já existir (com base em chave única). |
| **Gente & Cultura** | Nome da área de RH na SIEG. |
| **Carteira** | Conjunto de times/áreas sob responsabilidade de um BP. |
| **Hub** | Arquivo `index.html` — ponto central de navegação entre os módulos de dashboard. |
