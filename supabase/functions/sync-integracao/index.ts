import { elofyGetAll, setElofyToken } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncIntegrationSituation() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/integration_situation");
  const rows = items.map((r, i) => ({
    elofy_id: String(r["id_lote"]) + "_" + String(r["matricula"] ?? i),
    id_lote: String(r["id_lote"] ?? ""),
    codigo_movimento: String(r["codigoMovimento"] ?? ""),
    codigo_empresa: String(r["codigoEmpresa"] ?? ""),
    matricula: String(r["matricula"] ?? ""),
    cpf: String(r["cpf"] ?? ""),
    email_usuario: String(r["email_usuario"] ?? ""),
    login: String(r["login"] ?? ""),
    tipo_usuario: String(r["tipoUsuario"] ?? ""),
    nome_completo: String(r["nomeCompleto"] ?? ""),
    data_admissao: String(r["dataAdmissao"] ?? ""),
    data_desligamento: String(r["dataDesligamento"] ?? ""),
    data_nascimento: String(r["dataNascimento"] ?? ""),
    cod_gestor: String(r["codGestor"] ?? ""),
    nivel: String(r["nivel"] ?? ""),
    multi_usuario: String(r["multiUsuario"] ?? ""),
    codigo_unidade_funcional: String(r["codigoUnidadeFuncional"] ?? ""),
    nome_unidade_funcional: String(r["nomeUnidadeFuncional"] ?? ""),
    codigo_unidade_pai: String(r["codigoUnidadePai"] ?? ""),
    codigo_primeiro_gestor_uf: String(r["codigoPrimeiroGestorUnidadeFuncional"] ?? ""),
    codigo_segundo_gestor_uf: String(r["codigoSegundoGestorUnidadeFuncional"] ?? ""),
    atualiza_gestor_colaboradores: String(r["atualizaGestorColaboradores"] ?? ""),
    codigo_cargo: String(r["codigoCargo"] ?? ""),
    nome_cargo: String(r["nomeCargo"] ?? ""),
    nome_classificacao: String(r["nomeClassificacao"] ?? ""),
    situacao_processamento: String(r["situacao_processamento"] ?? ""),
    mensagem: String(r["mensagem"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_integration_situation", rows);
  return rows.length;
}

async function syncIntegrationBatch() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/integration_batch");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_lote"]),
    codigo_grupo_economico: String(r["codigo_grupo_economico"] ?? ""),
    data_inicio: String(r["data_inicio"] ?? ""),
    data_fim: String(r["data_fim"] ?? ""),
    qtd_registros_integrados: r["qtd_registros_integrados"] as number,
    situacao_lote: String(r["situacao_lote"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_integration_batch", rows);
  return rows.length;
}

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number> = {};

  const { elofyToken } = await req.json().catch(() => ({}));
  if (elofyToken) setElofyToken(elofyToken);

  try {
    results.integration_situation = await syncIntegrationSituation();
    results.integration_batch = await syncIntegrationBatch();

    const total = results.integration_situation + results.integration_batch;
    await logSync(supabase, "sync-integracao", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-integracao", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
