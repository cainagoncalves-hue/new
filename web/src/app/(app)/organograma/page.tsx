import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const BP_AREAS: Record<string, string[]> = {
  caina: ["DIRETORIA COMERCIAL","DIRETORIA MARKETING","MARKETING -  DIGITAL","MARKETING -  EVENTOS","PRÉ-VENDAS","VENDAS INTERNAS","REGIONAL BA","REGIONAL ES","REGIONAL GO","REGIONAL MG","REGIONAL MS","REGIONAL MT","REGIONAL NE","REGIONAL PR","REGIONAL RJ","REGIONAL RS/SC","REGIONAL SP"],
  izabela: ["CS","CS - Time Aline","CS - Time Luana","CX","CX - Reversão","CX - Time Gabriel","SUPORTE","SUPORTE - Time Edmilson","SUPORTE - Time Enock","SUPORTE - Time Gabriela","SUPORTE - Time Nathalia","ADMINISTRATIVO/FINANCEIRO REC","ADMINISTRATIVO/FINANCEIRO SP","DIRETORIA FINANCEIRA","OSM","SERVIÇOS GERAIS REC","SERVIÇOS GERAIS SP","DIRETORIA OPERAÇÕES"],
  renata_paula: ["DEV - Time Felipe","DEV - Time Gilmar","DEV - Time Jony","DEV - Time Leandro","DIRETORIA TECNOLOGIA","TI - INFRAESTRUTURA","PESQUISA & PRODUTO","NIX","Recrutamento e Seleção","Desenvolvimento Humano Organizacional","Departamento Pessoal","DIRETORIA GENTE & CULTURA"],
};

const BP_LABELS: Record<string, string> = {
  caina: "Cainã · Comercial & Marketing",
  izabela: "Izabela · CX/CS & Financeiro",
  renata_paula: "Renata/Paula · Tecnologia & RH",
};

const BP_COLORS: Record<string, { accent: string; pale: string }> = {
  caina:        { accent: "#7C3AED", pale: "#EDE9FE" },
  izabela:      { accent: "#0284C7", pale: "#E0F2FE" },
  renata_paula: { accent: "#059669", pale: "#D1FAE5" },
  geral:        { accent: "var(--brand)", pale: "var(--brand-pale)" },
};

