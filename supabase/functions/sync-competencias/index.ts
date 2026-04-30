import { elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncCompetencies() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/competencies");
  const rows = items.map((r) => ({
    elofy_id: r["ID competência"],
    competencia: r["Competência"],
    categoria: r["Categoria competência"],
    descricao: r["Descrição"],
    ids_times: r["IDs times"],
    nomes_times: r["Nomes times"],
    ids_cargos: r["IDs cargos"],
    nomes_cargos: r["Nomes cargos"],
    esperado: r["Esperado"],
    o_que_queremos: r["O que queremos"],
    o_que_nao_queremos: r["O que não queremos"],
    comportamentos: r["Comportamentos"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_competencies", rows);
  return rows.length;
}

async function syncCycleReviewConfig() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/cycle_review_config");
  const rows = items.map((r) => ({
    elofy_id: r["ID revisao"] + "_" + r["Etapa"],
    id_empresa: r["ID empresa"],
    nome_empresa: r["Nome Empresa"],
    id_revisao: r["ID revisao"],
    nome_ciclo: r["Nome ciclo"],
    id_ciclo: r["ID ciclo"],
    nome_revisao: r["Nome revisão de ciclo"],
    status_revisao: r["Status revisão de ciclo"],
    liberacao_notas: r["Liberação de notas"],
    calibracao_notas: r["Calibração de notas"],
    responder_avaliacoes: r["Responder avaliações"],
    ano: r["Ano"],
    janela: r["Janela"],
    trimestre_inicio: r["Trimestre início"],
    trimestre_fim: r["Trimestre fim"],
    data_inicio_ciclo: r["Data início do ciclo"],
    data_fim_ciclo: r["Data fim do ciclo"],
    dias_faltando: r["Dias Faltando para fim do ciclo"],
    regua: r["Régua"],
    data_corte_elegibilidade: r["Data de corte de elegibilidade"],
    tipo_publico: r["Tipo de público"],
    etapa: r["Etapa"],
    nome_etapa: r["Nome etapa"],
    autoavaliacao: r["Autoavaliação"],
    pares: r["Pares"],
    clientes_internos: r["Clientes internos"],
    gestor: r["Gestor"],
    equipe: r["Equipe"],
    permitir_comentarios: r["Permitir comentários nas respostas"],
    comentarios_obrigatorios: r["Comentários obrigatórios"],
    gestores_avaliados: r["Gestores serão avaliados no processo"],
    selecao_pares_rh: r["Habilitar a seleção de pares para o gestor de RH"],
    visualizacao_rapida_objetivos: r["Habilitar a visualização rápida de Objetivos"],
    avaliar_okr: r["Avaliar Objetivos e Resultados-Chave"],
    avaliar_responsaveis_kr: r["Avaliar responsáveis dos Resultados-chaves"],
    avaliar_responsaveis_corresps: r["Avaliar responsáveis e corresponsáveis dos Resultados-chaves"],
    nao_avaliar_kr_estrategicos: r["Não avaliar resultados-chaves de objetivos estratégicos"],
    avaliacao_por_entregas: r["Habilitar avaliação por entregas"],
    avaliacao_responsaveis_init: r["Habilitar avaliação pelos responsáveis das iniciativas"],
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
