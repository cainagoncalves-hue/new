import { createClient } from "npm:@supabase/supabase-js@2";

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
  chunkSize = 200,
) {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictColumn });
    if (error) throw new Error(`Upsert em ${table} falhou: ${error.message}`);
  }
}