function shortName(name: string) {
  const parts = name.trim().split(" ");
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

interface TeamData {
  teamName: string;
  manager: string | null;
  members: { name: string; role: string }[];
  bp: string;
}

export default async function OrgPage({
  searchParams,
}: {
  searchParams: Promise<{ bp?: string; leader?: string }>;
}) {
  const { bp = "geral", leader = "" } = await searchParams;
  const supabase = await createClient();

  let areaFilter: string[] | null = null;
  if (bp !== "geral" && BP_AREAS[bp]) areaFilter = BP_AREAS[bp];

  let q = supabase
    .from("elofy_sucessao")
    .select("nome_colaborador, nome_time, nome_cargo, nome_gestor");
  if (areaFilter) q = q.in("nome_time", areaFilter);
  if (leader) q = q.eq("nome_gestor", leader);

  const { data: rows } = await q;

  // Group by team
  const teamsMap = new Map<string, TeamData>();

  for (const row of rows ?? []) {
    const teamName = (row.nome_time ?? "Sem Time").trim();
    const name = (row.nome_colaborador ?? "").trim();
    const role = (row.nome_cargo ?? "").trim();
    const manager = (row.nome_gestor ?? "").trim() || null;

    if (!name) continue;

    if (!teamsMap.has(teamName)) {
      // determine which BP this team belongs to
      let teamBp = "geral";
      for (const [bpKey, areas] of Object.entries(BP_AREAS)) {
        if (areas.includes(teamName)) { teamBp = bpKey; break; }
      }
      teamsMap.set(teamName, { teamName, manager, members: [], bp: teamBp });
    }

    const team = teamsMap.get(teamName)!;
    if (manager && !team.manager) team.manager = manager;
    if (!team.members.find((m) => m.name === name)) {
      team.members.push({ name, role });
    }
  }

  // Sort: teams with more members first; within same BP keep together
  const BP_ORDER = ["caina", "izabela", "renata_paula", "geral"];
  const teams = [...teamsMap.values()].sort((a, b) => {
    const bpA = BP_ORDER.indexOf(a.bp);
    const bpB = BP_ORDER.indexOf(b.bp);
    if (bpA !== bpB) return bpA - bpB;
    return b.members.length - a.members.length;
  });

  const totalPeople = teams.reduce((s, t) => s + t.members.length, 0);
  const colors = BP_COLORS[bp] ?? BP_COLORS.geral;

  // Group teams by BP for the "geral" view
  const byBp: Record<string, TeamData[]> = {};
  for (const t of teams) {
    if (!byBp[t.bp]) byBp[t.bp] = [];
    byBp[t.bp].push(t);
  }

  const bpSections = bp === "geral"
    ? (["caina", "izabela", "renata_paula", "geral"] as const).filter((k) => byBp[k]?.length)
    : null;

  return (
    <main style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 48px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-300)", textDecoration: "none" }}>← Hub</Link>
          <span style={{ color: "var(--border-2)" }}>·</span>
          <span style={{ fontSize: 13, color: "var(--text-500)" }}>Organograma</span>
        </div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text-900)" }}>
          Organograma
        </h1>
        {(bp !== "geral" || leader) && (
          <p style={{ fontSize: 13, color: "var(--text-500)", marginTop: 6 }}>
            {leader ? `Líder: ${leader}` : BP_LABELS[bp] ?? bp}
          </p>
        )}
      </div>

      {/* Summary KPIs */}
      <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
        {[
          { label: "Times", value: teams.length },
          { label: "Colaboradores mapeados", value: totalPeople },
          { label: "Gestores", value: new Set(teams.map((t) => t.manager).filter(Boolean)).size },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 24px",
              boxShadow: "var(--sh)",
              minWidth: 140,
            }}
          >
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: colors.accent,
              lineHeight: 1,
            }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-300)", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {teams.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-300)" }}>
          Nenhum dado encontrado para os filtros selecionados.
        </div>
      ) : bpSections ? (
        /* Geral view: group by BP */
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {bpSections.map((bpKey) => {
            const sectionColors = BP_COLORS[bpKey] ?? BP_COLORS.geral;
            return (
              <section key={bpKey}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: `2px solid ${sectionColors.pale}`,
                }}>
                  <span style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: sectionColors.accent,
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "var(--text-900)",
                  }}>
                    {BP_LABELS[bpKey] ?? bpKey}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-300)" }}>
                    {byBp[bpKey].length} time{byBp[bpKey].length > 1 ? "s" : ""} ·{" "}
                    {byBp[bpKey].reduce((s, t) => s + t.members.length, 0)} colaboradores
                  </span>
                </div>
                <TeamGrid teams={byBp[bpKey]} accent={sectionColors.accent} pale={sectionColors.pale} />
              </section>
            );
          })}
        </div>
      ) : (
        /* Filtered view: flat grid */
        <TeamGrid teams={teams} accent={colors.accent} pale={colors.pale} />
      )}
    </main>
  );
}

function TeamGrid({ teams, accent, pale }: { teams: TeamData[]; accent: string; pale: string }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 16,
    }}>
      {teams.map((team) => (
        <TeamCard key={team.teamName} team={team} accent={accent} pale={pale} />
      ))}
    </div>
  );
}

function TeamCard({ team, accent, pale }: { team: TeamData; accent: string; pale: string }) {
  const MAX_VISIBLE = 6;
  const visible = team.members.slice(0, MAX_VISIBLE);
  const overflow = team.members.length - MAX_VISIBLE;

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "var(--sh)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Team header */}
      <div style={{
        background: pale,
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 13,
          fontWeight: 800,
          color: accent,
          lineHeight: 1.3,
          marginBottom: team.manager ? 8 : 0,
        }}>
          {team.teamName}
        </div>

        {team.manager && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: accent,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              flexShrink: 0,
              fontFamily: "'Syne', sans-serif",
            }}>
              {initials(team.manager)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-900)" }}>
                {shortName(team.manager)}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-300)" }}>Gestor(a)</div>
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <div style={{ padding: "10px 12px", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {visible.map((m) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "var(--surface-2)",
                color: "var(--text-500)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
                flexShrink: 0,
                fontFamily: "'Syne', sans-serif",
              }}>
                {initials(m.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-900)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {shortName(m.name)}
                </div>
                {m.role && (
                  <div style={{
                    fontSize: 10,
                    color: "var(--text-300)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {m.role}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {overflow > 0 && (
          <div style={{
            marginTop: 8,
            fontSize: 11,
            color: "var(--text-300)",
            fontWeight: 500,
            paddingTop: 6,
            borderTop: "1px solid var(--border)",
          }}>
            +{overflow} colaborador{overflow > 1 ? "es" : ""}
          </div>
        )}
      </div>

      {/* Footer counter */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        justifyContent: "flex-end",
      }}>
        <span style={{ fontSize: 11, color: "var(--text-300)" }}>
          {team.members.length} colaborador{team.members.length !== 1 ? "es" : ""}
        </span>
      </div>
    </div>
  );
}
