import { elofyGet, elofyGetAll } from "../_shared/elofy-client.ts";
import { getSupabaseClient, logSync, upsertBatch } from "../_shared/supabase-client.ts";

const supabase = getSupabaseClient();

async function syncCompany() {
  const items = await elofyGet<Record<string, string>>("/dataQuery/company");
  const rows = items.map((r) => ({
    elofy_id: r["ID Empresa"],
    nome: r["Nome da empresa"],
    id_grupo_economico: r["ID grupo econômico"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_company", rows);
  return rows.length;
}

async function syncTeams() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/teams");
  const rows = items.map((r) => ({
    elofy_id: r["ID time"],
    nome: r["Time"],
    status: r["Status"],
    codigo_origem: r["Código time sistema origem"],
    id_responsavel: r["Id usuário responsável"],
    nome_responsavel: r["Usuários Responsável"],
    id_time_pai: r["ID time pai"],
    nome_time_pai: r["Time pai"],
    ids_tags: r["IDs tags"],
    tags: r["Tags"],
    id_empresa: r["ID Empresa"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_teams", rows);
  return rows.length;
}

async function syncPositions() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/positions");
  const rows = items.map((r) => ({
    elofy_id: r["ID Cargo"],
    cargo: r["Cargo"],
    status: r["Status"],
    codigo_origem: r["Código cargo sistema origem"],
    descricao: r["Descrição"],
    dificuldade: r["Dificuldade"],
    impacto: r["Impacto"],
    mapeado_sucessao: r["Mapeado para sucessão"],
    regua: r["Régua"],
    id_empresa: r["ID Empresa"],
    raw_data: r,
  }));
  await upsertBatch(supabase, "elofy_positions", rows);
  return rows.length;
}

async function syncUsers() {
  const items = await elofyGetAll<Record<string, string>>("/dataQuery/users");
  const rows = items.map((r) => ({
    elofy_id: r["ID Usuario"],
    nome: r["Nome usuário"],
    matricula: r["Matrícula"],
    status: r["Status"],
    data_admissao: r["Data de admissão"],
    data_desligamento: r["Data de deligamento"],
    id_gestor: r["ID Gestor"],
    nome_gestor: r["Gestor"],
    email: r["E-mail"],
    login: r["Login"],
    tipo_cargo: r["Tipo cargo"],
    id_cargo: r["ID Cargo"],
    cargo: r["Cargo"],
    nivel_responsabilidade: r["Nível de responsabilidade"],
    id_time: r["ID Time"],
    nome_time: r["Time"],
    ids_times_acessiveis: r["IDs Times acessíveis"],
    times_acessiveis: r["Times acessiveis"],
    projeto_pod: r["Projeto/POD"],
    ids_perfil: r["IDs Perfil"],
    perfis: r["Perfis"],
    cpf: r["CPF"],
    colaborador_chave: r["Colaborador Chave"],
    id_empresa: r["ID Empresa"],
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

    const total = Object.values(results).reduce((a: number, b) => a + Number(b), 0);
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
