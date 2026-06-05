import { elofyGet, elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncCompany() {
  const items = await elofyGet<Record<string, string>>("/dataQuery/company");
  const rows = items
    .map((r) => ({
      elofy_id: r["ID Empresa"] ?? r["id_empresa"],
      nome: r["Nome da empresa"] ?? r["nome_empresa"],
      id_grupo_economico: r["ID grupo econômico"] ?? r["id_grupo_economico"],
      raw_data: r,
    }))
    .filter((row) => row.elofy_id != null);
  await upsertBatch(supabase, "elofy_company", rows);
  return rows.length;
}

async function syncTeams() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/teams");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_time"]),
    nome: String(r["time"] ?? ""),
    status: String(r["status"] ?? ""),
    codigo_origem: String(r["codigo_time_sistema_origem"] ?? ""),
    id_responsavel: String(r["id_usuario_responsavel"] ?? ""),
    nome_responsavel: String(r["usuarios_responsavel"] ?? ""),
    id_time_pai: String(r["id_time_pai"] ?? ""),
    nome_time_pai: String(r["time_pai"] ?? ""),
    ids_tags: String(r["ids_tags"] ?? ""),
    tags: String(r["tags"] ?? ""),
    id_empresa: String(r["id_empresa"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_teams", rows);
  return rows.length;
}

async function syncPositions() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/positions");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_cargo"]),
    cargo: String(r["cargo"] ?? ""),
    status: String(r["status"] ?? ""),
    codigo_origem: String(r["codigo_cargo_sistema_origem"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    dificuldade: String(r["dificuldade"] ?? ""),
    impacto: String(r["impacto"] ?? ""),
    mapeado_sucessao: String(r["mapeado_para_sucessao"] ?? ""),
    regua: String(r["regua"] ?? ""),
    id_empresa: String(r["id_empresa"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_positions", rows);
  return rows.length;
}

async function syncUsers() {
  const items = await elofyGetAll<Record<string, unknown>>("/dataQuery/users");
  const rows = items.map((r) => ({
    elofy_id: String(r["id_usuario"]),
    nome: String(r["nome_usuario"] ?? ""),
    matricula: String(r["matricula"] ?? ""),
    status: String(r["status"] ?? ""),
    data_admissao: String(r["data_admissao"] ?? ""),
    data_desligamento: String(r["data_deligamento"] ?? ""),  // API has typo: deligamento
    id_gestor: String(r["id_gestor"] ?? ""),
    nome_gestor: String(r["gestor"] ?? ""),
    email: String(r["e_mail"] ?? ""),  // API uses e_mail
    login: String(r["login"] ?? ""),
    tipo_cargo: String(r["tipo_cargo"] ?? ""),
    id_cargo: String(r["id_cargo"] ?? ""),
    cargo: String(r["cargo"] ?? ""),
    nivel_responsabilidade: String(r["nivel_responsabilidade"] ?? ""),
    id_time: String(r["id_time"] ?? ""),
    nome_time: String(r["time"] ?? ""),
    ids_times_acessiveis: String(r["ids_times_acessiveis"] ?? ""),
    times_acessiveis: String(r["times_acessiveis"] ?? ""),
    projeto_pod: String(r["projetopod"] ?? ""),  // API has no underscore: projetopod
    ids_perfil: String(r["ids_perfil"] ?? ""),
    perfis: String(r["perfis"] ?? ""),
    cpf: String(r["cpf"] ?? ""),
    colaborador_chave: String(r["colaborador_chave"] ?? ""),
    id_empresa: String(r["id_empresa"] ?? ""),
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_users", rows);
  return rows.length;
}

Deno.serve(async () => {
  const startedAt = new Date().toISOString();
  const results: Record<string, number | string> = {};

  try {
    results.company = await syncCompany();
    results.teams = await syncTeams();
    results.positions = await syncPositions();
    results.users = await syncUsers();

    // Reconstrói bp_gestor_map com base em bp_area_map + elofy_users recém-sincronizado
    const { error: rebuildErr } = await supabase.rpc("rebuild_bp_gestor_map");
    if (rebuildErr) {
      console.error("rebuild_bp_gestor_map falhou:", rebuildErr.message);
    } else {
      results.bp_gestor_map = "reconstruído";
    }

    const total = Object.values(results).reduce(
      (a: number, b) => (typeof b === "number" ? a + b : a),
      0,
    );
    await logSync(supabase, "sync-estrutura", "success", total, undefined, startedAt);

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logSync(supabase, "sync-estrutura", "error", 0, message, startedAt);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
