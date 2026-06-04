"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Desempenho = "abaixo" | "dentro" | "acima";
type FaixaSalarial = "abaixo" | "dentro" | "acima";
type BinValue = "sim" | "nao";
type TempoAumento = "menos1ano" | "mais1ano";
type RiscoSaida = "baixo" | "medio" | "alto";

const CULTURA_KEYS = [
  "c1","c2","c3","r1","r2","r3","co1","co2","co3",
  "i1","i2","i3","p1","p2","p3","s1","s2","s3","d1","d2","d3",
] as const;
type CulturaKey = (typeof CULTURA_KEYS)[number];
type CulturaState = Record<CulturaKey, boolean>;

// ─── Culture Pillars ──────────────────────────────────────────────────────────
const PILARES = [
  {
    label: "1. Colaborativos", icon: "",
    questions: [
      { key: "c1", text: "Compartilha contextos e constrói soluções de forma integrada com o time?" },
      { key: "c2", text: "Atua proativamente eliminando retrabalhos e gargalos entre áreas parceiras?" },
      { key: "c3", text: "Sabe ouvir e respeitar pontos de vista discordantes em prol do negócio?" },
    ],
  },
  {
    label: "2. Relevantes", icon: "",
    questions: [
      { key: "r1", text: "Analisa o real impacto e prioridade de uma demanda antes de executá-la?" },
      { key: "r2", text: "Direciona suas rotinas com foco total na geração de valor real para o cliente?" },
      { key: "r3", text: "Prioriza qualidade de resultado e relevância ao invés de apenas volume bruto?" },
    ],
  },
  {
    label: "3. Corajosos", icon: "",
    questions: [
      { key: "co1", text: "Tem maturidade para encarar conversas de alinhamento e feedbacks complexos?" },
      { key: "co2", text: "Assume a responsabilidade de seus atos, agindo rápido diante de falhas?" },
      { key: "co3", text: "Comunica opiniões com transparência e ética, sem omitir riscos latentes?" },
    ],
  },
  {
    label: "4. Inconformados", icon: "",
    questions: [
      { key: "i1", text: "Mostra curiosidade constante e abertura sadia para novos aprendizados?" },
      { key: "i2", text: "Evita o comodismo e busca caminhos de melhoria mesmo no que já roda bem?" },
      { key: "i3", text: "Demonstra inconformismo produtivo ao questionar rotinas ineficientes?" },
    ],
  },
  {
    label: "5. Proativos", icon: "",
    questions: [
      { key: "p1", text: "Antecipa potenciais gargalos e riscos antes que causem impacto?" },
      { key: "p2", text: "Atua de maneira autônoma e resolutiva sem necessitar de cobranças frequentes?" },
      { key: "p3", text: "Traz cenários e opções de respostas estruturadas ao reportar falhas?" },
    ],
  },
  {
    label: "6. Simples", icon: "",
    questions: [
      { key: "s1", text: "Resolve demandas complexas através de saídas limpas, organizadas e diretas?" },
      { key: "s2", text: "Simplifica o entendimento geral de rotinas reduzindo burocracias de fluxo?" },
      { key: "s3", text: "Entende e pratica a premissa de que boas resoluções não devem ser confusas?" },
    ],
  },
  {
    label: "7. Disciplinados", icon: "",
    questions: [
      { key: "d1", text: "Mantém dedicação técnica firme, consistência e foco em períodos de alta pressão?" },
      { key: "d2", text: "Segue com integridade os prazos e acordos estabelecidos coletivamente?" },
      { key: "d3", text: "Garante previsibilidade às operações documentando rituais de decisão?" },
    ],
  },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────
function calcScore(
  desempenho: Desempenho,
  cultura: CulturaState,
  faixaSalarial: FaixaSalarial,
  riscoSaida: RiscoSaida,
  sucessor: BinValue,
  talentoChave: BinValue,
  tempoAumento: TempoAumento,
) {
  let nota = 0;
  if (desempenho === "acima") nota += 4.0;
  else if (desempenho === "dentro") nota += 2.5;

  const simCount = CULTURA_KEYS.filter(k => cultura[k]).length;
  nota += (simCount / 21) * 3.5;

  if (faixaSalarial === "abaixo") nota += 0.6;
  else if (faixaSalarial === "dentro") nota += 0.3;

  if (riscoSaida === "alto") nota += 0.6;
  else if (riscoSaida === "medio") nota += 0.3;

  if (sucessor === "sim") nota += 0.4;
  if (talentoChave === "sim") nota += 0.5;
  if (tempoAumento === "mais1ano") nota += 0.4;

  return { nota: Math.min(nota, 10), simCount };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({
  icon, title, subtitle, children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r)",
      boxShadow: "var(--sh)",
      overflow: "hidden",
    }}>
      <div style={{
        background: "var(--surface-2)",
        borderBottom: "1px solid var(--border)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        {icon && <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{icon}</span>}
        <div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--text-900)",
          }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "var(--text-300)", marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function RowLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ maxWidth: 400, minWidth: 200 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-900)" }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "var(--text-300)", marginTop: 2, lineHeight: 1.4 }}>{subtitle}</div>
      )}
    </div>
  );
}

