"use client";

import { useActionState, useRef } from "react";
import { addTalento, updateTalentoStatus, deleteTalento } from "./actions";

interface Talento {
  id: string;
  nome_colaborador: string;
  tipo: string;
  nome_gestor: string;
  plano_acao: string | null;
  status: string;
}

interface Props {
  gestores: string[];
  records: Talento[];
}

const STATUS_LABELS: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  nao_iniciado: { bg: "var(--surface-2)", color: "var(--text-500)" },
  em_andamento: { bg: "#fef3c7", color: "#92400e" },
  concluido: { bg: "#d1fae5", color: "#065f46" },
};

export default function TalentosForm({ gestores, records }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [err, action, pending] = useActionState(async (_: unknown, fd: FormData) => {
    try {
      await addTalento(fd);
      formRef.current?.reset();
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, null);

  return (
    <div>
      <form ref={formRef} action={action} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Colaborador *</label>
          <input name="nome_colaborador" required style={inputStyle} placeholder="Nome completo" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Gestor *</label>
          <select name="nome_gestor" required style={inputStyle}>
            <option value="">Selecione...</option>
            {gestores.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Tipo de talento *</label>
          <select name="tipo" required style={inputStyle}>
            <option value="performance">Performance</option>
            <option value="sucessao">Sucessão</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Status do plano *</label>
          <select name="status" required style={inputStyle}>
            <option value="nao_iniciado">Não iniciado</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
        </div>
        <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Plano de ação</label>
          <textarea name="plano_acao" rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="Descreva o plano de desenvolvimento / sucessão..." />
        </div>
        {err && <div style={{ gridColumn: "1 / -1", color: "var(--red)", fontSize: 12 }}>{err}</div>}
        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" disabled={pending} style={btnStyle}>
            {pending ? "Salvando..." : "Adicionar Talento Chave"}
          </button>
        </div>
      </form>

      {records.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Colaborador", "Gestor", "Tipo", "Plano de Ação", "Status", ""].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const sc = STATUS_COLORS[r.status] ?? STATUS_COLORS.nao_iniciado;
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={tdStyle}>{r.nome_colaborador}</td>
                    <td style={tdStyle}>{r.nome_gestor}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "var(--brand-pale)", padding: "2px 8px", borderRadius: 4 }}>
                        {r.tipo === "performance" ? "Performance" : "Sucessão"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.plano_acao ?? "—"}
                    </td>
                    <td style={tdStyle}>
                      <form action={updateTalentoStatus.bind(null, r.id, r.status)}>
                        <select
                          name="status"
                          defaultValue={r.status}
                          onChange={async (e) => {
                            await updateTalentoStatus(r.id, e.target.value);
                          }}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: sc.bg,
                            color: sc.color,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {Object.entries(STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </form>
                    </td>
                    <td style={tdStyle}>
                      <form action={deleteTalento.bind(null, r.id)}>
                        <button type="submit" style={deleteBtnStyle}>Remover</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ color: "var(--text-300)", fontSize: 12 }}>Nenhum talento mapeado ainda.</div>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--text-500)", textTransform: "uppercase", letterSpacing: "0.06em" };
const inputStyle: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-900)", fontSize: 13, fontFamily: "'DM Sans', sans-serif", width: "100%", boxSizing: "border-box" };
const btnStyle: React.CSSProperties = { background: "var(--brand)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const deleteBtnStyle: React.CSSProperties = { background: "none", border: "1px solid var(--border-2)", borderRadius: 6, color: "var(--red)", fontSize: 11, padding: "3px 10px", cursor: "pointer" };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-300)", borderBottom: "1px solid var(--border)" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", color: "var(--text-700)" };
