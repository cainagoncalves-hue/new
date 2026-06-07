"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface Props {
  periods: { key: string; label: string }[];
  activeMes: string;
}

export default function PeriodSelect({ periods, activeMes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function handleChange(mes: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", mes);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (periods.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <select
        value={activeMes}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          padding: "7px 32px 7px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text-700)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 10px center",
          minWidth: 180,
          boxShadow: "var(--sh)",
        }}
      >
        {periods.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
