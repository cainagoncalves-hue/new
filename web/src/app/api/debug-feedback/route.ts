import { createClient } from "@/lib/supabase/server";
import { excludeAdmins } from "@/lib/adminAccounts";
import { NextResponse } from "next/server";

function nextMonth(mesStr: string): string {
  const [year, month] = mesStr.split("-").map(Number);
  if (month === 12) return `${year + 1}-01-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const mes = url.searchParams.get("mes") || "2026-05";

  const monthStart = `${mes}-01`;
  const monthEnd = nextMonth(mes);

  // 1. Usuários ativos
  const usersResult = await excludeAdmins(
    supabase.from("elofy_users").select("nome, elofy_id, nome_gestor, nome_time").eq("status", "Ativo"),
    "nome"
  );
  const users = usersResult.data ?? [];
  const allUserIds = users.map((u: any) => u.elofy_id).filter(Boolean);

  // 2. Feedbacks no período
  let fbQ = supabase
    .from("elofy_feedbacks")
    .select("id_usuario_destinatario")
    .gte("data_feedback", monthStart)
    .lt("data_feedback", monthEnd);
  if (allUserIds.length > 0) fbQ = fbQ.in("id_usuario_destinatario", allUserIds);
  const { data: feedbacks, error: fbErr } = await fbQ;

  // 3. 1:1s — SEM filtro de situacao para ver todos os valores
  let ooAllQ = supabase
    .from("elofy_one_one")
    .select("id_usuario_convidado, situacao")
    .gte("data", monthStart)
    .lt("data", monthEnd);
  if (allUserIds.length > 0) ooAllQ = ooAllQ.in("id_usuario_convidado", allUserIds);
  const { data: ooAll, error: ooAllErr } = await ooAllQ;

  // 4. 1:1s COM filtro Realizado
  let ooQ = supabase
    .from("elofy_one_one")
    .select("id_usuario_convidado, situacao")
    .eq("situacao", "Realizado")
    .gte("data", monthStart)
    .lt("data", monthEnd);
  if (allUserIds.length > 0) ooQ = ooQ.in("id_usuario_convidado", allUserIds);
  const { data: ooRealizado, error: ooRealizadoErr } = await ooQ;

  // Situacoes distintas
  const situacaoCount: Record<string, number> = {};
  for (const r of ooAll ?? []) {
    const s = (r as any).situacao ?? "(null)";
    situacaoCount[s] = (situacaoCount[s] ?? 0) + 1;
  }

  // Unique IDs cobertos
  const fbIds = new Set((feedbacks ?? []).map((f: any) => f.id_usuario_destinatario).filter(Boolean));
  const ooIds = new Set((ooRealizado ?? []).map((o: any) => o.id_usuario_convidado).filter(Boolean));
  const coveredSet = new Set([...fbIds, ...ooIds]);

  // Cobertura por lider
  const leaderMap: Record<string, { reports: Array<{ nome: string; elofy_id: string }> }> = {};
  for (const u of users as any[]) {
    const mgr = u.nome_gestor ?? "";
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;
    if (!leaderMap[mgr]) leaderMap[mgr] = { reports: [] };
    leaderMap[mgr].reports.push({ nome: u.nome ?? "", elofy_id: u.elofy_id ?? "" });
  }

  const leaders = Object.entries(leaderMap).map(([name, data]) => ({
    name,
    total: data.reports.length,
    withFeedbackOnly: data.reports.filter(r => fbIds.has(r.elofy_id)).length,
    withOneOneOnly: data.reports.filter(r => ooIds.has(r.elofy_id) && !fbIds.has(r.elofy_id)).length,
    withBoth: data.reports.filter(r => fbIds.has(r.elofy_id) && ooIds.has(r.elofy_id)).length,
    covered: data.reports.filter(r => coveredSet.has(r.elofy_id)).length,
  })).sort((a, b) => b.covered - a.covered);

  return NextResponse.json({
    mes, monthStart, monthEnd,
    usersCount: users.length,
    feedbacksCount: (feedbacks ?? []).length,
    feedbackUniqueIds: fbIds.size,
    oneOneTotal: (ooAll ?? []).length,
    oneOneSituacoes: situacaoCount,
    oneOneRealizadoCount: (ooRealizado ?? []).length,
    oneOneRealizadoUniqueIds: ooIds.size,
    coveredSetSize: coveredSet.size,
    errors: { fbErr: fbErr?.message, ooAllErr: ooAllErr?.message, ooRealizadoErr: ooRealizadoErr?.message },
    topLeaders: leaders.slice(0, 5),
  });
}
