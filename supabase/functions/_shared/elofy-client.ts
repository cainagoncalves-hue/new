import { notify } from "./notify.ts";

const BASE_URL = Deno.env.get("ELOFY_BASE_URL") ?? "https://api.elofy.com.br";

export class ElofyTokenExpiredError extends Error {
  constructor() {
    super("Token do Elofy expirou (HTTP 401). Configure ELOFY_TOKEN com um token novo.");
    this.name = "ElofyTokenExpiredError";
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split(".");
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

let cachedToken: string | null = null;

export async function getElofyToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  // Opção 1: token estático via variável de ambiente
  const staticToken = Deno.env.get("ELOFY_TOKEN");
  if (staticToken) {
    checkTokenAging(staticToken);
    cachedToken = staticToken;
    return cachedToken;
  }

  // Opção 2: autenticar via email + senha
  const email = Deno.env.get("ELOFY_EMAIL");
  const password = Deno.env.get("ELOFY_PASSWORD");

  if (!email || !password) {
    throw new Error(
      "Configure ELOFY_TOKEN (token estático) ou ELOFY_EMAIL + ELOFY_PASSWORD",
    );
  }

  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Elofy login falhou: ${res.status} ${await res.text()}`);
  }

  const { token } = await res.json();
  cachedToken = token;
  return token;
}

export async function elofyGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const token = await getElofyToken();
  const url = new URL(`${BASE_URL}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    await notify({
      type: "token_expired",
      message: "🔴 Token do Elofy expirou. Sync interrompido.",
      detail: `Endpoint: ${path} | HTTP ${res.status}`,
      timestamp: new Date().toISOString(),
    });
    throw new ElofyTokenExpiredError();
  }

  if (!res.ok) {
    throw new Error(`Elofy GET ${path} falhou: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function elofyGetAll<T>(
  path: string,
  extraParams: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const batch = await elofyGet<T>(path, { ...extraParams, page, perPage });
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return all;
}

// Verifica a saúde do token sem executar sync completo
export async function checkTokenHealth(): Promise<{ ok: boolean; ageDays?: number; message: string }> {
  const token = Deno.env.get("ELOFY_TOKEN");
  if (token) {
    const payload = decodeJwtPayload(token);
    const createdAt = payload["created_at"] as number | undefined;
    const ageDays = createdAt ? (Date.now() / 1000 - createdAt) / 86400 : undefined;

    try {
      // Faz uma requisição leve para verificar se o token ainda funciona
      await elofyGet("/dataQuery/company");
      return {
        ok: true,
        ageDays: ageDays ? Math.round(ageDays * 10) / 10 : undefined,
        message: ageDays && ageDays >= TOKEN_AGING_THRESHOLD_DAYS
          ? `Token válido mas com ${Math.floor(ageDays)} dias — considere renovar`
          : "Token válido",
      };
    } catch (err) {
      if (err instanceof ElofyTokenExpiredError) {
        return { ok: false, ageDays, message: "Token expirado" };
      }
      throw err;
    }
  }

  // Com email/senha, a renovação é automática
  return { ok: true, message: "Autenticação via email/senha — renovação automática" };
}
