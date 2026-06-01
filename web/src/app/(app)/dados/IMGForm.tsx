"use client";

import { useActionState, useRef } from "react";
import { upsertIMGIndicador, deleteIMGIndicador } from "./actions";

interface IMGRecord {
  id: string;
  nome_gestor: string;
  mes_referencia: string;
  indicador: string;
  valor_pct: number;
}

interface Props {
  gestores: string[];
  records: IMGRecord[];
}

const INDICADORES: Record<string, string> = {
  metas_registradas: "100% dos colaboradores com metas registradas",
  checkins_prazo: "Checkins realizados no prazo",
  reuniao_resultado: "Reunião de resultado realizada",
  rdm_prazo: "RDMs elaborados no prazo",
  headcount_previsto: "Headcount dentro do previsto (±5%)",
  custo_folha_previsto: "Custo de folha dentro do previsto (±5%)",
  atingimento_metas: "Atingimento das metas (mín. 80% do time)",
};

const MONTH = new Date().toISOString().slice(0, 7);

export default function IMGForm({ gestores, records }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [err, action, pending] = useActionState(async (_: unknown, fd: FormData) => {
    try {
      await upsertIMGIndicador(fd);
      formRef.current?.reset();
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, null);

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-300)", marginBottom: 16 }}>
        Preencha um indicador por vez. Se já existir um registro para o mesmo gestor + mês + indicador, o valor será atualizado.
      </p>

      <form ref={formRef} action={action} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Gestor *</label>
          <select name="nome_gestor" required style={inputStyle}>
            <option value="">Selecione...</option>
            {gestores.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Mês de referência *</label>
          <input name="mes_referencia" type="month" required defaultValue={MONTH} style={inputStyle} />
        </div>
        <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Indicador *</label>
          <select name="indicador" required style={inputStyle}>
            <option value="">Selecione...</option>
            {Object.entries(INDICADORES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Percentual atingido (%) *</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              name="valor_pct"
              type="number"
              min={0}
              max={100}
              step={0.1}
              required
              style={{ ...inputStyle, width: 120 }}
              placeholder="0–100"
            />
            <span style={{ fontSize: 13, color: "var(--text-500)" }}>%</span>
          </div>
        </div>
        {err && <div style={{ gridColumn: "1 / -1", color: "var(--red)", fontSize: 12 }}>{err}</div>}
        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" disabled={pending} style={btnStyle}>
            {pending ? "Salvando..." : "Salvar Indicador IMG"}
          </button>
        </div>
      </form>

      {records.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Gestor", "Mês", "Indicador", "Valor", ""].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const color = r.valor_pct >= 80 ? "var(--green)" : r.valor_pct >= 50 ? "var(--amber)" : "var(--red)";
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={tdStyle}>{r.nome_gestor}</td>
                    <td style={tdStyle}>{r.mes_referencia.slice(0, 7)}</td>
                    <td style={tdStyle}>{INDICADORES[r.indicador] ?? r.indicador}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color }}>
                      {r.valor_pct.toFixed(1)}%
                    </td>
                    <td style={tdStyle}>
                      <form action={deleteIMGIndicador.bind(null, r.id)}>
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
        <div style={{ color: "var(--text-300)", fontSize: 12 }}>Nenhum indicador registrado ainda.</div>
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
