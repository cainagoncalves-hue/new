import { elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncCompetencies() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/competencies");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_competencia"]),
    competencia: String(r["competencia"] ?? ""),
    categoria: String(r["categoria_competencia"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    ids_times: String(r["ids_times"] ?? ""),
    nomes_times: String(r["nomes_times"] ?? ""),
    ids_cargos: String(r["ids_cargos"] ?? ""),
    nomes_cargos: String(r["nomes_cargos"] ?? ""),
    esperado: String(r["esperado"] ?? ""),
    o_que_queremos: String(r["o_que_queremos"] ?? ""),
    o_que_nao_queremos: String(r["o_que_nao_queremos"] ?? ""),
    comportamentos: String(r["comportamentos"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_competencies", rows);
  return rows.length;
}

async function syncCycleReviewConfig() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/cycle_review_config");
  const rows = items.map((r) => ({
    // composite: mesmo ciclo tem múltiplas etapas, id_revisao + etapa é único
    elofy_id: `${String(r["id_revisao"])}_${String(r["etapa"])}`,
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    id_revisao: String(r["id_revisao"] ?? ""),
    nome_ciclo: String(r["nome_ciclo"] ?? ""),
    id_ciclo: String(r["id_ciclo"] ?? ""),
    nome_revisao: String(r["nome_revisao_ciclo"] ?? ""),
    status_revisao: String(r["status_revisao_ciclo"] ?? ""),
    liberacao_notas: String(r["liberacao_notas"] ?? ""),
    calibracao_notas: String(r["calibracao_notas"] ?? ""),
    responder_avaliacoes: String(r["responder_avaliacoes"] ?? ""),
    ano: String(r["ano"] ?? ""),
    janela: String(r["janela"] ?? ""),
    trimestre_inicio: String(r["trimestre_inicio"] ?? ""),
    trimestre_fim: String(r["trimestre_fim"] ?? ""),
    data_inicio_ciclo: String(r["data_inicio_ciclo"] ?? ""),
    data_fim_ciclo: String(r["data_fim_ciclo"] ?? ""),
    dias_faltando: String(r["dias_faltando_para_fim_do_ciclo"] ?? ""),
    regua: String(r["regua"] ?? ""),
    data_corte_elegibilidade: String(r["data_corte_elegibilidade"] ?? ""),
    tipo_publico: String(r["tipo_publico"] ?? ""),
    etapa: String(r["etapa"] ?? ""),
    nome_etapa: String(r["nome_etapa"] ?? ""),
    autoavaliacao: String(r["autoavaliacao"] ?? ""),
    pares: String(r["pares"] ?? ""),
    clientes_internos: String(r["clientes_internos"] ?? ""),
    gestor: String(r["gestor"] ?? ""),
    equipe: String(r["equipe"] ?? ""),
    permitir_comentarios: String(r["permitir_comentarios_nas_respostas"] ?? ""),
    comentarios_obrigatorios: String(r["comentarios_obrigatorios"] ?? ""),
    gestores_avaliados: String(r["gestores_serao_avaliados_no_processo"] ?? ""),
    selecao_pares_rh: String(r["habilitar_a_selecao_pares_para_o_gestor_rh"] ?? ""),
    visualizacao_rapida_objetivos: String(r["habilitar_a_visualizacao_rapida_objetivos"] ?? ""),
    avaliar_okr: String(r["avaliar_objetivos_e_resultados_chave"] ?? ""),
    avaliar_responsaveis_kr: String(r["avaliar_responsaveis_dos_resultados_chaves"] ?? ""),
    avaliar_responsaveis_corresps: String(r["avaliar_responsaveis_e_corresponsaveis_dos_resultados_chaves"] ?? ""),
    nao_avaliar_kr_estrategicos: String(r["nao_avaliar_resultados_chaves_objetivos_estrategicos"] ?? ""),
    avaliacao_por_entregas: String(r["habilitar_avaliacao_por_entregas"] ?? ""),
    avaliacao_responsaveis_init: String(r["habilitar_avaliacao_pelos_responsaveis_das_iniciativas"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_cycle_review_config", rows);
  return rows.length;
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number> = {};

  try {
    results.competencies = await syncCompetencies();
    results.cycle_review_config = await syncCycleReviewConfig();

    const total = results.competencies + results.cycle_review_config;
    await logSync(supabase, "sync-competencias", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-competencias", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
