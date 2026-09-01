import { elofyGetAll, setElofyToken } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";
import { dedup, parseDate } from "../_shared/utils.ts";

const supabase = getSupabaseClient();

async function syncFeedbacks() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/feedbacks");
  const rows = items.map((r) => ({
    elofy_id: r["id_feedback"],
    id_empresa: r["id_empresa"],
    acao: r["acao"],
    data_feedback: parseDate(r["data_feedback"]),
    prazo_esperado: parseDate(r["prazo_esperado"]),
    id_usuario_remetente: r["id_usuario_remetente"],
    matricula_remetente: r["matricula_usuario_remetente"],
    usuario_remetente: r["usuario_remetente"],
    cargo_remetente: r["cargo_usuario_remetente"],
    time_remetente: r["time_usuario_remetente"],
    id_usuario_destinatario: r["id_usuario_destinatario"],
    matricula_destinatario: r["matricula_usuario_destinatario"],
    usuario_destinatario: r["usuario_destinatario"],
    cargo_destinatario: r["cargo_usuario_destinatario"],
    time_destinatario: r["time_usuario_destinatario"],
    tipo_feedback: r["tipo_feedback"],
    solicitacao: r["solicitacao"],
    pergunta: r["pergunta"],
    resposta: r["resposta"],
    valores_competencias: r["valores_competencias_percebidas"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_feedbacks", dedup(rows));
  return rows.length;
}

async function syncPraisesBoard() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/praises_board");
  const rows = items.map((r) => ({
    elofy_id: r["id_elogio"],
    id_empresa: r["id_empresa"],
    elogio: r["elogio"],
    data: parseDate(r["data"]),
    hora: r["hora"],
    id_usuario_remetente: r["id_usuario_remetente"],
    usuario_remetente: r["usuario_remetente"],
    badge: r["badge"],
    tags: r["tags"],
    id_usuario_elogiado: r["id_usuario_elogiado"],
    usuario_elogiado: r["usuario_elogiado"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_praises_board", dedup(rows));
  return rows.length;
}

async function syncFeelings() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/feelings");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_sentimento"]),
    id_empresa: String(r["id_empresa"] ?? ""),
    id_usuario: String(r["id_usuario"] ?? ""),
    usuario: String(r["usuario"] ?? ""),
    id_cargo: String(r["id_cargo"] ?? ""),
    cargo: String(r["cargo"] ?? ""),
    id_time: String(r["id_time"] ?? ""),
    time: String(r["time"] ?? ""),
    id_gestor: String(r["id_gestor"] ?? ""),
    gestor: String(r["gestor"] ?? ""),
    id_tipo_sentimento: String(r["id_tipo_sentimento"] ?? ""),
    tipo_sentimento: String(r["tipo_sentimento"] ?? ""),
    id_motivo: String(r["id_motivo"] ?? ""),
    motivo: String(r["motivo"] ?? ""),
    comentario: String(r["comentario"] ?? ""),
    data_criacao: String(r["data_criacao"] ?? ""),
    hora_criacao: String(r["hora_criacao"] ?? ""),
    categorias_trabalho: r["categorias_trabalho"] ?? null,
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_feelings", rows);
  return rows.length;
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number> = {};

  const { elofyToken } = await req.json().catch(() => ({}));
  if (elofyToken) setElofyToken(elofyToken);

  try {
    results.feedbacks = await syncFeedbacks();
    results.praises_board = await syncPraisesBoard();
    results.feelings = await syncFeelings();

    const total = Object.values(results).reduce((a, b) => a + b, 0);
    await logSync(supabase, "sync-feedback", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-feedback", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
