import { elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncCycleReviewDetailed() {
  const { data: publicReviews } = await supabase
    .from("elofy_cycle_review_public")
    .select("id_revisao_ciclo");

  const cycleIds = [...new Set(
    (publicReviews ?? []).map((r) => r.id_revisao_ciclo).filter(Boolean),
  )];

  let totalRoot = 0;
  let totalSteps = 0;
  let totalItems = 0;

  for (const cycleReviewId of cycleIds) {
    const items = await elofyGetAll<Record<string, unknown>>(
      "/dataQuery/cycle_review_detailed",
      { cycleReviewId },
    );

    const rootRows = items.map((r) => {
      const detailedId = String(r["id_revisao_ciclos_avaliacoes"]);
      return {
        elofy_id: detailedId,
        id_revisao_ciclo: String(r["id_revisao_ciclo"] ?? ""),
        ano: r["ano"] as number,
        nome_ciclo: String(r["nome_ciclo"] ?? ""),
        id_empresa: String(r["id_empresa"] ?? ""),
        id_revisao_ciclos_avaliacoes: detailedId,
        id_avaliado: String(r["id_avaliado"] ?? ""),
        matricula_avaliado: String(r["matricula_avaliado"] ?? ""),
        nome_avaliado: String(r["nome_avaliado"] ?? ""),
        id_time_avaliado: String(r["id_time_avaliado"] ?? ""),
        nome_time_avaliado: String(r["nome_time_avaliado"] ?? ""),
        tipo_cargo_avaliado: String(r["tipo_cargo_avaliado"] ?? ""),
        id_tipo_cargo_avaliado: String(r["id_tipo_cargo_avaliado"] ?? ""),
        id_cargo_avaliado: String(r["id_cargo_avaliado"] ?? ""),
        cargo_avaliado: String(r["cargo_avaliado"] ?? ""),
        id_gestor_avaliado: String(r["id_gestor_avaliado"] ?? ""),
        gestor_avaliado: String(r["gestor_avaliado"] ?? ""),
        media_final_avaliacao: String(r["media_final_avaliacao"] ?? ""),
        label_nbox: String(r["label_nbox"] ?? ""),
        quadrante_nbox: String(r["quadrante_nbox"] ?? ""),
        tipo_avaliacao: String(r["tipo_avaliacao"] ?? ""),
        id_avaliador: String(r["id_avaliador"] ?? ""),
        matricula_avaliador: String(r["matricula_avaliador"] ?? ""),
        avaliador: String(r["avaliador"] ?? ""),
        id_time_avaliador: String(r["id_time_avaliador"] ?? ""),
        nome_time_avaliador: String(r["nome_time_avaliador"] ?? ""),
        tipo_cargo_avaliador: String(r["tipo_cargo_avaliador"] ?? ""),
        id_cargo_avaliador: String(r["id_cargo_avaliador"] ?? ""),
        cargo_avaliador: String(r["cargo_avaliador"] ?? ""),
        raw_data: r,
      };
    });

    await upsertBatch(supabase, "elofy_cycle_review_detailed", rootRows);
    totalRoot += rootRows.length;

    for (const r of items) {
      const detailedId = String(r["id_revisao_ciclos_avaliacoes"]);
      const etapas = (r["etapas"] as Array<Record<string, unknown>>) ?? [];

      const stepRows = etapas.map((e) => ({
        elofy_id: String(e["id_revisao_ciclo_fases"]),
        cycle_review_detailed_id: detailedId,
        etapa: String(e["etapa"] ?? ""),
        media_fase: e["media_fase"] as number,
        nome_etapa: String(e["nome_etapa"] ?? ""),
        conceito_media_etapa: String(e["conceito_media_etapa"] ?? ""),
        comentario_unico_fase: String(e["comentario_unico_fase"] ?? ""),
        id_revisao_ciclo_fases: String(e["id_revisao_ciclo_fases"] ?? ""),
        raw_data: e,
      }));

      await upsertBatch(supabase, "elofy_cycle_review_steps", stepRows);
      totalSteps += stepRows.length;

      for (const e of etapas) {
        const stepId = String(e["id_revisao_ciclo_fases"]);
        const itens = (e["itens_avaliacao"] as Array<Record<string, unknown>>) ?? [];

        const itemRows = itens.map((i) => ({
          elofy_id: String(i["id_revisao_ciclo_avaliacoes_fase"]),
          step_id: stepId,
          nota: i["nota"] as number,
          conceito: String(i["conceito"] ?? ""),
          comentario: String(i["comentario"] ?? ""),
          item_avaliado: String(i["item_avaliado"] ?? ""),
          id_revisao_ciclo_avaliacoes_fase: String(i["id_revisao_ciclo_avaliacoes_fase"] ?? ""),
          raw_data: i,
        }));

        await upsertBatch(supabase, "elofy_cycle_review_items", itemRows);
        totalItems += itemRows.length;
      }
    }
  }

  return { root: totalRoot, steps: totalSteps, items: totalItems };
}

async function syncCycleReviewPublic() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/cycle_review_public");
  const rows = items.map((r) => ({
    elofy_id: r["ID revisão de ciclo score"],
    id_empresa: r["ID Empresa"],
    id_revisao_score: r["ID revisão de ciclo score"],
    id_revisao_ciclo: r["ID revisão de ciclo"],
    nome_revisao: r["Nome revisão de ciclo"],
    id_usuario_avaliado: r["ID usuário avaliado"],
    matricula_avaliado: r["Matrícula usuário avaliado"],
    nome_avaliado: r["Nome usuário avaliado"],
    status_avaliado: r["Status usuário avaliado"],
    media_final: r["media_final"],
    fase: r["Fase"],
    media_fase: r["Media fase"],
    media_fase_auto: r["Media fase auto"],
    media_fase_gestor: r["Media fase gestor"],
    media_fase_pares: r["Media fase pares"],
    media_fase_equipe: r["Media fase equipe"],
    media_fase_cliente: r["Media fase cliente"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_cycle_review_public", rows);
  return rows.length;
}

async function syncCycleReviewNoteStep() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/cycle_review_public_note_step");
  const rows = items.map((r) => ({
    elofy_id: r["id_revisao_ciclo_score"],
    id_empresa: r["id_empresa"],
    id_revisao_score: r["id_revisao_ciclo_score"],
    id_revisao_ciclo: r["id_revisao_ciclo"],
    nome_revisao: r["nome_revisao_ciclo"],
    id_usuario_avaliado: r["id_usuario_avaliado"],
    nome_usuario: r["nome_usuario"],
    status_avaliado: r["status_usuario_avaliado"],
    id_gestor: r["id_gestor"],
    nome_gestor: r["nome_gestor"],
    media_final_ciclo: r["media_final_ciclo"],
    conceito_final_ciclo: r["conceito_final_ciclo"],
    conceito_final_ciclo_calibrado: r["conceito_final_ciclo_calibrado"],
    nine_box: r["nine_box"],
    quadrante_nbox: r["quadrante_nbox"],
    quadrante_nbox_calibrado: r["quadrante_nbox_calibrado"],
    media_fase_competencia: r["media_fase_competencia"],
    conceito_fase_competencia: r["conceito_fase_competencia"],
    media_competencia_auto: r["media_competencia_auto"],
    conceito_competencia_auto: r["conceito_media_competencia_auto"],
    media_competencia_gestor: r["media_competencia_gestor"],
    conceito_competencia_gestor: r["conceito_competencia_gestor"],
    media_competencia_pares: r["media_competencia_pares"],
    conceito_competencia_par: r["conceito_competencia_par"],
    media_competencia_time: r["media_competencia_time"],
    conceito_competencia_time: r["conceito_competencia_time"],
    media_competencias_clientes: r["media_competencias_clientes"],
    conceito_competencia_clientes: r["conceito_competencia_clientes"],
    media_resultados: r["media_resultados"],
    conceito_resultados: r["conceito_resultados"],
    media_resultados_auto: r["media_resultados_auto"],
    conceito_resultados_auto: r["conceito_resultados_auto"],
    media_resultados_gestor: r["media_resultados_gestor"],
    conceito_resultados_gestor: r["conceito_resultados_gestor"],
    media_resultados_pares: r["media_resultados_pares"],
    conceito_resultados_pares: r["conceito_resultados_pares"],
    media_resultados_time: r["media_resultados_time"],
    conceito_resultados_time: r["conceito_resultados_time"],
    media_resultados_clientes: r["media_resultados_clientes"],
    conceito_resultados_clientes: r["conceito_resultados_clientes"],
    media_valores: r["media_valores"],
    conceito_valores: r["conceito_valores"],
    media_valores_auto: r["media_valores_auto"],
    conceito_valores_auto: r["conceito_valores_auto"],
    media_valores_gestor: r["media_valores_gestor"],
    conceito_valores_gestor: r["conceito_valores_gestor"],
    media_valores_pares: r["media_valores_pares"],
    conceito_valores_pares: r["conceito_valores_pares"],
    media_valores_time: r["media_valores_time"],
    conceito_valores_time: r["conceito_valores_time"],
    media_valores_clientes: r["media_valores_clientes"],
    conceito_valores_clientes: r["conceito_valores_clientes"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_cycle_review_note_step", rows);
  return rows.length;
}

async function syncAvgCompetencies() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/cycle_review_average_step_competencies");
  const rows = items.map((r) => ({
    elofy_id: r["ID_revisao_ciclo_score"],
    id_empresa: r["ID_empresa"],
    id_revisao_score: r["ID_revisao_ciclo_score"],
    id_revisao_ciclo: r["ID_revisao_ciclo"],
    nome_revisao: r["nome_revisao_ciclo"],
    periodo: r["Período"],
    id_usuario_avaliado: r["ID_usuario_avaliado"],
    nome_usuario_avaliado: r["nome_usuario_avaliado"],
    id_gestor: r["ID_gestor"],
    nome_gestor: r["nome_gestor"],
    conceito_final_ciclo: r["conceito_final_ciclo"],
    media_final_ciclo_calibrado: r["media_final_ciclo_calibrado"],
    conceito_final_ciclo_calibrado: r["conceito_final_ciclo_calibrado"],
    media_competencia: r["media_competencia"],
    media_competencia_auto: r["media_competencia_auto"],
    media_competencia_gestor: r["media_competencia_gestor"],
    media_competencia_pares: r["media_competencia_pares"],
    media_competencia_equipe: r["media_competencia_equipe"],
    media_competencia_clientes: r["media_competencia_clientes"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_cycle_review_avg_competencies", rows);
  return rows.length;
}

async function syncAvgResults() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/cycle_review_average_step_results");
  const rows = items.map((r) => ({
    elofy_id: r["ID_revisao_ciclo_avaliacoes_fase"],
    id_empresa: r["ID_empresa"],
    id_revisao_avaliacoes_fase: r["ID_revisao_ciclo_avaliacoes_fase"],
    id_revisao_ciclo: r["ID_revisao_ciclo"],
    nome_revisao: r["nome_revisao_ciclo"],
    id_usuario_avaliado: r["ID_usuario_avaliado"],
    nome_usuario_avaliado: r["nome_usuario_avaliado"],
    id_gestor: r["ID_gestor"],
    nome_gestor: r["nome_gestor"],
    conceito_final_ciclo: r["conceito_final_ciclo"],
    media_final_ciclo_calibrado: r["media_final_ciclo_calibrado"],
    conceito_final_ciclo_calibrado: r["conceito_final_ciclo_calibrado"],
    media_final_fase_resultados: r["media_final_fase_resultados"],
    item_avaliado: r["Item_avaliado"],
    media_item_avaliado: r["media_item_avaliado"],
    media_item_auto: r["media_item_auto"],
    media_item_gestor: r["media_item_gestor"],
    media_item_pares: r["media_item_pares"],
    media_item_equipe: r["media_item_equipe"],
    media_item_clientes: r["media_item_clientes"],
    media_final: r["media_final"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_cycle_review_avg_results", rows);
  return rows.length;
}

async function syncNinebox() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/cycle_review_ninebox");
  const rows = items.map((r) => ({
    elofy_id: r["id_revisao_ciclo_score"],
    id_empresa: r["id_empresa"],
    id_revisao_score: r["id_revisao_ciclo_score"],
    id_revisao_ciclo: r["id_revisao_ciclo"],
    periodo: r["periodo"],
    nome_revisao: r["nome_revisao_ciclo"],
    data_inicio: r["data_inicio"] || null,
    data_fim: r["data_fim"] || null,
    id_usuario_avaliado: r["id_usuario_avaliado"],
    nome_usuario_avaliado: r["nome_usuario_avaliado"],
    status_avaliado: r["status_usuario_avaliado"],
    id_gestor: r["id_gestor"],
    nome_gestor: r["nome_gestor"],
    media_final_ciclo: r["media_final_ciclo"],
    conceito_final_ciclo: r["conceito_final_ciclo"],
    conceito_final_ciclo_calibrado: r["conceito_final_ciclo_calibrado"],
    fase_eixo_x: r["fase_eixo_x_nbox"],
    nota_eixo_x: r["nota_eixo_x_nbox"],
    fase_eixo_y: r["fase_eixo_y_nbox"],
    nota_eixo_y: r["nota_eixo_y_nbox"],
    quadrante_nbox: r["quadrante_nbox"],
    quadrante_nbox_calibrado: r["quadrante_nbox_calibrado"],
    pessoa_chave: r["pessoa_chave"],
    talento: r["talento"],
    singular: r["singular"],
    reconhecimento: r["reconhecimento"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_cycle_review_ninebox", rows);
  return rows.length;
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();
  const results: Record<string, unknown> = {};

  try {
    results.cycle_review_public = await syncCycleReviewPublic();
    results.cycle_review_detailed = await syncCycleReviewDetailed();
    results.cycle_review_note_step = await syncCycleReviewNoteStep();
    results.avg_competencies = await syncAvgCompetencies();
    results.avg_results = await syncAvgResults();
    results.ninebox = await syncNinebox();

    await logSync(supabase, "sync-avaliacoes", "success", 0, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-avaliacoes", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
