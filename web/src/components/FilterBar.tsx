"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

const BPS = [
  { id: "geral", label: "Geral", initial: "" },
  { id: "caina", label: "Cainã · Comercial & Marketing", initial: "C" },
  { id: "izabela", label: "Izabela · CX/CS & Financeiro", initial: "I" },
  { id: "renata_paula", label: "Renata/Paula · Tecnologia & RH", initial: "R/P" },
];

const LEADER_DATA: Record<string, { bp: string }> = {
  "Henrique Carmellino Filho": { bp: "caina" },
  "Walquiria Santos Correia": { bp: "izabela" },
  "Gustavo Carmellino": { bp: "renata_paula" },
  "Jorge Do Nascimento Junior": { bp: "caina" },
  "Leonardo De Oliveira Gama": { bp: "caina" },
  "Leandro dos Santos Machado": { bp: "renata_paula" },
  "Gabriela Maria Araujo Peres": { bp: "izabela" },
  "Danilo Jorge da Silva Novais": { bp: "caina" },
  "Jose Edmilson Da Silva": { bp: "izabela" },
  "Enock De Oliveira E Silva Neto": { bp: "izabela" },
  "Jonialysson Bezerra De Oliveira": { bp: "renata_paula" },
  "Jefte de Assumpcao Macedo": { bp: "renata_paula" },
  "Nathalia Vasconcelos Trajano Da Silva": { bp: "izabela" },
  "Joao Henrique Da Silva": { bp: "renata_paula" },
  "Thiago Souza Silva": { bp: "caina" },
  "Gabriel Fidelis Gonzaga Dos Santos": { bp: "izabela" },
  "Rafael Nascimento Ribeiro": { bp: "caina" },
  "Rodrigo Jose Anderson do Nascimento Goncalves da Silva": { bp: "izabela" },
  "Marcos Flavio De Paiva Reis": { bp: "caina" },
  "Publio Maswell Matos Cavalcanti": { bp: "izabela" },
  "Anderson Frederick Bernardes De Oliveira": { bp: "renata_paula" },
  "Camila Alves Da Silva": { bp: "renata_paula" },
  "Anderson Luis Lima da Silva": { bp: "izabela" },
  "Gabrielle Vitoria Fernandes Tavares": { bp: "caina" },
  "Tomas Signorelli Navarro Lima": { bp: "caina" },
  "Aline Alves de Oliveira": { bp: "izabela" },
  "Felipe Ayres Lins": { bp: "renata_paula" },
  "Arthur Alexandre Fracalossi Carvalho": { bp: "caina" },
  "Renata Oliveira De Moura Duarte": { bp: "renata_paula" },
  "Luana Dos Santos Silva": { bp: "izabela" },
  "Flavio Simao De Lima": { bp: "caina" },
  "Walisson Deyvson Barbosa Pernambuco": { bp: "izabela" },
  "Victor Fernando Soares de Barros": { bp: "izabela" },
  "Gilmar Oliveira E Silva Junior": { bp: "renata_paula" },
  "Paula Mikaelly Pimentel Silva Vieira": { bp: "renata_paula" },
  "Deoclecio Tadeu Jorge de Campos Filho": { bp: "caina" },
  "Elza Maria Eluana Da Silva Dias": { bp: "renata_paula" },
  "Douglas Dos Santos Soares": { bp: "caina" },
};

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bp = searchParams.get("bp") ?? "geral";
  const leader = searchParams.get("leader") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const selectBP = (id: string) => {
    const params = new URLSearchParams();
    if (id !== "geral") params.set("bp", id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const leaders =
    bp === "geral"
      ? Object.keys(LEADER_DATA).sort()
      : Object.entries(LEADER_DATA)
          .filter(([, d]) => d.bp === bp)
          .map(([name]) => name)
          .sort();

  return (
    <div style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      padding: "0 48px",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      position: "sticky",
      top: 64,
      zIndex: 99,
    }}>
      {/* BP Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto" }}>
        {BPS.map((b) => (
          <button
            key={b.id}
            onClick={() => selectBP(b.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid ${bp === b.id ? "var(--brand)" : "var(--border-2)"}`,
              background: bp === b.id ? "var(--brand)" : "transparent",
              color: bp === b.id ? "#fff" : "var(--text-500)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all .18s ease",
              whiteSpace: "nowrap",
            }}
          >
            {b.initial && (
              <span style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: bp === b.id ? "rgba(255,255,255,.22)" : "var(--brand-pale)",
                color: bp === b.id ? "#fff" : "var(--brand)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {b.initial}
              </span>
            )}
            {b.label}
          </button>
        ))}
      </div>

      {/* Leader filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <select
          value={leader}
          onChange={(e) => setParam("leader", e.target.value)}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            background: "var(--surface)",
            border: "1px solid var(--border-2)",
            borderRadius: 8,
            color: "var(--text-500)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            padding: "6px 32px 6px 12px",
            cursor: "pointer",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B52A0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
            minWidth: 210,
            outline: "none",
          }}
        >
          <option value="">Todos os líderes</option>
          {leaders.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {leader && (
          <button
            onClick={() => setParam("leader", "")}
            title="Limpar filtro"
            style={{
              background: "var(--brand-pale)",
              border: "none",
              borderRadius: "50%",
              width: 26,
              height: 26,
              cursor: "pointer",
              color: "var(--brand)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
