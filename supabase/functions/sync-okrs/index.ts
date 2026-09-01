import { elofyGetAll, setElofyToken } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";
import { dedup } from "../_shared/utils.ts";

const supabase = getSupabaseClient();

async function syncPeriods() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/periods");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_periodo"]),
    periodo: String(r["periodo"] ?? ""),
    data_inicio: String(r["data_inicio"] ?? ""),
    data_fim: String(r["data_fim"] ?? ""),
    situacao: String(r["situacao"] ?? ""),
    escala_peso_obj: String(r["escala_peso_objetivos"] ?? ""),
    nome_padrao_objetivo: String(r["nome_padrao_objetivo"] ?? ""),
    escala_peso_kr: String(r["escala_peso_resultados_chave"] ?? ""),
    periodicidade_kr: String(r["periodicidade_padrao_resultados_chave"] ?? ""),
    modulo: String(r["modulo"] ?? ""),
    id_empresa: String(r["id_empresa"] ?? ""),
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
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/cycles");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_ciclo"]),
    ciclo: String(r["ciclo"] ?? ""),
    id_periodo: String(r["id_periodo"] ?? ""),
    data_inicio: String(r["data_inicio"] ?? ""),
    data_fim: String(r["data_fim"] ?? ""),
    situacao: String(r["situacao"] ?? ""),
    status: String(r["status"] ?? ""),
    id_empresa: String(r["id_empresa"] ?? ""),
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
  const allRows: Record<string, unknown>[] = [];

  for (const periodId of periodIds) {
    const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/objectives", { periodId });
    allRows.push(...items);
  }

  const rows = allRows.map((r) => ({
    elofy_id: String(r["id_objetivo"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    id_periodo: String(r["id_periodo"] ?? ""),
    periodo: String(r["periodo"] ?? ""),
    id_ciclo: String(r["id_ciclo"] ?? ""),
    ciclo: String(r["ciclo"] ?? ""),
    id_direcionador: String(r["id_direcionador"] ?? ""),
    direcionador: String(r["direcionador"] ?? ""),
    id_objetivo_pai: String(r["id_objetivo_pai"] ?? ""),
    objetivo_pai: String(r["objetivo_pai"] ?? ""),
    objetivo: String(r["objetivo"] ?? ""),
    objetivo_estrategico: String(r["objetivo_estrategico"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    tipo: String(r["tipo"] ?? ""),
    id_responsavel: String(r["id_responsavel_objetivo"] ?? ""),
    responsavel: String(r["responsavel_objetivo"] ?? ""),
    id_corresponsavel: String(r["id_corresponsavel_objetivo"] ?? ""),
    corresponsavel: String(r["corresponsavel_objetivo"] ?? ""),
    time: String(r["time"] ?? ""),
    workflow: String(r["workflow"] ?? ""),
    tags: String(r["tags"] ?? ""),
    peso: String(r["peso"] ?? ""),
    progresso: String(r["progresso"] ?? ""),
    sentimento: String(r["sentimento"] ?? ""),
    status: String(r["status"] ?? ""),
    ativo: String(r["ativo"] ?? ""),
    raw_data: r,
  }));

  if (rows.length > 0) await upsertBatch(supabase, "elofy_objectives", rows);
  return rows.length;
}

async function syncKeyResults() {
  const periodIds = await getPeriodIds();
  const allItems: Record<string, unknown>[] = [];

  for (const periodId of periodIds) {
    const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/key_results", { periodId });
    allItems.push(...items);
  }

  const rows = allItems.map((r) => ({
    elofy_id: String(r["id_resultado_chave"]),
    id_objetivo: String(r["id_objetivo"] ?? ""),
    resultado_chave: String(r["resultado_chave"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    workflow: String(r["workflow"] ?? ""),
    id_responsavel: String(r["id_responsavel"] ?? ""),
    responsavel: String(r["responsavel"] ?? ""),
    id_corresponsavel: String(r["id_corresonsavel"] ?? ""),  // API typo: missing 'p'
    corresponsavel: String(r["corresponsavel"] ?? ""),
    peso: String(r["peso"] ?? ""),
    unidade_medida: String(r["unidade_medida"] ?? ""),
    meta: String(r["meta"] ?? ""),
    ponto_partida: String(r["ponto_partida"] ?? ""),
    direcao: String(r["direcao"] ?? ""),
    manutencao: String(r["resultado_chave_manutencao"] ?? ""),
    medicao_atual: String(r["medicao_atual"] ?? ""),
    data_medicao_atual: String(r["data_medicao_atual"] ?? ""),
    progresso: String(r["progresso"] ?? ""),
    periodicidade: String(r["periodicidade"] ?? ""),
    checkins_pendentes: String(r["numero_check_ins_pendentes"] ?? ""),
    sentimento: String(r["sentimento"] ?? ""),
    status: String(r["status"] ?? ""),
    tipo_informacao: String(r["tipo_informacao"] ?? ""),
    tipo_score: String(r["tipo_score"] ?? ""),
    formula_calculo: String(r["formula_calculo"] ?? ""),
    tags: String(r["tags"] ?? ""),
    modulo: String(r["modulo"] ?? ""),
    ativo: String(r["ativo"] ?? ""),
    raw_data: r,
  }));

  if (rows.length > 0) await upsertBatch(supabase, "elofy_key_results", rows);
  return rows.length;
}

async function syncOkrsV2() {
  const periodIds = await getPeriodIds();
  const allItems: Record<string, unknown>[] = [];

  for (const periodId of periodIds) {
    const items = await elofyGetAll<Record<string, unknown>>("/v2/dataQuery/okrs", { periodId });
    allItems.push(...items);
  }

  const rows = allItems.map((r) => ({
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
  // chunk=50 — okrs_v2 has heavy JSONB fields (resultados_chave, raw_data)
  // that cause statement timeout at the default chunk size of 200
  if (rows.length > 0) await upsertBatch(supabase, "elofy_okrs_v2", dedup(rows), "elofy_id", 50);
  return rows.length;
}

async function syncGoalsContractV2() {
  const periodIds = await getPeriodIds();
  const allItems: Record<string, unknown>[] = [];

  for (const periodId of periodIds) {
    const items = await elofyGetAll<Record<string, unknown>>("/v2/dataQuery/goals_contract", { periodId });
    allItems.push(...items);
  }

  const rows = allItems.map((r) => ({
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
  // chunk=50 — goals_contract_v2 has heavy JSONB field (metas)
  if (rows.length > 0) await upsertBatch(supabase, "elofy_goals_contract_v2", dedup(rows), "elofy_id", 50);
  return rows.length;
}

async function syncBaseIndicators() {
  const periodIds = await getPeriodIds();
  const allItems: Record<string, unknown>[] = [];

  for (const periodId of periodIds) {
    const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/base_indicators", { periodId });
    allItems.push(...items);
  }

  const rows = allItems.map((r) => ({
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
  if (rows.length > 0) await upsertBatch(supabase, "elofy_base_indicators", dedup(rows));
  return rows.length;
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number> = {};

  const { elofyToken } = await req.json().catch(() => ({}));
  if (elofyToken) setElofyToken(elofyToken);

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
