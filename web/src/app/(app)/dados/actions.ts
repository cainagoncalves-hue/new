"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Não autenticado.");
  const { data: user } = await supabase
    .from("app_users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (user?.role !== "admin") throw new Error("Acesso restrito a administradores.");
  return { supabase, userId: session.user.id };
}

// ── Desligamentos ────────────────────────────────────────────

export async function addDesligamento(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("manual_desligamentos").insert({
    nome_colaborador: formData.get("nome_colaborador") as string,
    nome_gestor: formData.get("nome_gestor") as string,
    mes_referencia: `${formData.get("mes_referencia")}-01`,
    tipo: formData.get("tipo") as string,
    justificativa: (formData.get("justificativa") as string) || null,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
  revalidatePath("/iso");
}

export async function deleteDesligamento(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("manual_desligamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
  revalidatePath("/iso");
}

// ── CID F ────────────────────────────────────────────────────

export async function upsertCIDF(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("manual_cidf").upsert({
    nome_gestor: formData.get("nome_gestor") as string,
    nome_colaborador: formData.get("nome_colaborador") as string,
    mes_referencia: `${formData.get("mes_referencia")}-01`,
    ausencia_cidf: formData.get("ausencia_cidf") === "true",
    created_by: userId,
  }, { onConflict: "nome_gestor,nome_colaborador,mes_referencia" });
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
  revalidatePath("/iso");
}

export async function deleteCIDF(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("manual_cidf").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
  revalidatePath("/iso");
}

// ── Talentos Chave ───────────────────────────────────────────

export async function addTalento(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("manual_talentos_chave").insert({
    nome_colaborador: formData.get("nome_colaborador") as string,
    tipo: formData.get("tipo") as string,
    nome_gestor: formData.get("nome_gestor") as string,
    plano_acao: (formData.get("plano_acao") as string) || null,
    status: formData.get("status") as string,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
}

export async function updateTalentoStatus(id: string, status: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("manual_talentos_chave")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
}

export async function deleteTalento(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("manual_talentos_chave").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
}

// ── IMG Indicadores ──────────────────────────────────────────

export async function upsertIMGIndicador(formData: FormData) {
  const { supabase, userId } = await requireAdmin();
  const { error } = await supabase.from("manual_img_indicadores").upsert({
    nome_gestor: formData.get("nome_gestor") as string,
    mes_referencia: `${formData.get("mes_referencia")}-01`,
    indicador: formData.get("indicador") as string,
    valor_pct: parseFloat(formData.get("valor_pct") as string),
    created_by: userId,
  }, { onConflict: "nome_gestor,mes_referencia,indicador" });
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
  revalidatePath("/img");
}

export async function deleteIMGIndicador(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("manual_img_indicadores").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dados");
  revalidatePath("/img");
}

// ── Bulk upsert via CSV ──────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { cols.push(current); current = ""; }
    else { current += ch; }
  }
  cols.push(current);
  return cols;
}

export async function bulkUpsertIMGIndicadores(
  formData: FormData,
): Promise<{ inserted: number; errors: string[] }> {
  const { supabase, userId } = await requireAdmin();

  const file = formData.get("csv_file") as File | null;
  if (!file || file.size === 0) throw new Error("Nenhum arquivo selecionado.");

  const text = await file.text();
  const lines = text.split(/\r?\n/);

  const VALID = new Set([
    "metas_registradas", "checkins_prazo", "reuniao_resultado",
    "rdm_prazo", "headcount_previsto", "custo_folha_previsto", "atingimento_metas",
  ]);

  type Row = { nome_gestor: string; mes_referencia: string; indicador: string; valor_pct: number; created_by: string };
  const parsed: Row[] = [];
  const errors: string[] = [];
  let headerSkipped = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("#")) continue;

    // Pula o cabeçalho (primeira linha não-comentário)
    if (!headerSkipped) { headerSkipped = true; continue; }

    const cols = parseCSVLine(raw).map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 4) {
      errors.push(`Linha ${i + 1}: esperado 4 colunas, recebido ${cols.length}`);
      continue;
    }

    const [nome_gestor, mes_referencia, indicador, valor_pct_str] = cols;

    if (!nome_gestor) { errors.push(`Linha ${i + 1}: nome_gestor vazio`); continue; }

    if (!/^\d{4}-\d{2}$/.test(mes_referencia)) {
      errors.push(`Linha ${i + 1}: mes_referencia inválido "${mes_referencia}" (use AAAA-MM)`);
      continue;
    }

    if (!VALID.has(indicador)) {
      errors.push(`Linha ${i + 1}: indicador desconhecido "${indicador}"`);
      continue;
    }

    const valor_pct = parseFloat(valor_pct_str);
    if (isNaN(valor_pct) || valor_pct < 0 || valor_pct > 100) {
      errors.push(`Linha ${i + 1}: valor_pct inválido "${valor_pct_str}" (deve ser 0–100)`);
      continue;
    }

    parsed.push({ nome_gestor, mes_referencia: `${mes_referencia}-01`, indicador, valor_pct, created_by: userId });
  }

  if (parsed.length === 0) {
    const hint = errors.length ? ` Erros: ${errors.slice(0, 3).join("; ")}` : "";
    throw new Error(`Nenhuma linha válida encontrada.${hint}`);
  }

  // Upsert em lotes de 100 (last-write-wins via onConflict)
  const CHUNK = 100;
  for (let i = 0; i < parsed.length; i += CHUNK) {
    const { error } = await supabase
      .from("manual_img_indicadores")
      .upsert(parsed.slice(i, i + CHUNK), { onConflict: "nome_gestor,mes_referencia,indicador" });
    if (error) throw new Error(`Erro ao salvar lote: ${error.message}`);
  }

  revalidatePath("/dados");
  revalidatePath("/img");

  return { inserted: parsed.length, errors };
}