function PillGroup<T extends string,>({
  options, value, onChange,
}: {
  options: { value: T; label: string; activeColor?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = opt.value === value;
        const color = opt.activeColor ?? "var(--brand)";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: `1px solid ${active ? color : "var(--border-2)"}`,
              background: active ? color : "var(--surface)",
              color: active ? "#fff" : "var(--text-500)",
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.14s ease",
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SimNaoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => onChange(true)}
        style={{
          padding: "4px 12px",
          borderRadius: 7,
          border: `1px solid ${value ? "var(--green)" : "var(--border-2)"}`,
          background: value ? "var(--green-bg)" : "var(--surface)",
          color: value ? "var(--green-text)" : "var(--text-500)",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.14s ease",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >SIM</button>
      <button
        type="button"
        onClick={() => onChange(false)}
        style={{
          padding: "4px 12px",
          borderRadius: 7,
          border: `1px solid ${!value ? "var(--red)" : "var(--border-2)"}`,
          background: !value ? "var(--red-bg)" : "var(--surface)",
          color: !value ? "var(--red-text)" : "var(--text-500)",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.14s ease",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >NÃO</button>
    </div>
  );
}

const initCultura = (): CulturaState =>
  Object.fromEntries(CULTURA_KEYS.map(k => [k, true])) as CulturaState;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PromocaoPage() {
  const [colaborador, setColaborador] = useState("");
  const [setor, setSetor] = useState("");
  const [tempoEmpresa, setTempoEmpresa] = useState("");
  const [cargoAtual, setCargoAtual] = useState("");
  const [cargoProposto, setCargoProposto] = useState("");
  const [lider, setLider] = useState("");
  const [orcada, setOrcada] = useState<BinValue>("sim");
  const [desempenho, setDesempenho] = useState<Desempenho>("dentro");
  const [faixaSalarial, setFaixaSalarial] = useState<FaixaSalarial>("abaixo");
  const [sucessor, setSucessor] = useState<BinValue>("nao");
  const [talentoChave, setTalentoChave] = useState<BinValue>("nao");
  const [tempoAumento, setTempoAumento] = useState<TempoAumento>("menos1ano");
  const [riscoSaida, setRiscoSaida] = useState<RiscoSaida>("baixo");
  const [cultura, setCultura] = useState<CulturaState>(initCultura);
  const [evidencias, setEvidencias] = useState("");

  const { nota, simCount } = calcScore(
    desempenho, cultura, faixaSalarial, riscoSaida, sucessor, talentoChave, tempoAumento,
  );
  const blocked = desempenho === "abaixo" || simCount < 16;

  type StatusConfig = { label: string; bg: string; text: string; border: string; bar: string; cardBg: string; heading: string; body: string };
  const status: StatusConfig = !blocked && nota >= 8.5
    ? {
        label: "ELEGÍVEL IMEDIATO",
        bg: "var(--green-bg)", text: "var(--green-text)", border: "#6EE7B7",
        bar: "var(--green)", cardBg: "#F0FDF4",
        heading: "Altamente Recomendado",
        body: "O colaborador apresenta excelência de entrega no quadrante de performance, valida os pilares comportamentais práticos e possui risco crítico de retenção ou potencial estratégico mapeado.",
      }
    : !blocked && nota >= 6.0
    ? {
        label: "REVISÃO RECOMENDADA",
        bg: "var(--amber-bg)", text: "var(--amber-text)", border: "#FCD34D",
        bar: "var(--amber)", cardBg: "#FFFBEB",
        heading: "Maturação em Andamento",
        body: "O profissional atende às metas vigentes, porém apresenta gaps leves nas subperguntas do mapa comportamental. Recomenda-se alinhamento estruturado com People para validação do timing.",
      }
    : {
        label: "INELEGÍVEL NO MOMENTO",
        bg: "var(--red-bg)", text: "var(--red-text)", border: "#FCA5A5",
        bar: "var(--red)", cardBg: "#FFF5F5",
        heading: "Foco em Plano de Desenvolvimento",
        body: "O colaborador está posicionado abaixo das metas técnicas esperadas para o papel atual ou apresenta descolamento cultural severo nas métricas. Necessário propor PDI corretivo.",
      };

  const setCulturaKey = (key: CulturaKey, value: boolean) =>
    setCultura(prev => ({ ...prev, [key]: value }));

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--border-2)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--text-900)",
    background: "var(--surface)",
    outline: "none",
    marginTop: 4,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-300)",
    display: "block",
  };

  return (
    <div style={{ padding: "40px 48px", maxWidth: 960, margin: "0 auto" }}>

      {/* Page Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 28,
      }}>
        <div>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--brand)",
          }}>People &amp; Culture</span>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 24,
            color: "var(--text-900)",
            marginTop: 4,
            lineHeight: 1.2,
          }}>Formulário de Elegibilidade para Promoção</h1>
          <p style={{ fontSize: 13, color: "var(--text-300)", marginTop: 4 }}>
            Validação orçamentária, análise de performance e mapeamento de valores da SIEG.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid var(--border-2)",
            background: "var(--surface)",
            color: "var(--text-500)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'DM Sans', sans-serif",
            flexShrink: 0,
          }}
        >
          Imprimir / PDF
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Info Section */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r)",
          boxShadow: "var(--sh)",
          padding: 24,
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 16,
        }}>
          <div>
            <label style={labelStyle}>Nome do Colaborador</label>
            <input
              type="text"
              value={colaborador}
              onChange={e => setColaborador(e.target.value)}
              placeholder="Nome completo"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Setor / Departamento</label>
            <input type="text" value={setor} onChange={e => setSetor(e.target.value)} placeholder="Ex: Tecnologia" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tempo de Empresa</label>
            <input type="text" value={tempoEmpresa} onChange={e => setTempoEmpresa(e.target.value)} placeholder="Ex: 1 ano e 4 meses" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Promoção Orçada?</label>
            <div style={{ marginTop: 6 }}>
              <PillGroup
                options={[
                  { value: "sim" as BinValue, label: "SIM" },
                  { value: "nao" as BinValue, label: "NÃO" },
                ]}
                value={orcada}
                onChange={setOrcada}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Cargo Atual</label>
            <input type="text" value={cargoAtual} onChange={e => setCargoAtual(e.target.value)} placeholder="Cargo vigente" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cargo Proposto</label>
            <input type="text" value={cargoProposto} onChange={e => setCargoProposto(e.target.value)} placeholder="Novo cargo sugerido" style={inputStyle} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={labelStyle}>Líder Solicitante</label>
            <input type="text" value={lider} onChange={e => setLider(e.target.value)} placeholder="Gestor imediato" style={inputStyle} />
          </div>
        </div>

        {/* Performance */}
        <SectionCard
          icon=""
          title="Avaliação de Desempenho do Ciclo"
          subtitle="Selecione o nível de entrega técnica demonstrado de acordo com a meta semestral."
        >
          <div style={{
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}>
            <RowLabel
              title="Resultado Consolidado de Performance"
              subtitle="Mapeamento direto do atingimento de KPIs, metas da área e complexidade de resolução."
            />
            <PillGroup
              options={[
                { value: "abaixo" as Desempenho, label: "Abaixo do esperado", activeColor: "#DC2626" },
                { value: "dentro" as Desempenho, label: "Dentro do esperado", activeColor: "#2563EB" },
                { value: "acima" as Desempenho, label: "Acima do esperado", activeColor: "#16A34A" },
              ]}
              value={desempenho}
              onChange={setDesempenho}
            />
          </div>
        </SectionCard>

        {/* Remuneração e Retenção */}
        <SectionCard
          icon=""
          title="Posicionamento de Remuneração e Retenção"
          subtitle="Histórico de reajustes e mapeamento de riscos e potenciais estratégicos."
        >
          {([
            {
              title: "1. Posicionamento na Faixa Salarial",
              subtitle: "Onde o salário do colaborador está localizado frente às tabelas de cargos vigentes?",
              node: (
                <PillGroup
                  options={[
                    { value: "abaixo" as FaixaSalarial, label: "Abaixo" },
                    { value: "dentro" as FaixaSalarial, label: "Dentro" },
                    { value: "acima" as FaixaSalarial, label: "Acima" },
                  ]}
                  value={faixaSalarial}
                  onChange={setFaixaSalarial}
                />
              ),
            },
            {
              title: "2. Indicado como Sucessor Estratégico",
              subtitle: "O profissional está mapeado nas matrizes de sucessão e continuidade de liderança?",
              node: (
                <PillGroup
                  options={[
                    { value: "sim" as BinValue, label: "SIM" },
                    { value: "nao" as BinValue, label: "NÃO" },
                  ]}
                  value={sucessor}
                  onChange={setSucessor}
                />
              ),
            },
            {
              title: "3. Identificado como Talento Chave (Key Talent)?",
              subtitle: "O colaborador possui habilidades críticas, raras ou alta performance difícil de substituir?",
              node: (
                <PillGroup
                  options={[
                    { value: "sim" as BinValue, label: "SIM" },
                    { value: "nao" as BinValue, label: "NÃO" },
                  ]}
                  value={talentoChave}
                  onChange={setTalentoChave}
                />
              ),
            },
            {
              title: "4. Tempo decorrido desde o Último Aumento",
              subtitle: "Intervalo de tempo desde a última movimentação financeira de mérito.",
              node: (
                <PillGroup
                  options={[
                    { value: "menos1ano" as TempoAumento, label: "Menos de 1 Ano" },
                    { value: "mais1ano" as TempoAumento, label: "Mais de 1 Ano" },
                  ]}
                  value={tempoAumento}
                  onChange={setTempoAumento}
                />
              ),
            },
            {
              title: "5. Risco de Saída Identificado",
              subtitle: "Nível latente de risco de perda do ativo intelectual e técnico para o mercado externo.",
              node: (
                <PillGroup
                  options={[
                    { value: "baixo" as RiscoSaida, label: "Baixo" },
                    { value: "medio" as RiscoSaida, label: "Médio" },
                    { value: "alto" as RiscoSaida, label: "Alto" },
                  ]}
                  value={riscoSaida}
                  onChange={setRiscoSaida}
                />
              ),
            },
          ] as { title: string; subtitle: string; node: React.ReactNode }[]).map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                padding: "16px 24px",
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              <RowLabel title={row.title} subtitle={row.subtitle} />
              {row.node}
            </div>
          ))}
        </SectionCard>

        {/* Pilares Culturais */}
        <SectionCard
          icon=""
          title="Pilares e Comportamentos (Culture Book)"
          subtitle="Mapeamento direto com base no manual prático de cultura e conduta diária."
        >
          <div style={{ padding: "4px 24px 16px" }}>
            {PILARES.map((pilar, pi) => (
              <div
                key={pilar.label}
                style={{
                  paddingTop: 16,
                  paddingBottom: 16,
                  borderTop: pi > 0 ? "1px solid var(--border)" : undefined,
                }}
              >
                <div style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--brand)",
                  marginBottom: 10,
                }}>
                  {pilar.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pilar.questions.map(q => (
                    <div
                      key={q.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <span style={{ fontSize: 12, color: "var(--text-700)", lineHeight: 1.45 }}>
                        {q.text}
                      </span>
                      <SimNaoToggle
                        value={cultura[q.key as CulturaKey]}
                        onChange={v => setCulturaKey(q.key as CulturaKey, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Evidências Práticas */}
        <SectionCard
          icon=""
          title="Caixa de Evidências Práticas"
          subtitle="Informe quais projetos estratégicos, entregas técnicas ou ações justificam esta solicitação."
        >
          <div style={{ padding: "16px 24px 24px" }}>
            <textarea
              value={evidencias}
              onChange={e => setEvidencias(e.target.value)}
              placeholder="Descreva aqui as entregas empíricas que sustentam este movimento de carreira..."
              style={{
                width: "100%",
                border: "1px solid var(--border-2)",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                color: "var(--text-900)",
                height: 120,
                resize: "vertical",
                outline: "none",
                lineHeight: 1.55,
                background: "var(--surface)",
              }}
            />
          </div>
        </SectionCard>

        {/* Result Dashboard */}
        <div style={{
          background: status.cardBg,
          border: `1px solid ${status.border}`,
          borderRadius: "var(--r)",
          boxShadow: "var(--sh-md)",
          padding: "36px 24px",
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-300)",
            marginBottom: 10,
          }}>
            Diagnóstico Consolidado
          </div>

          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: "inline-block",
              padding: "6px 20px",
              borderRadius: 20,
              background: status.bg,
              color: status.text,
              border: `1px solid ${status.border}`,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>{status.label}</span>
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <h3 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 20,
              color: "var(--text-900)",
              marginBottom: 8,
            }}>
              {status.heading}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-500)", lineHeight: 1.6 }}>
              {status.body}
            </p>
          </div>

          <div style={{
            maxWidth: 340,
            margin: "24px auto 0",
            paddingTop: 20,
            borderTop: "1px solid rgba(0,0,0,0.06)",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-300)",
              marginBottom: 6,
            }}>
              <span>Score de Elegibilidade</span>
              <span>{nota.toFixed(1)} / 10.0</span>
            </div>
            <div style={{
              width: "100%",
              background: "rgba(0,0,0,0.08)",
              height: 8,
              borderRadius: 4,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${nota * 10}%`,
                height: "100%",
                background: status.bar,
                borderRadius: 4,
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--text-300)",
              textAlign: "right",
            }}>
              {simCount} / 21 comportamentos culturais validados
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
