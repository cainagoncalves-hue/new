import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // 1. Raw feedbacks count
  const { data: fbSample, error: fbErr } = await supabase
    .from("elofy_feedbacks")
    .select("id_usuario_destinatario, usuario_destinatario, data_feedback, time_destinatario")
    .order("data_feedback", { ascending: false })
    .limit(10);

  // 2. Distinct months
  const { data: fbDates, error: datesErr } = await supabase
    .from("elofy_feedbacks")
    .select("data_feedback")
    .not("data_feedback", "is", null)
    .order("data_feedback", { ascending: false })
    .limit(200);

  const monthSet = new Set((fbDates ?? []).map(r => (r.data_feedback as string)?.slice(0, 7)).filter(Boolean));

  // 3. Users sample
  const { data: usersSample, error: usersErr } = await supabase
    .from("elofy_users")
    .select("nome, elofy_id, nome_gestor, nome_time, status")
    .eq("status", "Ativo")
    .limit(10);

  // 4. Total counts
  const { count: fbTotal } = await supabase
    .from("elofy_feedbacks")
    .select("*", { count: "exact", head: true });

  const { count: usersTotal } = await supabase
    .from("elofy_users")
    .select("*", { count: "exact", head: true })
    .eq("status", "Ativo");

  // 5. One-one sample
  const { data: ooSample, error: ooErr } = await supabase
    .from("elofy_one_one")
    .select("id_usuario_convidado, nome_convidado, data, nome_time_convidado")
    .order("data", { ascending: false })
    .limit(10);

  return NextResponse.json({
    feedbacks: {
      totalVisible: fbTotal,
      error: fbErr?.message,
      datesError: datesErr?.message,
      months: [...monthSet].sort().reverse().slice(0, 12),
      sample: fbSample,
    },
    users: {
      totalVisible: usersTotal,
      error: usersErr?.message,
      sample: usersSample,
    },
    oneOne: {
      error: ooErr?.message,
      sample: ooSample,
    },
  });
}
