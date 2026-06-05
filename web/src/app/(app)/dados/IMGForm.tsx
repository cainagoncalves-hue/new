"use client";

import { useState, useRef, useActionState } from "react";
import { upsertIMGIndicador, deleteIMGIndicador, bulkUpsertIMGIndicadores } from "./actions";

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
  metas_registradas:    "100% dos colaboradores com metas registradas",
  checkins_prazo:       "Checkins realizados no prazo",
  reuniao_resultado:    "Reunião de resultado realizada",
  rdm_prazo:            "RDMs elaborados no prazo",
  headcount_previsto:   "Headcount dentro do previsto (±5%)",
  custo_folha_previsto: "Custo de folha dentro do previsto (±5%)",
  atingimento_metas:    "Atingimento das metas (mín. 80% do time)",
};

const MONTH = new Date().toISOString().slice(0, 7);

/** Escapa campo CSV se contiver vírgula, aspas ou quebra de linha */
function csvCell(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadTemplate(gestores: string[]) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const lines: string[] = ["nome_gestor,mes_referencia,indicador,valor_pct"];

  // Uma linha por gestor × indicador — valor 0 como placeholder para preenchimento
  for (const gestor of gestores) {
    for (const ind of Object.keys(INDICADORES)) {
      lines.push(`${csvCell(gestor)},${currentMonth},${ind},0`);
    }
  }

  lines.push("");
  lines.push("# ── Valores válidos para o campo indicador ────────────────────");
  for (const [key, label] of Object.entries(INDICADORES)) {
    lines.push(`# ${key} → ${label}`);
  }
  lines.push("#");
  lines.push("# mes_referencia: formato AAAA-MM (ex: 2026-05)");
  lines.push("# valor_pct: número entre 0 e 100");
  lines.push("# Linhas começando com # são ignoradas pelo sistema");
  lines.push("# Dados existentes (mesmo gestor + mês + indicador) são substituídos pelo upload mais recente");

  // BOM para Excel abrir UTF-8 corretamente
  const csv = "﻿" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `img_indicadores_${currentMonth}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type BulkResult = { ok: boolean; inserted: number; errors: string[] };

export default function IMGForm({ gestores, records }: Props) {
  // ── Estado do formulário manual ────────────────────────────────
  const formRef = useRef<HTMLFormElement>(null);
  const [manualErr, manualAction, manualPending] = useActionState(
    async (_: unknown, fd: FormData) => {
      try {
        await upsertIMGIndicador(fd);
        formRef.current?.reset();
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    },
    null as string | null,
  );

  // ── Estado do upload em massa ──────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [bulkResult, bulkAction, bulkPending] = useActionState(
    async (_: unknown, fd: FormData): Promise<BulkResult | null> => {
      try {
        const result = await bulkUpsertIMGIndicadores(fd);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFileName(null);
        return { ok: true, inserted: result.inserted, errors: result.errors };
      } catch (e) {
        return { ok: false, inserted: 0, errors: [(e as Error).message] };
      }
    },
    null as BulkResult | null,
  );

  return (
    <div>
      {/* ── Upload em Massa ─────────────────────────────────────── */}
      <div style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "18px 20px",
        marginBottom: 28,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-900)", marginBottom: 3 }}>
              Upload em Massa
            </div>
            <div style={{ fontSize: 12, color: "var(--text-400)", lineHeight: 1.5 }}>
              Importe um CSV com múltiplos indicadores de uma vez.
              O upload mais recente sempre prevalece — dados existentes são sobrescritos.
            </div>
          </div>
          <button
            type="button"
            onClick={() => downloadTemplate(gestores)}
            title="Baixar planilha modelo para preenchimento"
            style={{
              display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "8px 14px",
              fontSize: 12, fontWeight: 600, color: "var(--text-500)",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            ⬇ Baixar Modelo
          </button>
        </div>

        <form action={bulkAction} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            name="csv_file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
          />

          {/* Botão para abrir o seletor */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "9px 16px", borderRadius: 8,
              border: "1px dashed var(--border-2)",
              background: "var(--surface)", cursor: "pointer",
              fontSize: 12, color: fileName ? "var(--text-900)" : "var(--text-400)",
              fontWeight: fileName ? 600 : 400,
              fontFamily: "'DM Sans', sans-serif",
              maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {fileName ? `📄 ${fileName}` : "Selecionar CSV..."}
          </button>

          {/* Botão de envio — aparece só quando há arquivo */}
          {fileName && (
            <button
              type="submit"
              disabled={bulkPending}
              style={{
                background: "var(--green, #16a34a)", color: "#fff",
                border: "none", borderRadius: 8, padding: "9px 18px",
                fontSize: 12, fontWeight: 600, cursor: bulkPending ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif", opacity: bulkPending ? 0.7 : 1,
              }}
            >
              {bulkPending ? "Importando..." : "⬆ Importar"}
            </button>
          )}

          {/* Limpar seleção */}
          {fileName && !bulkPending && (
            <button
              type="button"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = "";
                setFileName(null);
              }}
              style={{
                background: "none", border: "none", color: "var(--text-300)",
                fontSize: 12, cursor: "pointer", padding: "4px",
              }}
            >
              ✕
            </button>
          )}
        </form>

        {/* Resultado do upload */}
        {bulkResult && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 12,
            background: bulkResult.ok ? "var(--green-bg)" : "var(--red-bg)",
            border: `1px solid ${bulkResult.ok ? "var(--green)" : "var(--red)"}`,
          }}>
            {bulkResult.ok ? (
              <div>
                <span style={{ color: "var(--green-text)", fontWeight: 600 }}>
                  ✓ {bulkResult.inserted} linha{bulkResult.inserted !== 1 ? "s" : ""} importada{bulkResult.inserted !== 1 ? "s" : ""} com sucesso.
                </span>
                {bulkResult.errors.length > 0 && (
                  <span style={{ color: "var(--amber-text)", marginLeft: 8 }}>
                    {bulkResult.errors.length} linha{bulkResult.errors.length !== 1 ? "s" : ""} ignorada{bulkResult.errors.length !== 1 ? "s" : ""}.
                  </span>
                )}
                {bulkResult.errors.length > 0 && (
                  <ul style={{ margin: "6px 0 0 16px", color: "var(--amber-text)", lineHeight: 1.6 }}>
                    {bulkResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                    {bulkResult.errors.length > 5 && (
                      <li style={{ color: "var(--text-300)" }}>... e mais {bulkResult.errors.length - 5} erro(s)</li>
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <span style={{ color: "var(--red-text)", fontWeight: 600 }}>
                ✗ {bulkResult.errors[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const,
          letterSpacing: "0.08em", color: "var(--text-300)",
        }}>
          ou insira manualmente
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      {/* ── Formulário manual ────────────────────────────────────── */}
      <p style={{ fontSize: 12, color: "var(--text-300)", marginBottom: 16 }}>
        Preencha um indicador por vez. Se já existir um registro para o mesmo gestor + mês + indicador, o valor será atualizado.
      </p>

      <form ref={formRef} action={manualAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
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
        {manualErr && (
          <div style={{ gridColumn: "1 / -1", color: "var(--red)", fontSize: 12 }}>{manualErr}</div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <button type="submit" disabled={manualPending} style={btnStyle}>
            {manualPending ? "Salvando..." : "Salvar Indicador IMG"}
          </button>
        </div>
      </form>

      {/* ── Tabela de registros ──────────────────────────────────── */}
      {records.length > 0 ? (
        <div style={{ overflowX: "auto" as const }}>
          <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
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
