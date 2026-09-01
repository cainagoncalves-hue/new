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

const TOKEN_AGING_THRESHOLD_DAYS = 25;

function checkTokenAging(token: string): void {
  const payload = decodeJwtPayload(token);
  const createdAt = payload["created_at"] as number | undefined;
  if (!createdAt) return;
  const ageDays = (Date.now() / 1000 - createdAt) / 86400;
  if (ageDays >= TOKEN_AGING_THRESHOLD_DAYS) {
    console.warn(`⚠️ Token Elofy com ${Math.floor(ageDays)} dias — considere renovar antes de expirar`);
  }
}

let cachedToken: string | null = null;

// Permite injetar um token já obtido (ex: sync-all faz um único login e
// repassa às funções que dispara, evitando N logins concorrentes na Elofy).
export function setElofyToken(token: string): void {
  cachedToken = token;
}

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
  retries = 3,
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

  if (res.status === 429 && retries > 0) {
    await new Promise((r) => setTimeout(r, 5000)); // aguarda 5s e tenta de novo
    return elofyGet<T>(path, params, retries - 1);
  }

  if (!res.ok) {
    throw new Error(`Elofy GET ${path} falhou: ${res.status} ${await res.text()}`);
  }

  // A API Elofy serve UTF-8 mas pode declarar charset errado no Content-Type.
  // Forçamos a decodificação como UTF-8 para evitar mojibake (NÃ£o → Não).
  const buffer = await res.arrayBuffer();
  return JSON.parse(new TextDecoder("utf-8").decode(buffer));
}

export async function elofyGetAll<T>(
  path: string,
  extraParams: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const raw = await elofyGet<T>(path, { ...extraParams, page, perPage }) as unknown;
    let batch: T[];
    let reachedEnd: boolean;

    if (Array.isArray(raw)) {
      batch = raw as T[];
      reachedEnd = batch.length < perPage;
    } else if (
      raw !== null && typeof raw === "object" &&
      Array.isArray((raw as { data: unknown }).data)
    ) {
      const paged = raw as { data: T[]; current_page: number; last_page: number };
      batch = paged.data;
      reachedEnd = Number(paged.current_page) >= Number(paged.last_page);
    } else {
      break;
    }

    if (batch.length === 0) break;
    all.push(...batch);
    if (reachedEnd) break;
    page++;
    await new Promise((r) => setTimeout(r, 150)); // evitar rate limit da API Elofy
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
