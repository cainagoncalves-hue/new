"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function OrgChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="4" rx="1" />
      <rect x="1" y="17" width="6" height="4" rx="1" />
      <rect x="9" y="17" width="6" height="4" rx="1" />
      <rect x="17" y="17" width="6" height="4" rx="1" />
      <line x1="12" y1="5" x2="12" y2="10" />
      <line x1="4" y1="17" x2="4" y2="14" />
      <line x1="12" y1="17" x2="12" y2="14" />
      <line x1="20" y1="17" x2="20" y2="14" />
      <line x1="4" y1="14" x2="20" y2="14" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PromocaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

const MODULES = [
  { href: "/", label: "Hub", Icon: HomeIcon, exact: true },
  { href: "/nps", label: "NPS Dashboard", Icon: BarChartIcon, exact: false },
  { href: "/feedback", label: "Feedback", Icon: MessageIcon, exact: false },
  { href: "/talentos", label: "Talentos", Icon: UsersIcon, exact: false },
  { href: "/iso", label: "ISO / ISBE", Icon: HeartIcon, exact: false },
  { href: "/img", label: "IMG", Icon: ActivityIcon, exact: false },
  { href: "/organograma", label: "Organograma", Icon: OrgChartIcon, exact: false },
  { href: "/promocao", label: "Promoção", Icon: PromocaoIcon, exact: false },
];

const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 60;

function Sidebar({ collapsed, onToggle, isAdmin }: { collapsed: boolean; onToggle: () => void; isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        flexShrink: 0,
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        position: "sticky",
        top: 64,
        height: "calc(100vh - 64px)",
        overflowX: "hidden",
        overflowY: "auto",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* Toggle */}
      <div
        style={{
          padding: "10px 8px",
          display: "flex",
          justifyContent: collapsed ? "center" : "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          minHeight: 48,
        }}
      >
        {!collapsed && (
          <span
            style={{
              paddingLeft: 8,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-300)",
              whiteSpace: "nowrap",
            }}
          >
            Módulos
          </span>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            border: "1px solid var(--border-2)",
            background: "var(--surface-2)",
            color: "var(--text-500)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.15s ease, color 0.15s ease",
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        {MODULES.map(({ href, label, Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "10px 0" : "10px 14px",
                justifyContent: collapsed ? "center" : "flex-start",
                margin: "2px 8px",
                borderRadius: 8,
                color: isActive ? "var(--brand)" : "var(--text-500)",
                background: isActive ? "var(--brand-pale)" : "transparent",
                textDecoration: "none",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                transition: "background 0.14s ease, color 0.14s ease",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ flexShrink: 0 }}>
                <Icon />
              </span>
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Seção admin — só aparece para administradores */}
      {isAdmin && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 0 12px" }}>
          {!collapsed && (
            <span style={{
              display: "block",
              paddingLeft: 22,
              paddingBottom: 4,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "var(--text-200)",
              whiteSpace: "nowrap",
            }}>
              Admin
            </span>
          )}
          <Link
            href="/dados"
            title={collapsed ? "Atualização de Dados" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "10px 0" : "10px 14px",
              justifyContent: collapsed ? "center" : "flex-start",
              margin: "2px 8px",
              borderRadius: 8,
              color: pathname.startsWith("/dados") ? "var(--brand)" : "var(--text-500)",
              background: pathname.startsWith("/dados") ? "var(--brand-pale)" : "transparent",
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: pathname.startsWith("/dados") ? 600 : 400,
              transition: "background 0.14s ease, color 0.14s ease",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ flexShrink: 0 }}><DatabaseIcon /></span>
            {!collapsed && <span>Atualização de Dados</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}

export default function AppShell({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {mounted ? (
        <Sidebar collapsed={collapsed} onToggle={toggle} isAdmin={isAdmin} />
      ) : (
        // SSR placeholder — mesma largura para evitar layout shift
        <aside
          style={{
            width: SIDEBAR_EXPANDED,
            flexShrink: 0,
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            height: "calc(100vh - 64px)",
            position: "sticky",
            top: 64,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
