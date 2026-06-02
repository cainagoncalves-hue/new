"use client";

import { useState } from "react";

export interface ISOQuestion {
  pergunta: string;
  categoria: string;
  avgRaw: number;   // 1–4
  score: number;    // 0–100
  n: number;
}

export interface ISOLeaderData {
  name: string;
  area: string;
  headcount: number;
  isoScore: number | null;
  turnoverScore: number | null;
  turnoverRate: number | null;
  turnoverN: number;
  cidfScore: number | null;
  cidfRate: number | null;
  cidfN: number;
  lnpsScore: number | null;
  lnpsRaw: number | null;
  lnpsN: number;
  lnpsIsAreaAvg: boolean;
  lnpsAreaLabel: string;
  isbeScore: number | null;
  isbeRaw: number | null;
  isbeN: number;
  isbeQuestions: ISOQuestion[];
  isbeIsAreaAvg: boolean;
  isbeAreaLabel: string;
}

function isoColor(v: number | null) {
  if (v === null) return "var(--text-300)";
  if (v >= 80) return "var(--green)";
  if (v >= 70) return "var(--amber)";
  return "var(--red)";
}

function isoLabel(v: number | null) {
  if (v === null) return "—";
  if (v >= 80) return "Saúde Alta";
  if (v >= 70) return "Moderada";
  return "Crítica";
}

function scoreColor(v: number | null) {
  if (v === null) return "var(--text-300)";
  if (v >= 80) return "var(--green)";
  if (v >= 60) return "var(--amber)";
  return "var(--red)";
}


function initials(name: string) {
  return name.split(" ").filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: "var(--border)", borderRadius: 3, overflow: "hidden", flex: 1 }}>
      <div style={{
        height: "100%",
        width: `${Math.max(0, Math.min(100, value))}%`,
        background: color,
        borderRadius: 3,
        transition: "width .4s ease",
      }} />
    </div>
  );
}

function fmt(v: number | null, suffix = "") {
  if (v === null) return "—";
  return `${Math.round(v)}${suffix}`;
}

