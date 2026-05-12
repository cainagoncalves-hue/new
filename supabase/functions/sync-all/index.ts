import { checkTokenHealth, ElofyTokenExpiredError } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync } from "../_shared/supabase-client.ts";
import { notify } from "../_shared/notify.ts";

const supabase = getSupabaseClient();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FUNCTIONS = [
  "sync-estrutura",
  "sync-competencias",
  "sync-okrs",        // sincroniza períodos primeiro — outros dependem deles
  "sync-avaliacoes",  // depende de elofy_periods (sync-okrs) e elofy_surveys (sync-pesquisas roda depois)
  "sync-pdi",
  "sync-feedback",
  "sync-one-one-sucessao",
  "sync-pesquisas",
  "sync-integracao",
];

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

  for (const fn of FUNCTIONS) {
    const result = await invokeFunction(fn);
    results[fn] = result;

    if (!result.ok) {
      hasError = true;
      // Se qualquer função retornar token expirado, interrompe o restante
      if (result.error?.includes("Token do Elofy expirou") || result.token_expired) {
        tokenExpired = true;
        break;
      }
    }
  }

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
