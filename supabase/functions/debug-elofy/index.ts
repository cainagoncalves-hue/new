import { getElofyToken } from "../_shared/elofy-client.ts";
import { getSupabaseClient } from "../_shared/supabase-client.ts";

const BASE_URL = Deno.env.get("ELOFY_BASE_URL") ?? "https://api.elofy.com.br";
const supabase = getSupabaseClient();

async function probe(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { error: res.status, body: await res.text() };
  const buf = await res.arrayBuffer();
  const raw = JSON.parse(new TextDecoder("utf-8").decode(buf));
  const items: unknown[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
  return {
    isArray: Array.isArray(raw),
    total: raw?.total ?? items.length,
    firstItemKeys: items[0] ? Object.keys(items[0] as object) : [],
    firstItem: items[0] ?? null,
  };
}

Deno.serve(async () => {
  const token = await getElofyToken();

  // Pegar o primeiro periodId disponível no banco
  const { data: periods } = await supabase.from("elofy_periods").select("elofy_id").limit(1);
  const periodId = periods?.[0]?.elofy_id ?? "2074";

  const endpoints: Record<string, string> = {
    objectives: `/dataQuery/objectives?periodId=${periodId}&page=1&perPage=2`,
    key_results: `/dataQuery/key_results?periodId=${periodId}&page=1&perPage=2`,
    cycle_review_public: `/dataQuery/cycle_review_public?periodId=${periodId}&page=1&perPage=2`,
    avg_competencies: `/dataQuery/cycle_review_average_step_competencies?periodId=${periodId}&page=1&perPage=2`,
    avg_results: `/dataQuery/cycle_review_average_step_results?periodId=${periodId}&page=1&perPage=2`,
    surveys: `/dataQuery/surveys?page=1&perPage=2`,
    competencies: `/dataQuery/competencies?page=1&perPage=2`,
    cycle_review_config: `/dataQuery/cycle_review_config?page=1&perPage=2`,
  };

  const results: Record<string, unknown> = { periodId };
  for (const [name, path] of Object.entries(endpoints)) {
    results[name] = await probe(token, path);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
