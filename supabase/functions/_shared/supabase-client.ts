import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
  }

  return createClient(url, key);
}

export async function logSync(
  supabase: ReturnType<typeof getSupabaseClient>,
  entity: string,
  status: "success" | "error" | "running",
  recordsSynced = 0,
  errorMessage?: string,
  startedAt?: string,
) {
  if (status === "running") {
    const { data } = await supabase
      .from("elofy_sync_logs")
      .insert({ entity, status, started_at: new Date().toISOString() })
      .select("id")
      .single();
    return data?.id as string | undefined;
  }

  await supabase.from("elofy_sync_logs").insert({
    entity,
    status,
    records_synced: recordsSynced,
    error_message: errorMessage ?? null,
    started_at: startedAt ?? new Date().toISOString(),
    finished_at: new Date().toISOString(),
  });
}

export async function upsertBatch(
  supabase: ReturnType<typeof getSupabaseClient>,
  table: string,
  rows: Record<string, unknown>[],
  conflictColumn = "elofy_id",
) {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: conflictColumn });

  if (error) throw new Error(`Upsert em ${table} falhou: ${error.message}`);
}
