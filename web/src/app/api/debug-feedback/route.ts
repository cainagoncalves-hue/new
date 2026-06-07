import { createClient } from "@/lib/supabase/server";
import { excludeAdmins } from "@/lib/adminAccounts";
import { NextResponse } from "next/server";

function nextMonth(mesStr: string): string {
  const [year, month] = mesStr.split("-").map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const url = new URL(req.url);
  const mes = url.searchParams.get("mes") || "2026-06";

  const monthStart = `${mes}-01`;
  const monthEnd = nextMonth(mes);

  // Step 1: get users (same query as feedback page)
  const usersResult = await excludeAdmins(
    supabase.from("elofy_users").select("nome, elofy_id, nome_gestor, nome_time").eq("status", "Ativo"),
    "nome"
  );
  const users = usersResult.data;
  const usersErr = usersResult.error;

  const allUserIds = (users ?? []).map((u: any) => u.elofy_id).filter(Boolean);

  // Step 2: query feedbacks (same as feedback page)
  let fbQ = supabase
    .from("elofy_feedbacks")
    .select("id_usuario_destinatario, data_feedback")
    .gte("data_feedback", monthStart)
    .lt("data_feedback", monthEnd);
  if (allUserIds.length > 0) fbQ = fbQ.in("id_usuario_destinatario", allUserIds);
  const { data: feedbacks, error: fbErr } = await fbQ;

  const feedbackSet = new Set(
    (feedbacks ?? []).map((f: any) => f.id_usuario_destinatario).filter(Boolean)
  );

  // Step 3: build leaderMap (same as feedback page)
  const leaderMap: Record<string, { area: string; reports: Array<{ nome: string; elofy_id: string }> }> = {};
  for (const u of (users ?? []) as any[]) {
    const mgr = u.nome_gestor ?? "";
    if (!mgr || mgr.toLowerCase().includes("elofy")) continue;
    if (!leaderMap[mgr]) leaderMap[mgr] = { area: u.nome_time ?? "", reports: [] };
    leaderMap[mgr].reports.push({ nome: u.nome ?? "", elofy_id: u.elofy_id ?? "" });
  }

  // Step 4: compute coverage (same as feedback page)
  const leaders = Object.entries(leaderMap).map(([name, data]) => ({
    name,
    total: data.reports.length,
    withFeedback: data.reports.filter(r => feedbackSet.has(r.elofy_id)).length,
    sampleReport: data.reports[0],
    sampleReportInFeedbackSet: data.reports[0] ? feedbackSet.has(data.reports[0].elofy_id) : null,
  })).sort((a, b) => b.withFeedback - a.withFeedback);

  return NextResponse.json({
    mes,
    monthStart,
    monthEnd,
    usersCount: (users ?? []).length,
    allUserIdsCount: allUserIds.length,
    allUserIdsSample: allUserIds.slice(0, 5),
    feedbacksCount: (feedbacks ?? []).length,
    feedbackSetSize: feedbackSet.size,
    feedbackSetSample: [...feedbackSet].slice(0, 5),
    usersErr: usersErr?.message,
    fbErr: fbErr?.message,
    leadersTotal: leaders.length,
    topLeaders: leaders.slice(0, 5),
  });
}
