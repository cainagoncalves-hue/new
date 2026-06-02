import { elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";
import { dedup } from "../_shared/utils.ts";

const supabase = getSupabaseClient();

async function syncSurveys() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/surveys");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_pesquisa"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_pesquisa: String(r["nome_pesquisa"] ?? ""),
    id_tipo_pesquisa: String(r["id_tipo_pesquisa"] ?? ""),
    tipo_pesquisa: String(r["tipo_pesquisa"] ?? ""),
    id_questionario: String(r["id_questionario"] ?? ""),
    questionario: String(r["questionario"] ?? ""),
    data_inicio: String(r["data_inicio"] ?? ""),
    data_fim: String(r["data_fim"] ?? ""),
    situacao: String(r["situacao"] ?? ""),
    pesquisa_anonima: String(r["pesquisa_anonima"] ?? ""),
    numero_pendencias: String(r["numero_pendencias_enviadas"] ?? ""),
    numero_respondentes: String(r["numero_respondentes"] ?? ""),
    adesao: String(r["adesao"] ?? ""),
    status_pesquisa: String(r["status_pesquisa"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_surveys", rows);
  return rows.length;
}

// Quando fromDate é passado, busca todos os surveys a partir daquela data
// (sem LIMIT). Útil para re-sync pontual de um período específico.
// Sem fromDate, retorna os 30 mais recentes (comportamento padrão do cron).
async function getSurveyIds(fromDate?: string): Promise<string[]> {
  let query = supabase
    .from("elofy_surveys")
    .select("elofy_id")
    .order("data_inicio", { ascending: false });

  if (fromDate) {
    query = query.gte("data_inicio", fromDate);
  } else {
    query = query.limit(30);
  }

  const { data } = await query;
  return (data ?? []).map((r: { elofy_id: string }) => r.elofy_id).filter(Boolean);
}

function mapDismiss(r: Record<string, unknown>) {
  return {
    elofy_id: String(r["id_resposta"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    id_pesquisa: String(r["id_pesquisa"] ?? ""),
    nome_pesquisa: String(r["nome_pesquisa"] ?? ""),
    id_publico_pesquisa: String(r["id_publico_pesquisa"] ?? ""),
    id_usuario_desligado: String(r["id_usuario_desligado"] ?? ""),
    matricula_usuario_desligado: String(r["matricula_usuario_desligado"] ?? ""),
    usuario_desligado: String(r["usuario_desligado"] ?? ""),
    id_cargo_desligado: String(r["id_cargo_usuario_desligado"] ?? ""),
    cargo_desligado: String(r["cargo_usuario_desligado"] ?? ""),
    id_time_desligado: String(r["id_time_usuario_desligado"] ?? ""),
    time_desligado: String(r["time_usuario_desligado"] ?? ""),
    id_gestor_desligado: String(r["id_gestor_desligado"] ?? ""),
    matricula_gestor_desligado: String(r["matricula_gestor_desligado"] ?? ""),
    nome_gestor_desligado: String(r["nome_gestor_desligado"] ?? ""),
    data_desligamento: String(r["data_desligamento"] ?? ""),
    id_tipo_desligamento: String(r["id_tipo_desligamento"] ?? ""),
    tipo_desligamento: String(r["tipo_desligamento"] ?? ""),
    id_usuario_respondente: String(r["id_usuario_respondente"] ?? ""),
    matricula_respondente: String(r["matricula_usuario_respondente"] ?? ""),
    usuario_respondente: String(r["usuario_respondente"] ?? ""),
    id_cargo_respondente: String(r["id_cargo_respondente"] ?? ""),
    nome_cargo_respondente: String(r["nome_cargo_respondente"] ?? ""),
    id_time_respondente: String(r["id_time_usuario_respondente"] ?? ""),
    time_respondente: String(r["time_usuario_respondente"] ?? ""),
    modo_envio_pesquisa: String(r["modo_envio_pesquisa"] ?? ""),
    id_pergunta: String(r["id_pergunta"] ?? ""),
    id_resposta: String(r["id_resposta"] ?? ""),
    pergunta: String(r["pergunta"] ?? ""),
    justificativa: String(r["justificativa"] ?? ""),
    resposta: String(r["resposta"] ?? ""),
    status_pesquisa: String(r["status_pesquisa"] ?? ""),
    data_resposta: String(r["data_resposta"] ?? ""),
    id_categoria_pergunta: String(r["id_categoria_pergunta"] ?? ""),
    nome_categoria_pergunta: String(r["nome_categoria_pergunta"] ?? ""),
    status_pesquisa_ativa: String(r["status_pesquisa_ativa"] ?? ""),
    raw_data: r,
  };
}

function mapPulse(r: Record<string, unknown>) {
  return {
    elofy_id: String(r["id_resposta"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    id_pesquisa: String(r["id_pesquisa"] ?? ""),
    nome_pesquisa: String(r["nome_pesquisa"] ?? ""),
    situacao_pesquisa: String(r["situacao_pesquisa"] ?? ""),
    data_pulso: String(r["data_pulso"] ?? ""),
    data_resposta: String(r["data_resposta"] ?? ""),
    id_usuario: String(r["id_usuario"] ?? ""),
    usuario: String(r["usuario"] ?? ""),
    id_time: String(r["id_time"] ?? ""),
    time: String(r["time"] ?? ""),
    id_gestor: String(r["id_gestor"] ?? ""),
    gestor: String(r["gestor"] ?? ""),
    id_categoria_pergunta: String(r["id_categoria_pergunta"] ?? ""),
    categoria_pergunta: String(r["categoria_pergunta"] ?? ""),
    id_pergunta: String(r["id_pergunta"] ?? ""),
    pergunta: String(r["pergunta"] ?? ""),
    score_resposta: String(r["score_resposta"] ?? ""),
    resposta: String(r["resposta"] ?? ""),
    justificativa: String(r["justificativa"] ?? ""),
    id_resposta: String(r["id_resposta"] ?? ""),
    status_pesquisa: String(r["status_pesquisa"] ?? ""),
    id_publico_pesquisa: String(r["id_publico_pesquisa"] ?? ""),
    raw_data: r,
  };
}

function mapStandard(r: Record<string, unknown>) {
  return {
    elofy_id: String(r["id_resposta"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    id_pesquisa: String(r["id_pesquisa"] ?? ""),
    nome_pesquisa: String(r["nome_pesquisa"] ?? ""),
    situacao_pesquisa: String(r["situacao_pesquisa"] ?? ""),
    data_envio_pesquisa: String(r["data_envio_pesquisa"] ?? ""),
    id_usuario: String(r["id_usuario"] ?? ""),
    usuario: String(r["usuario"] ?? ""),
    id_cargo: String(r["id_cargo"] ?? ""),
    cargo: String(r["cargo"] ?? ""),
    id_time: String(r["id_time"] ?? ""),
    time: String(r["time"] ?? ""),
    id_gestor: String(r["id_gestor"] ?? ""),
    nome_gestor: String(r["nome_gestor"] ?? ""),
    status_resposta: String(r["status_resposta"] ?? ""),
    data_resposta: String(r["data_resposta"] ?? ""),
    id_categoria_pergunta: String(r["id_categoria_pergunta"] ?? ""),
    categoria_pergunta: String(r["categoria_pergunta"] ?? ""),
    id_tipo_pergunta: String(r["id_tipo_pergunta"] ?? ""),
    tipo_pergunta: String(r["tipo_pergunta"] ?? ""),
    id_pergunta: String(r["id_pergunta"] ?? ""),
    pergunta: String(r["pergunta"] ?? ""),
    resposta: String(r["resposta"] ?? ""),
    justificativa: String(r["justificativa"] ?? ""),
    status_pesquisa: String(r["status_pesquisa"] ?? ""),
    id_resposta: String(r["id_resposta"] ?? ""),
    id_publico_pesquisa: String(r["id_publico_pesquisa"] ?? ""),
    raw_data: r,
  };
}

function mapTemporal(r: Record<string, unknown>) {
  return {
    elofy_id: String(r["id_resposta"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    id_pesquisa: String(r["id_pesquisa"] ?? ""),
    nome_pesquisa: String(r["nome_pesquisa"] ?? ""),
    situacao_pesquisa: String(r["situacao_pesquisa"] ?? ""),
    data_envio_pesquisa: r["data_envio_pesquisa"] as string || null,
    id_tipo_respondente: String(r["id_tipo_respondente"] ?? ""),
    tipo_respondente: String(r["tipo_respondente"] ?? ""),
    id_usuario_respondente: String(r["id_usuario_respondente"] ?? ""),
    usuario_respondente: String(r["usuario_respondente"] ?? ""),
    id_cargo_respondente: String(r["id_cargo_usuario_respondente"] ?? ""),
    cargo_respondente: String(r["cargo_usuario_respondente"] ?? ""),
    id_time_respondente: String(r["id_time_usuario_respondente"] ?? ""),
    time_respondente: String(r["time_usuario_respondente"] ?? ""),
    id_usuario_avaliado: String(r["id_usuario_avaliado"] ?? ""),
    usuario_avaliado: String(r["usuario_avaliado"] ?? ""),
    id_cargo_avaliado: String(r["id_cargo_usuario_avaliado"] ?? ""),
    cargo_avaliado: String(r["cargo_usuario_avaliado"] ?? ""),
    id_time_avaliado: String(r["id_time_usuario_avaliado"] ?? ""),
    time_avaliado: String(r["time_usuario_avaliado"] ?? ""),
    data_admissao_avaliado: String(r["data_admissao_usuario_avaliado"] ?? ""),
    status_resposta: String(r["status_resposta"] ?? ""),
    data_resposta: String(r["data_resposta"] ?? ""),
    id_categoria_pergunta: String(r["id_categoria_pergunta"] ?? ""),
    categoria_pergunta: String(r["categoria_pergunta"] ?? ""),
    id_tipo_pergunta: String(r["id_tipo_pergunta"] ?? ""),
    tipo_pergunta: String(r["tipo_pergunta"] ?? ""),
    id_pergunta: String(r["id_pergunta"] ?? ""),
    pergunta: String(r["pergunta"] ?? ""),
    resposta: String(r["resposta"] ?? ""),
    justificativa: String(r["justificativa"] ?? ""),
    status_pesquisa: String(r["status_pesquisa"] ?? ""),
    id_resposta: String(r["id_resposta"] ?? ""),
    id_publico_pesquisa: String(r["id_publico_pesquisa"] ?? ""),
    raw_data: r,
  };
}

// Busca os 4 tipos de uma survey em paralelo e retorna as linhas agrupadas
async function fetchSurveyData(id: string) {
  const [dismissItems, pulseItems, standardItems, temporalItems] = await Promise.all([
    elofyGetAll<Record<string, unknown>>("/dataQuery/survey_dismiss", { id_pesquisa: id }),
    elofyGetAll<Record<string, unknown>>("/dataQuery/survey_pulse", { id_pesquisa: id }),
    elofyGetAll<Record<string, unknown>>("/dataQuery/survey_standard", { id_pesquisa: id }),
    elofyGetAll<Record<string, unknown>>("/dataQuery/survey_temporal", { id_pesquisa: id }),
  ]);
  return {
    dismiss: dismissItems.map(mapDismiss),
    pulse: pulseItems.map(mapPulse),
    standard: standardItems.map(mapStandard),
    temporal: temporalItems.map(mapTemporal),
  };
}

async function syncSurveyDetails(surveyIds: string[]) {
  const counts = { dismiss: 0, pulse: 0, standard: 0, temporal: 0 };

  // Processa um survey por vez (controla memória), mas os 4 tipos em paralelo (controla tempo)
  for (const id of surveyIds) {
    const { dismiss, pulse, standard, temporal } = await fetchSurveyData(id);

    await Promise.all([
      dismiss.length > 0 ? upsertBatch(supabase, "elofy_survey_dismiss", dedup(dismiss)) : Promise.resolve(),
      pulse.length > 0 ? upsertBatch(supabase, "elofy_survey_pulse", dedup(pulse)) : Promise.resolve(),
      standard.length > 0 ? upsertBatch(supabase, "elofy_survey_standard", dedup(standard)) : Promise.resolve(),
      temporal.length > 0 ? upsertBatch(supabase, "elofy_survey_temporal", dedup(temporal)) : Promise.resolve(),
    ]);

    counts.dismiss += dismiss.length;
    counts.pulse += pulse.length;
    counts.standard += standard.length;
    counts.temporal += temporal.length;
  }

  return counts;
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();

  // Aceita { from_date: "YYYY-MM-DD" } no body para re-sync direcionado por período.
  // Sem body (ex: chamada do cron), usa o comportamento padrão (últimos 30 surveys).
  let fromDate: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.from_date === "string") fromDate = body.from_date;
  } catch { /* body vazio ou não-JSON — ok */ }

  try {
    const surveysCount = await syncSurveys();
    const surveyIds = await getSurveyIds(fromDate);
    const counts = await syncSurveyDetails(surveyIds);

    const results = { surveys: surveysCount, ...counts, from_date: fromDate ?? "últimos 30" };
    const total = Object.values(results).reduce((a, b) => typeof b === "number" ? a + b : a, 0);
    await logSync(supabase, "sync-pesquisas", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-pesquisas", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
