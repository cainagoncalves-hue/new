import { getElofyToken } from "../_shared/elofy-client.ts";

const BASE_URL = Deno.env.get("ELOFY_BASE_URL") ?? "https://api.elofy.com.br";

Deno.serve(async () => {
  const token = await getElofyToken();

  const endpoints = [
    "/dataQuery/teams?page=1&perPage=5",
    "/dataQuery/users?page=1&perPage=5",
    "/dataQuery/periods?page=1&perPage=5",
  ];

  const results: Record<string, unknown> = {};

  for (const path of endpoints) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { parsed = raw; }
    results[path] = {
      status: res.status,
      isArray: Array.isArray(parsed),
      type: typeof parsed,
      keys: typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? Object.keys(parsed as object)
        : null,
      length: Array.isArray(parsed) ? parsed.length : null,
      preview: Array.isArray(parsed) ? parsed[0] : parsed,
    };
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
