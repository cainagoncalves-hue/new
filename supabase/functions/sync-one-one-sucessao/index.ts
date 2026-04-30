import { elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncOneOne() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/one_one");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_one_one"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    template: String(r["template"] ?? ""),
    status_one_one: String(r["status_one_one"] ?? ""),
    id_usuario_remetente: String(r["id_usuario_remetente"] ?? ""),
    nome_usuario_remetente: String(r["nome_usuario_remetente"] ?? ""),
    status_remetente: String(r["status_remetente"] ?? ""),
    id_gestor_remetente: String(r["id_gestor_remetente"] ?? ""),
    nome_gestor_remetente: String(r["nome_gestor_remetente"] ?? ""),
    data: r["data"] as string || null,
    horario: String(r["horario"] ?? ""),
    duracao: r["duracao"] as number,
    id_usuario_convidado: String(r["id_usuario_convidado"] ?? ""),
    nome_usuario_convidado: String(r["nome_usuario_convidado"] ?? ""),
    status_convidado: String(r["status_convidado"] ?? ""),
    motivo: String(r["motivo"] ?? ""),
    situacao: String(r["situacao"] ?? ""),
    id_ciclo_avaliacao: String(r["id_ciclo_avaliacao"] ?? ""),
    nome_ciclo_avaliacao: String(r["nome_ciclo_avaliacao"] ?? ""),
    tags: String(r["tags"] ?? ""),
    compartilhado: r["compartilhado"] ?? null,
    iniciativas: r["iniciativas"] ?? null,
    talking_points: r["talking_points"] ?? null,
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_one_one", rows);
  return rows.length;
}

async function syncSuccession() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/succession");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_cargo"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    nome_empresa: String(r["nome_empresa"] ?? ""),
    nome_cargo: String(r["nome_cargo"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    dificuldade: String(r["dificuldade"] ?? ""),
    impacto: String(r["impacto"] ?? ""),
    situacao_cargo: String(r["situacao_cargo"] ?? ""),
    classificacao: String(r["classificacao"] ?? ""),
    requisitos_posicao: String(r["requisitos_posicao"] ?? ""),
    usuarios_atuais: r["usuarios_atuais"] ?? null,
    sucessao: r["sucessao"] ?? null,
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_succession", rows);
  return rows.length;
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number> = {};

  try {
    results.one_one = await syncOneOne();
    results.succession = await syncSuccession();

    const total = results.one_one + results.succession;
    await logSync(supabase, "sync-one-one-sucessao", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-one-one-sucessao", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
