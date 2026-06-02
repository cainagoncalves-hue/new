"use client";

import { useActionState, useRef } from "react";
import { upsertCIDF, deleteCIDF } from "./actions";

interface CIDFRecord {
  id: string;
  nome_gestor: string;
  nome_colaborador: string;
  mes_referencia: string;
  ausencia_cidf: boolean;
}

interface Props {
  gestores: string[];
  records: CIDFRecord[];
}

const MONTH = new Date().toISOString().slice(0, 7);

export default function CIDFForm({ gestores, records }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [err, action, pending] = useActionState(async (_: unknown, fd: FormData) => {
    try {
      await upsertCIDF(fd);
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
          <label style={labelStyle}>Gestor *</label>
          <select name="nome_gestor" required style={inputStyle}>
            <option value="">Selecione...</option>
            {gestores.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Colaborador *</label>
          <input name="nome_colaborador" required style={inputStyle} placeholder="Nome completo" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Mês de referência *</label>
          <input name="mes_referencia" type="month" required defaultValue={MONTH} style={inputStyle} />
        </div>
        <div style={{ ...fieldStyle, justifyContent: "flex-end" }}>
          <label style={labelStyle}>Ausência CID F</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
            <input type="hidden" name="ausencia_cidf" value="true" />
            <input
              type="checkbox"
              id="ausencia_cidf_check"
              onChange={e => {
                const hidden = e.currentTarget.form?.querySelector('input[name="ausencia_cidf"][type="hidden"]') as HTMLInputElement | null;
                if (hidden) hidden.value = e.currentTarget.checked ? "true" : "false";
              }}
              defaultChecked
              style={{ width: 16, height: 16, accentColor: "var(--brand)" }}
            />
            <label htmlFor="ausencia_cidf_check" style={{ fontSize: 13, color: "var(--text-700)" }}>
              Colaborador ausente por CID F
            </label>
          </div>
        </div>
        {err && <div style={{ gridColumn: "1 / -1", color: "var(--red)", fontSize: 12 }}>{err}</div>}
        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" disabled={pending} style={btnStyle}>
            {pending ? "Salvando..." : "Registrar Ausência CID F"}
          </button>
        </div>
      </form>

      {records.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Gestor", "Colaborador", "Mês", "CID F", ""].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={tdStyle}>{r.nome_gestor}</td>
                  <td style={tdStyle}>{r.nome_colaborador}</td>
                  <td style={tdStyle}>{r.mes_referencia.slice(0, 7)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: r.ausencia_cidf ? "#fee2e2" : "var(--surface-2)",
                      color: r.ausencia_cidf ? "#991b1b" : "var(--text-500)",
                    }}>
                      {r.ausencia_cidf ? "Sim" : "Não"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <form action={deleteCIDF.bind(null, r.id)}>
                      <button type="submit" style={deleteBtnStyle}>Remover</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ color: "var(--text-300)", fontSize: 12 }}>Nenhum registro ainda.</div>
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