function fmtPct(v: number | null) {
  if (v === null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function isbeStarColor(raw: number) {
  if (raw >= 3.5) return "var(--green)";
  if (raw >= 2.5) return "var(--amber)";
  return "var(--red)";
}

interface Props {
  leaders: ISOLeaderData[];
}

export default function ISOLeaderList({ leaders }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<Record<string, "iso" | "isbe">>({});

  function getTab(name: string): "iso" | "isbe" {
    return tab[name] ?? "iso";
  }

  function setLeaderTab(name: string, t: "iso" | "isbe") {
    setTab(prev => ({ ...prev, [name]: t }));
  }

  if (leaders.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-500)", marginBottom: 6 }}>
          Nenhum líder encontrado para os filtros selecionados.
        </div>
        <div style={{ fontSize: 12, color: "var(--text-300)", lineHeight: 1.6 }}>
          Verifique se há dados em:<br />
          <strong>elofy_users</strong> (colaboradores ativos) ·{" "}
          <strong>elofy_survey_standard</strong> (LNPS) ·{" "}
          <strong>elofy_survey_pulse</strong> (ISBE)
        </div>
      </div>
    );
  }

  const ISO_CRITERIA: {
    key: string;
    label: string;
    weight: string;
    meta: string;
    getScore: (l: ISOLeaderData) => number | null;
    getDisplayValue?: (l: ISOLeaderData) => number | null;
    getAreaAvg?: (l: ISOLeaderData) => string | null;
    getDetail: (l: ISOLeaderData) => string;
  }[] = [
    {
      key: "turnover",
      label: "Turnover Voluntário",
      weight: "10%",
      meta: "Meta ≤ 0,8%",
      getScore: (l) => l.turnoverScore,
      getDetail: (l) =>
        l.turnoverRate !== null ? `Taxa: ${fmtPct(l.turnoverRate)} · ${l.turnoverN} deslig. voluntários` : "Sem registros",
    },
    {
      key: "cidf",
      label: "Absenteísmo CID F",
      weight: "10%",
      meta: "Meta ≤ 0,15%",
      getScore: (l) => l.cidfScore,
      getDetail: (l) =>
        l.cidfRate !== null ? `Taxa: ${fmtPct(l.cidfRate)} · ${l.cidfN} colaboradores` : "Sem registros",
    },
    {
      key: "lnps",
      label: "LNPS",
      weight: "40%",
      meta: "Pesquisa mais recente",
      getScore: (l) => l.lnpsScore,
      getDisplayValue: (l) => l.lnpsRaw,
      getAreaAvg: (l) => l.lnpsIsAreaAvg ? l.lnpsAreaLabel : null,
      getDetail: (l) =>
        l.lnpsRaw !== null
          ? `Contribuição ISO: ${Math.round(l.lnpsScore ?? 0)}/100 · n=${l.lnpsN}`
          : "Sem dados",
    },
    {
      key: "isbe",
      label: "ISBE",
      weight: "40%",
      meta: "Pesquisa mais recente",
      getScore: (l) => l.isbeScore,
      getDisplayValue: (l) => l.isbeRaw !== null ? parseFloat(l.isbeRaw.toFixed(2)) : null,
      getAreaAvg: (l) => l.isbeIsAreaAvg ? l.isbeAreaLabel : null,
      getDetail: (l) =>
        l.isbeRaw !== null
          ? `Contribuição ISO: ${Math.round(l.isbeScore ?? 0)}/100 · n=${l.isbeN}`
          : "Sem dados",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {leaders.map((l) => {
        const isOpen = expanded === l.name;
        const color = isoColor(l.isoScore);
        const currentTab = getTab(l.name);

        return (
          <div
            key={l.name}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              boxShadow: "var(--sh)",
              overflow: "hidden",
            }}
          >
            {/* Card header — always visible */}
            <button
              onClick={() => setExpanded(isOpen ? null : l.name)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                textAlign: "left",
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                background: "var(--brand-pale)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                flexShrink: 0,
                fontFamily: "'Syne', sans-serif",
              }}>
                {initials(l.name)}
              </div>

              {/* Name + area */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-900)" }}>
                  {l.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2 }}>
                  {l.area} · {l.headcount} pessoas
                </div>
              </div>

              {/* Mini scores */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                {/* ISBE badge */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-300)", marginBottom: 2 }}>
                    ISBE
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: scoreColor(l.isbeScore) }}>
                    {fmt(l.isbeScore)}
                  </div>
                </div>

                <div style={{ width: 1, height: 32, background: "var(--border)" }} />

                {/* ISO score */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-300)", marginBottom: 2 }}>
                    ISO
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>
                    {fmt(l.isoScore)}
                  </div>
                  <div style={{ fontSize: 9, color, fontWeight: 600, marginTop: 2 }}>{isoLabel(l.isoScore)}</div>
                </div>

                {/* Chevron */}
                <div style={{
                  marginLeft: 8,
                  color: "var(--text-300)",
                  fontSize: 14,
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform .2s ease",
                }}>
                  ▾
                </div>
              </div>
            </button>

            {/* ISO bar */}
            <div style={{ paddingInline: 24, paddingBottom: isOpen ? 0 : 16 }}>
              <ProgressBar value={l.isoScore ?? 0} color={color} />
            </div>

            {/* Expanded area */}
            {isOpen && (
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 12 }}>
                {/* Tabs */}
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
                  {(["iso", "isbe"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setLeaderTab(l.name, t)}
                      style={{
                        background: "none",
                        border: "none",
                        borderBottom: currentTab === t ? "2px solid var(--brand)" : "2px solid transparent",
                        color: currentTab === t ? "var(--brand)" : "var(--text-500)",
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "10px 20px",
                        cursor: "pointer",
                        marginBottom: -1,
                      }}
                    >
                      {t === "iso" ? "Critérios ISO" : "Detalhamento ISBE"}
                    </button>
                  ))}
                </div>

                {/* ISO Criteria tab */}
                {currentTab === "iso" && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    padding: 20,
                  }}>
                    {ISO_CRITERIA.map(({ key, label, weight, meta, getScore, getDisplayValue, getAreaAvg, getDetail }) => {
                      const score = getScore(l);
                      const displayVal = getDisplayValue ? getDisplayValue(l) : score;
                      const areaAvgLabel = getAreaAvg ? getAreaAvg(l) : null;
                      const c = scoreColor(score);
                      return (
                        <div key={key} style={{ background: "var(--surface-2)", borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-300)" }}>
                              {label}
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 600, color: "var(--brand)", background: "var(--brand-pale)", padding: "1px 6px", borderRadius: 4 }}>
                              {weight}
                            </span>
                          </div>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: c, lineHeight: 1, marginBottom: 6 }}>
                            {displayVal !== null ? (
                              key === "isbe" ? (displayVal as number).toFixed(2) : Math.round(displayVal as number)
                            ) : "—"}
                          </div>
                          <ProgressBar value={score ?? 0} color={c} />
                          {/* Badge de média da área */}
                          {areaAvgLabel && (
                            <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, background: "var(--amber-bg, #fef3c7)", borderRadius: 5, padding: "2px 7px" }}>
                              <span style={{ fontSize: 8, color: "#92400e" }}>📊</span>
                              <span style={{ fontSize: 9, fontWeight: 600, color: "#92400e" }}>
                                Média da área · {areaAvgLabel}
                              </span>
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: "var(--text-300)", marginTop: areaAvgLabel ? 4 : 8 }}>
                            {meta}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-500)", marginTop: 2 }}>
                            {getDetail(l)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ISBE Questions tab */}
                {currentTab === "isbe" && (
                  <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 12, color: "var(--text-500)" }}>
                        {l.isbeN} respondente{l.isbeN !== 1 ? "s" : ""} · Nota geral: {" "}
                        <strong style={{ color: scoreColor(l.isbeScore) }}>
                          {l.isbeRaw !== null ? l.isbeRaw.toFixed(2) : "—"}/4
                        </strong>{" "}
                        ({fmt(l.isbeScore)}/100)
                      </div>
                      {l.isbeIsAreaAvg && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "var(--amber-bg, #fef3c7)", borderRadius: 5, padding: "3px 9px" }}>
                          <span style={{ fontSize: 9 }}>📊</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#92400e" }}>
                            Média da área · {l.isbeAreaLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {l.isbeQuestions.length === 0 ? (
                      <div style={{ color: "var(--text-300)", fontSize: 13 }}>Sem perguntas disponíveis.</div>
                    ) : (
                      <div style={{
                        display: "flex",
                        gap: 12,
                        overflowX: "auto",
                        paddingBottom: 8,
                        scrollSnapType: "x mandatory",
                      }}>
                        {l.isbeQuestions.map((q, i) => {
                          const c = isbeStarColor(q.avgRaw);
                          return (
                            <div
                              key={i}
                              style={{
                                minWidth: 200,
                                maxWidth: 220,
                                flexShrink: 0,
                                background: "var(--surface-2)",
                                borderRadius: 10,
                                padding: "14px 16px",
                                scrollSnapAlign: "start",
                              }}
                            >
                              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--brand)", marginBottom: 4 }}>
                                {q.categoria}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-700)", marginBottom: 10, lineHeight: 1.4, minHeight: 52 }}>
                                {q.pergunta}
                              </div>
                              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: c, lineHeight: 1, marginBottom: 4 }}>
                                {q.avgRaw.toFixed(2)}
                                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-300)" }}>/4</span>
                              </div>
                              <ProgressBar value={q.score} color={c} />
                              <div style={{ fontSize: 10, color: "var(--text-300)", marginTop: 6 }}>
                                n={q.n} · {Math.round(q.score)}/100
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
