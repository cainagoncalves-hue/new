import { checkTokenHealth } from "../_shared/elofy-client.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";
import { notify } from "../_shared/notify.ts";

const supabase = getSupabaseClient();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALL_FUNCTIONS = [
  "sync-estrutura",
  "sync-competencias",
  "sync-okrs",
  "sync-pdi",
  "sync-feedback",
  "sync-one-one-sucessao",
  "sync-pesquisas",
  "sync-integracao",
  "sync-avaliacoes",
];

function fireFunction(name: string): void {
  fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  }).catch(() => {});
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();

  const health = await checkTokenHealth();

  if (!health.ok) {
    await notify({
      type: "token_expired",
      message: "🔴 Token do Elofy expirou. Sync não iniciado.",
      detail: "Acesse o Elofy, copie o novo token e atualize ELOFY_TOKEN nas secrets do Supabase.",
      timestamp: startedAt,
    });

    await supabase.from("elofy_sync_logs").insert({
      entity: "sync-all",
      status: "token_expired",
      records_synced: 0,
      error_message: health.message,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: false, error: "token_expired", detail: health.message }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // Dispara todas as funções em background (fire-and-forget).
  // Cada função loga seu próprio resultado em elofy_sync_logs.
  for (const fn of ALL_FUNCTIONS) {
    fireFunction(fn);
  }

  await supabase.from("elofy_sync_logs").insert({
    entity: "sync-all",
    status: "success",
    records_synced: 0,
    error_message: null,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({ ok: true, triggered: ALL_FUNCTIONS }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
