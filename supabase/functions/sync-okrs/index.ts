import { elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncPeriods() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/periods");
  const rows = items.map((r) => ({
    elofy_id: r["ID Período"],
    periodo: r["Período"],
    data_inicio: r["Data de início"],
    data_fim: r["Data de fim"],
    situacao: r["Situação"],
    escala_peso_obj: r["Escala de peso de objetivos"],
    nome_padrao_objetivo: r["Nome padrão de objetivo"],
    escala_peso_kr: r["Escala de peso de resultados_chave"],
    periodicidade_kr: r["Periodicidade padrão resultados_chave"],
    modulo: r["Modulo"],
    id_empresa: r["ID Empresa"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_periods", rows);
  return rows.length;
}

async function syncPeriodsDetailed() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/periods_detailed");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_periodo"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    periodo: String(r["periodo"] ?? ""),
    data_inicial: r["data_inicial_periodo"] as string || null,
    data_final: r["data_final_periodo"] as string || null,
    escala_pesos_kr: String(r["escala_pesos_kr"] ?? ""),
    escala_pesos_meta: String(r["escala_pesos_meta"] ?? ""),
    possui_ciclo_competencias: String(r["possui_ciclo_competencias"] ?? ""),
    ciclos_com_competencias: String(r["ciclos_com_competencias"] ?? ""),
    amplitude_competencia: String(r["amplitude_competencia"] ?? ""),
    possui_ciclo_potencial: String(r["possui_ciclo_potencial"] ?? ""),
    ciclos_com_potencial: String(r["ciclos_com_potencial"] ?? ""),
    amplitude_potencial: String(r["amplitude_potencial"] ?? ""),
    possui_ciclo_valores: String(r["possui_ciclo_valores"] ?? ""),
    ciclos_com_valores: String(r["ciclos_com_valores"] ?? ""),
    amplitude_valores: String(r["amplitude_valores"] ?? ""),
    possui_ciclo_resultados: String(r["possui_ciclo_resultados"] ?? ""),
    ciclos_com_resultados: String(r["ciclos_com_resultados"] ?? ""),
    amplitude_resultados: String(r["amplitude_resultados"] ?? ""),
    possui_ciclo_feedback: String(r["possui_ciclo_feedback"] ?? ""),
    ciclos_com_feedback: String(r["ciclos_com_feedback"] ?? ""),
    amplitude_feedback: String(r["amplitude_feedback"] ?? ""),
    possui_ciclos_nota_final: String(r["possui_ciclos_nota_final"] ?? ""),
    ciclos_nota_final: String(r["ciclos_nota_final"] ?? ""),
    possui_ppr: String(r["possui_ppr"] ?? ""),
    possui_rv: String(r["possui_rv"] ?? ""),
    possui_calibragem: String(r["possui_calibragem"] ?? ""),
    ciclos_com_calibragem: String(r["ciclos_com_calibragem"] ?? ""),
    possui_nbox: String(r["possui_nbox"] ?? ""),
    ciclos_nbox: String(r["ciclos_nbox"] ?? ""),
    possui_pdi: String(r["possui_pdi"] ?? ""),
    possui_sucessao: String(r["possui_sucessao"] ?? ""),
    possui_feedback: String(r["possui_feedback"] ?? ""),
    possui_one_one: String(r["possui_one_one"] ?? ""),
    quantidade_pdis: r["quantidade_pdis"] as number,
    quantidade_feedback: r["quantidade_feedback"] as number,
    quantidade_one_one: r["quantidade_one_one"] as number,
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_periods_detailed", rows);
  return rows.length;
}

async function syncCycles() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/cycles");
  const rows = items.map((r) => ({
    elofy_id: r["ID Ciclo"],
    ciclo: r["Ciclo"],
    id_periodo: r["ID Período"],
    data_inicio: r["Data de início"],
    data_fim: r["Data de fim"],
    situacao: r["Situação"],
    status: r["Status"],
    id_empresa: r["ID Empresa"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_cycles", rows);
  return rows.length;
}

function mapDriver(r: Record<string, unknown>) {
  return {
    elofy_id: String(r["id_direcionador"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    id_periodo: String(r["id_periodo"] ?? ""),
    nome_periodo: String(r["nome_periodo"] ?? ""),
    nome_direcionador: String(r["nome_direcionador"] ?? ""),
    progresso: String(r["progresso_direcionador"] ?? ""),
    descricao: String(r["descricao_direcionador"] ?? ""),
    id_responsavel: String(r["responsavel"] ?? ""),
    nome_responsavel: String(r["nome_responsavel"] ?? ""),
    matricula_responsavel: String(r["matricula_responsavel"] ?? ""),
    id_cargo: String(r["id_cargo"] ?? ""),
    cargo: String(r["cargo"] ?? ""),
    nivel_responsabilidade: String(r["nivel_responsabilidade"] ?? ""),
    id_time_responsavel: String(r["id_time_responsavel"] ?? ""),
    nome_time_responsavel: String(r["nome_time_responsavel"] ?? ""),
    id_gestor_responsavel: String(r["id_gestor_responsavel"] ?? ""),
    nome_gestor_responsavel: String(r["nome_gestor_responsavel"] ?? ""),
    matricula_gestor: String(r["matricula_gestor_responsavel"] ?? ""),
    status: String(r["status_direcionador"] ?? ""),
    atrela_metas: String(r["atrela_metas"] ?? ""),
    tipo_direcionador: String(r["tipo_direcionador"] ?? ""),
    corresponsaveis: r["corresponsaveis"] ?? null,
    tags: r["tags"] ?? null,
    itens_vinculados: r["itens_vinculados"] ?? null,
    raw_data: r,
  };
}

async function syncDrivers() {
  const { data: periods } = await supabase.from("elofy_periods").select("elofy_id");
  const allRows: ReturnType<typeof mapDriver>[] = [];

  for (const period of periods ?? []) {
    const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/drivers", { periodId: period.elofy_id });
    allRows.push(...items.map(mapDriver));
  }

  if (allRows.length > 0) {
    await upsertBatch(supabase, "elofy_drivers", allRows);
  }
  return allRows.length;
}

async function getPeriodIds(): Promise<string[]> {
  const { data } = await supabase.from("elofy_periods").select("elofy_id");
  return (data ?? []).map((r: { elofy_id: string }) => r.elofy_id).filter(Boolean);
}

async function syncObjectives() {
  const periodIds = await getPeriodIds();
  const allRows: Record<string, string>[] = [];

  for (const periodId of periodIds) {
    const items = await elofyGetAll<Record<string, string>>("/dataQuery/objectives", { periodId });
    allRows.push(...items);
  }

  const rows = allRows.map((r) => ({
    elofy_id: r["ID Objetivo"],
    id_empresa: r["ID Empresa"],
    id_periodo: r["ID Período"],
    periodo: r["Período"],
    id_ciclo: r["ID Ciclo"],
    ciclo: r["Ciclo"],
    id_direcionador: r["ID Direcionador"],
    direcionador: r["Direcionador"],
    id_objetivo_pai: r["ID Objetivo pai"],
    objetivo_pai: r["Objetivo pai"],
    objetivo: r["Objetivo"],
    objetivo_estrategico: r["Objetivo estratégico"],
    descricao: r["Descrição"],
    tipo: r["Tipo"],
    id_responsavel: r["Id Responsável objetivo"],
    responsavel: r["Responsável objetivo"],
    id_corresponsavel: r["ID Corresponsável objetivo"],
    corresponsavel: r["Corresponsável objetivo"],
    time: r["Time"],
    workflow: r["Workflow"],
    tags: r["Tags"],
    peso: r["Peso"],
    progresso: r["Progresso"],
    sentimento: r["Sentimento"],
    status: r["Status"],
    ativo: r["Ativo"],
    raw_data: r,
  }));

  if (rows.length > 0) await upsertBatch(supabase, "elofy_objectives", rows);
  return rows.length;
}

async function syncKeyResults() {
  const periodIds = await getPeriodIds();
  const allItems: Record<string, string>[] = [];

  for (const periodId of periodIds) {
    const items = await elofyGetAll<Record<string, string>>("/dataQuery/key_results", { periodId });
    allItems.push(...items);
  }

  const rows = allItems.map((r) => ({
    elofy_id: r["ID resultado-chave"],
    id_objetivo: r["ID objetivo"],
    resultado_chave: r["Resultado-chave"],
    descricao: r["Descrição"],
    workflow: r["Workflow"],
    id_responsavel: r["ID Responsável"],
    responsavel: r["Responsável"],
    id_corresponsavel: r["ID corresonsável"],
    corresponsavel: r["Corresponsável"],
    peso: r["Peso"],
    unidade_medida: r["Unidade de medida"],
    meta: r["Meta"],
    ponto_partida: r["Ponto de partida"],
    direcao: r["Direção"],
    manutencao: r["Resultado-chave manutenção"],
    medicao_atual: r["Medição atual"],
    data_medicao_atual: r["Data da medição atual"],
    progresso: r["Progresso"],
    periodicidade: r["Periodicidade"],
    checkins_pendentes: r["Número de check-ins pendentes"],
    sentimento: r["Sentimento"],
    status: r["Status"],
    tipo_informacao: r["Tipo de informação"],
    tipo_score: r["Tipo score"],
    formula_calculo: r["Fórmula de cálculo"],
    tags: r["Tags"],
    modulo: r["Modulo"],
    ativo: r["Ativo"],
    raw_data: r,
  }));

  if (rows.length > 0) await upsertBatch(supabase, "elofy_key_results", rows);
  return rows.length;
}

async function syncOkrsV2() {
  const items = await elofyGetAll<Record<string, unknown>>("/v2/dataQuery/okrs");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_objetivo"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    nome_objetivo: String(r["nome_objetivo"] ?? ""),
    ativo: String(r["ativo"] ?? ""),
    workflow: String(r["workflow"] ?? ""),
    id_responsavel: String(r["id_responsavel"] ?? ""),
    nome_responsavel: String(r["nome_responsavel"] ?? ""),
    matricula_responsavel: String(r["matricula_responsavel"] ?? ""),
    id_cargo: String(r["id_cargo"] ?? ""),
    cargo: String(r["cargo"] ?? ""),
    nivel_responsabilidade: String(r["nivel_responsabilidade"] ?? ""),
    id_time_responsavel: String(r["id_time_responsavel"] ?? ""),
    nome_time_responsavel: String(r["nome_time_responsavel"] ?? ""),
    id_gestor_responsavel: String(r["id_gestor_responsavel"] ?? ""),
    nome_gestor_responsavel: String(r["nome_gestor_responsavel"] ?? ""),
    matricula_gestor: String(r["matricula_gestor_responsavel"] ?? ""),
    peso: String(r["peso"] ?? ""),
    progresso: String(r["progresso"] ?? ""),
    id_periodo: String(r["id_periodo"] ?? ""),
    periodo: String(r["periodo"] ?? ""),
    periodo_ciclos: r["periodo_ciclos"] ?? null,
    corresponsaveis: r["corresponsaveis"] ?? null,
    resultados_chave: r["resultados_chave"] ?? null,
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_okrs_v2", rows);
  return rows.length;
}

async function syncGoalsContractV2() {
  const items = await elofyGetAll<Record<string, unknown>>("/v2/dataQuery/goals_contract");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_objetivo"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    nome_objetivo: String(r["nome_objetivo"] ?? ""),
    ativo: String(r["ativo"] ?? ""),
    workflow: String(r["workflow"] ?? ""),
    id_responsavel: String(r["id_responsavel"] ?? ""),
    nome_responsavel: String(r["nome_responsavel"] ?? ""),
    matricula_responsavel: String(r["matricula_responsavel"] ?? ""),
    id_cargo: String(r["id_cargo"] ?? ""),
    cargo: String(r["cargo"] ?? ""),
    nivel_responsabilidade: String(r["nivel_responsabilidade"] ?? ""),
    id_time_responsavel: String(r["id_time_responsavel"] ?? ""),
    nome_time_responsavel: String(r["nome_time_responsavel"] ?? ""),
    id_gestor_responsavel: String(r["id_gestor_responsavel"] ?? ""),
    nome_gestor_responsavel: String(r["nome_gestor_responsavel"] ?? ""),
    matricula_gestor: String(r["matricula_gestor_responsavel"] ?? ""),
    peso: String(r["peso"] ?? ""),
    progresso: String(r["progresso"] ?? ""),
    id_periodo: String(r["id_periodo"] ?? ""),
    periodo: String(r["periodo"] ?? ""),
    periodo_ciclos: r["periodo_ciclos"] ?? null,
    metas: r["metas"] ?? null,
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_goals_contract_v2", rows);
  return rows.length;
}

async function syncBaseIndicators() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/base_indicators");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_indicador"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    nome_indicador: String(r["nome_indicador"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    ativo: String(r["ativo"] ?? ""),
    dimensao: String(r["dimensao"] ?? ""),
    origem: String(r["origem"] ?? ""),
    peso: String(r["peso"] ?? ""),
    tipo_informacao: String(r["tipo_informacao"] ?? ""),
    forma_calculo: String(r["forma_calculo"] ?? ""),
    tipo_score: String(r["tipo_score"] ?? ""),
    id_periodo: String(r["id_periodo"] ?? ""),
    nome_periodo: String(r["nome_periodo"] ?? ""),
    casas_decimais: r["numero_casas_decimais"] as number,
    ponto_partida: String(r["ponto_partida"] ?? ""),
    periodicidade: String(r["periodicidade"] ?? ""),
    manutencao: String(r["manutencao"] ?? ""),
    meta: String(r["meta"] ?? ""),
    score: String(r["score"] ?? ""),
    minimo: String(r["minimo"] ?? ""),
    maximo: String(r["maximo"] ?? ""),
    maximo2: String(r["maximo2"] ?? ""),
    meta_jan: String(r["meta_jan"] ?? ""),
    checkin_jan: String(r["checkin_jan"] ?? ""),
    meta_fev: String(r["meta_fev"] ?? ""),
    checkin_fev: String(r["checkin_fev"] ?? ""),
    meta_mar: String(r["meta_mar"] ?? ""),
    checkin_mar: String(r["checkin_mar"] ?? ""),
    meta_abr: String(r["meta_abr"] ?? ""),
    checkin_abr: String(r["checkin_abr"] ?? ""),
    meta_maio: String(r["meta_maio"] ?? ""),
    checkin_maio: String(r["checkin_maio"] ?? ""),
    meta_jun: String(r["meta_jun"] ?? ""),
    checkin_jun: String(r["checkin_jun"] ?? ""),
    meta_jul: String(r["meta_jul"] ?? ""),
    checkin_jul: String(r["checkin_jul"] ?? ""),
    meta_ago: String(r["meta_ago"] ?? ""),
    checkin_ago: String(r["checkin_ago"] ?? ""),
    meta_set: String(r["meta_set"] ?? ""),
    checkin_set: String(r["checkin_set"] ?? ""),
    meta_out: String(r["meta_out"] ?? ""),
    checkin_out: String(r["checkin_out"] ?? ""),
    meta_nov: String(r["meta_nov"] ?? ""),
    checkin_nov: String(r["checkin_nov"] ?? ""),
    meta_dez: String(r["meta_dez"] ?? ""),
    checkin_dez: String(r["checkin_dez"] ?? ""),
    meta_anual: String(r["meta_anual"] ?? ""),
    checkin_anual: String(r["checkin_anual"] ?? ""),
    metas_vinculadas: r["metas_vinculadas"] ?? null,
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_base_indicators", rows);
  return rows.length;
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number> = {};

  try {
    results.periods = await syncPeriods();
    results.periods_detailed = await syncPeriodsDetailed();
    results.cycles = await syncCycles();
    results.drivers = await syncDrivers();
    results.objectives = await syncObjectives();
    results.key_results = await syncKeyResults();
    results.okrs_v2 = await syncOkrsV2();
    results.goals_contract_v2 = await syncGoalsContractV2();
    results.base_indicators = await syncBaseIndicators();

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    await logSync(supabase, "sync-okrs", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-okrs", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
