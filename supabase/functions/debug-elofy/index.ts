import { getElofyToken } from "../_shared/elofy-client.ts";

const BASE_URL = Deno.env.get("ELOFY_BASE_URL") ?? "https://api.elofy.com.br";

async function probe(token: string, path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { error: res.status, body: await res.text() };
  const raw = await res.json();
  const items: unknown[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
  return {
    isArray: Array.isArray(raw),
    wrapperKeys: Array.isArray(raw) ? null : Object.keys(raw),
    total: raw?.total ?? items.length,
    firstItemKeys: items[0] ? Object.keys(items[0] as object) : [],
    firstItem: items[0] ?? null,
  };
}

Deno.serve(async () => {
  const token = await getElofyToken();

  const endpoints = [
    "/dataQuery/company?page=1&perPage=2",
    "/dataQuery/positions?page=1&perPage=2",
    "/dataQuery/cycles?page=1&perPage=2",
    "/dataQuery/objectives?page=1&perPage=2",
    "/dataQuery/key_results?page=1&perPage=2",
    "/dataQuery/feedbacks?page=1&perPage=2",
    "/dataQuery/feelings?page=1&perPage=2",
    "/dataQuery/one_one?page=1&perPage=2",
    "/dataQuery/praises_board?page=1&perPage=2",
    "/dataQuery/surveys?page=1&perPage=2",
    "/dataQuery/succession?page=1&perPage=2",
    "/dataQuery/competencies?page=1&perPage=2",
    "/dataQuery/cycle_review_config?page=1&perPage=2",
    "/dataQuery/integration_situation?page=1&perPage=2",
    "/dataQuery/integration_batch?page=1&perPage=2",
  ];

  const results: Record<string, unknown> = {};
  for (const path of endpoints) {
    results[path] = await probe(token, path);
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
