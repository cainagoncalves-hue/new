"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { BPKey } from "@/lib/bp";

const BPS = [
  { id: "geral",        label: "Geral",                          initial: "" },
  { id: "caina",        label: "Cainã · Comercial & Marketing",  initial: "C" },
  { id: "izabela",      label: "Izabela · CX/CS & Financeiro",   initial: "I" },
  { id: "renata_paula", label: "Renata/Paula · Tecnologia & RH", initial: "R/P" },
];

interface FilterBarProps {
  /** Lista vinda do banco (bp_gestor_map) — passada pelo layout Server Component */
  leaders: { nome_gestor: string; bp: BPKey }[];
}

export default function FilterBar({ leaders }: FilterBarProps) {
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

  // Filtra líderes pelo BP selecionado; deduplica por nome
  const leaderNames = bp === "geral"
    ? [...new Set(leaders.map((l) => l.nome_gestor))].sort()
    : [...new Set(
        leaders.filter((l) => l.bp === bp).map((l) => l.nome_gestor),
      )].sort();

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
          {leaderNames.map((name) => (
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
