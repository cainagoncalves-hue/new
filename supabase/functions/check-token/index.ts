import { checkTokenHealth } from "../_shared/elofy-client.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

Deno.serve(async () => {
  const result = await checkTokenHealth();

  // Registra o resultado no sync_logs para histórico
  await supabase.from("elofy_sync_logs").insert({
    entity: "check-token",
    status: result.ok ? "success" : "token_expired",
    records_synced: 0,
    error_message: result.ok ? null : result.message,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 401,
    headers: { "Content-Type": "application/json" },
  });
});
