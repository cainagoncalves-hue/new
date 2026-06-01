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
