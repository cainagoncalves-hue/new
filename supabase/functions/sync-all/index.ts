import { checkTokenHealth, ElofyTokenExpiredError } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync } from "../_shared/supabase-client.ts";
import { notify } from "../_shared/notify.ts";

const supabase = getSupabaseClient();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";


async function invokeFunction(name: string): Promise<{ ok: boolean; error?: string; token_expired?: boolean }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
    });
    const body = await res.json();
    return body;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function buildResponse(
  results: Record<string, unknown>,
  hasError: boolean,
  _tokenExpired: boolean,
  _startedAt: string,
): Response {
  return new Response(
    JSON.stringify({ ok: !hasError, results }),
    { status: hasError ? 207 : 200, headers: { "Content-Type": "application/json" } },
  );
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();

  // Verifica saúde do token antes de iniciar o sync
  const health = await checkTokenHealth();

  if (!health.ok) {
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

  const results: Record<string, unknown> = {};
  let hasError = false;
  let tokenExpired = false;

  async function runAndRecord(name: string) {
    const r = await invokeFunction(name);
    results[name] = r;
    if (!r.ok) {
      hasError = true;
      if (r.error?.includes("Token do Elofy expirou") || r.token_expired) tokenExpired = true;
    }
  }

  // Fase 1: pares sequenciais para não sobrecarregar o rate limit da API Elofy
  // Par 1 — funções leves
  await Promise.all(["sync-estrutura", "sync-integracao"].map(runAndRecord));
  if (tokenExpired) return buildResponse(results, hasError, tokenExpired, startedAt);

  // Par 2 — médias
  await Promise.all(["sync-competencias", "sync-one-one-sucessao"].map(runAndRecord));
  if (tokenExpired) return buildResponse(results, hasError, tokenExpired, startedAt);

  // Par 3 — pesadas (OKRs + Feedback)
  await Promise.all(["sync-okrs", "sync-feedback"].map(runAndRecord));
  if (tokenExpired) return buildResponse(results, hasError, tokenExpired, startedAt);

  // Par 4 — pesadas (PDI + Pesquisas)
  await Promise.all(["sync-pdi", "sync-pesquisas"].map(runAndRecord));
  if (tokenExpired) return buildResponse(results, hasError, tokenExpired, startedAt);

  // Fase 2: sync-avaliacoes depende de elofy_periods (sync-okrs) — roda por último
  await runAndRecord("sync-avaliacoes");

  if (tokenExpired) {
    await notify({
      type: "token_expired",
      message: "🔴 Token do Elofy expirou durante o sync. Todas as funções foram interrompidas.",
      detail: "Acesse o Elofy, copie o novo token e atualize ELOFY_TOKEN nas secrets do Supabase.",
      timestamp: new Date().toISOString(),
    });

    await supabase.from("elofy_sync_logs").insert({
      entity: "sync-all",
      status: "token_expired",
      records_synced: 0,
      error_message: "Token expirado durante execução",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ ok: false, error: "token_expired", results }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  await logSync(
    supabase,
    "sync-all",
    hasError ? "error" : "success",
    0,
    hasError ? JSON.stringify(results) : undefined,
    startedAt,
  );

  return new Response(
    JSON.stringify({ ok: !hasError, results }),
    {
      status: hasError ? 207 : 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
