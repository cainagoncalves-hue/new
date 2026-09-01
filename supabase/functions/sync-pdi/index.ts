import { elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";
import { dedup, parseDate, toInt } from "../_shared/utils.ts";

const supabase = getSupabaseClient();

async function syncPdi() {
  const year = new Date().getFullYear();
  const initialDate = `01/01/${year}`;
  const finalDate = `31/12/${year}`;
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/pdi", { initialDate, finalDate });
  const rows = items.map((r) => ({
    elofy_id: r["ID PDI"] + "_" + r["id_iniciativa"],
    id_empresa: r["ID Empresa"],
    id_responsavel: r["ID Responsável"],
    matricula: r["Matrícula"],
    responsavel: r["Responsável"],
    titulo_pdi: r["Título PDI"],
    cargo_responsavel: r["Cargo responsável"],
    time_responsavel: r["Time responsável"],
    cargos_vinculados: r["Cargos vinculados"],
    competencias_vinculadas: r["Competências vinculadas"],
    prazo: r["Prazo"],
    status_pdi: r["Status PDI"],
    progresso_pdi: r["Progresso PDI(%)"],
    situacao_pdi: r["Situação PDI"],
    id_iniciativa: r["id_iniciativa"],
    iniciativa: r["Iniciativa"],
    tipo_iniciativa: r["Tipo iniciativa"],
    prazo_iniciativa: r["prazo_iniciativa"],
    status_iniciativa_label: r["Status iniciativa"],
    progresso_iniciativa: r["Progresso iniciativa"],
    status_iniciativa: r["status_iniciativa"],
    data_conclusao: r["Data de conclusão"],
    data_criacao_iniciativa: r["data_criacao_iniciativa"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_pdi", dedup(rows));
  return rows.length;
}

async function syncInitiatives() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/initiatives");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_iniciativa"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    iniciativa: String(r["iniciativa"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    nro_sub_iniciativas: toInt(r["nro_sub_iniciativas"]),
    id_iniciativa_pai: String(r["id_iniciativa_pai"] ?? ""),
    nome_iniciativa_pai: String(r["nome_iniciativa_pai"] ?? ""),
    status_iniciativa: String(r["status_iniciativa"] ?? ""),
    data_inicio: parseDate(r["data_inicio"]),
    data_final: parseDate(r["data_final"]),
    situacao_iniciativa: String(r["situacao_iniciativa"] ?? ""),
    progresso_iniciativa: toInt(r["progresso_iniciativa"]),
    data_conclusao: parseDate(r["data_conclusao"]),
    disponivel_avaliacao: String(r["disponivel_avaliacao"] ?? ""),
    origem: String(r["origem"] ?? ""),
    tags: String(r["tags"] ?? ""),
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
    corresponsaveis: String(r["corresponsaveis_iniciativa"] ?? ""),
    id_resultado_chave: String(r["id_resultado_chave"] ?? ""),
    resultado_chave: String(r["resultado_chave"] ?? ""),
    progresso_resultado_chave: toInt(r["progresso_resultado_chave"]),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_initiatives", dedup(rows));
  return rows.length;
}

async function syncInitiativesPdi() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/initiatives_pdi");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_iniciativa"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    iniciativa: String(r["iniciativa"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    status_iniciativa: String(r["status_iniciativa"] ?? ""),
    data_inicio: String(r["data_inicio"] ?? ""),
    data_final: String(r["data_final"] ?? ""),
    situacao_iniciativa: String(r["situacao_iniciativa"] ?? ""),
    data_conclusao: String(r["data_conclusao"] ?? ""),
    progresso_iniciativa: toInt(r["progresso_iniciativa"]),
    disponivel_avaliacao: String(r["disponivel_avaliacao"] ?? ""),
    origem: String(r["origem"] ?? ""),
    tags: String(r["tags"] ?? ""),
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
    data_criacao: String(r["data_criacao_iniciativa"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_initiatives_pdi", rows);
  return rows.length;
}

async function syncInitiativesOneOne() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/initiatives_one_one");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_iniciativa"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    iniciativa: String(r["iniciativa"] ?? ""),
    status_iniciativa: String(r["status_iniciativa"] ?? ""),
    data_inicio: String(r["data_inicio"] ?? ""),
    data_final: String(r["data_final"] ?? ""),
    situacao_iniciativa: String(r["situacao_iniciativa"] ?? ""),
    data_conclusao: String(r["data_conclusao"] ?? ""),
    progresso_iniciativa: toInt(r["progresso_iniciativa"]),
    disponivel_avaliacao: String(r["disponivel_avaliacao"] ?? ""),
    origem: String(r["origem"] ?? ""),
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
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_initiatives_one_one", rows);
  return rows.length;
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number> = {};

  try {
    results.pdi = await syncPdi();
    results.initiatives = await syncInitiatives();
    results.initiatives_pdi = await syncInitiativesPdi();
    results.initiatives_one_one = await syncInitiativesOneOne();

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    await logSync(supabase, "sync-pdi", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-pdi", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
