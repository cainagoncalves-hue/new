"use client";
import { useRef, useState, useEffect, useLayoutEffect } from "react";

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  children: OrgNode[];
}

const TREE_CSS = `
.org-ul {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 28px 0 0;
  position: relative;
}
.org-ul::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 0; height: 28px;
  border-left: 1.5px dashed #94a3b8;
}
.org-li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 10px 0;
  position: relative;
}
.org-li::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 50%;
  border-top: 1.5px dashed #94a3b8;
}
.org-li::after {
  content: '';
  position: absolute;
  top: 0; left: 50%; right: 0;
  border-top: 1.5px dashed #94a3b8;
}
.org-li:first-child::before,
.org-li:only-child::before { display: none; }
.org-li:last-child::after,
.org-li:only-child::after  { display: none; }
.org-node.hc::before {
  content: '';
  position: absolute;
  top: -28px; left: 50%;
  transform: translateX(-50%);
  width: 0; height: 28px;
  border-left: 1.5px dashed #94a3b8;
}
`;

const D = [
  { bg: "#16a34a", fg: "#fff",                     border: "#15803d" },
  { bg: "#fff",    fg: "var(--brand)",              border: "var(--brand)" },
  { bg: "#fff",    fg: "var(--text-900)",           border: "var(--border-2)" },
  { bg: "var(--surface-2)", fg: "var(--text-500)",  border: "var(--border)" },
];

function shortName(n: string) {
  const p = n.trim().split(" ");
  return p.length <= 2 ? n : `${p[0]} ${p[p.length - 1]}`;
}

function OrgNodeEl({ node, depth, isRoot }: { node: OrgNode; depth: number; isRoot?: boolean }) {
  const [open, setOpen] = useState(depth < 2);
  const has = node.children.length > 0;
  const d = D[Math.min(depth, D.length - 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        className={`org-node${!isRoot ? " hc" : ""}`}
        onClick={has ? (e) => { e.stopPropagation(); setOpen(v => !v); } : undefined}
        style={{
          position: "relative",
          background: d.bg,
          color: d.fg,
          border: `1.5px solid ${d.border}`,
          borderRadius: 10,
          padding: isRoot ? "12px 24px" : depth === 1 ? "10px 18px" : "8px 14px",
          textAlign: "center",
          cursor: has ? "pointer" : "default",
          minWidth: isRoot ? 152 : 120,
          maxWidth: 200,
          userSelect: "none",
          boxShadow: depth < 2 ? "0 2px 10px rgba(0,0,0,0.10)" : "none",
          zIndex: 1,
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontSize: isRoot ? 14 : depth === 1 ? 13 : 11, fontWeight: depth <= 1 ? 700 : 600, lineHeight: 1.35, fontFamily: "'DM Sans', sans-serif" }}>
          {shortName(node.name)}
        </div>
        {node.role && (
          <div style={{ fontSize: 10, marginTop: 2, opacity: 0.75, lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif", whiteSpace: "normal" }}>
            {node.role}
          </div>
        )}
        {has && (
          <span style={{
            position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
            width: 18, height: 18, borderRadius: "50%",
            background: depth === 0 ? "#15803d" : "var(--brand)",
            color: "#fff", fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
          }}>
            {open ? "−" : node.children.length}
          </span>
        )}
      </div>

      {has && open && (
        <ul className="org-ul">
          {node.children.map(c => (
            <li key={c.id} className="org-li">
              <OrgNodeEl node={c} depth={depth + 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ZoomBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 34, height: 34, borderRadius: 8,
        border: "1px solid var(--border-2)",
        background: "var(--surface)",
        color: "var(--text-900)",
        fontSize: 18, fontWeight: 700,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        transition: "background 0.12s",
      }}
    >
      {label}
    </button>
  );
}

interface Transform { x: number; y: number; scale: number }

export default function OrgTreeClient({ roots }: { roots: OrgNode[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef   = useRef<HTMLDivElement>(null);
  const [tf, setTf]  = useState<Transform>({ x: 0, y: 60, scale: 0.8 });
  const [drag, setDrag] = useState(false);
  const start = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });

  // Center tree on first render
  useLayoutEffect(() => {
    const c = containerRef.current;
    const t = contentRef.current;
    if (!c || !t) return;
    const scale = 0.8;
    const x = Math.max(20, (c.clientWidth - t.scrollWidth * scale) / 2);
    setTf({ x, y: 60, scale });
  }, []);

  // Non-passive wheel → zoom toward cursor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setTf(t => {
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const ns = Math.max(0.1, Math.min(3, t.scale * factor));
        const r = ns / t.scale;
        return { x: mx - r * (mx - t.x), y: my - r * (my - t.y), scale: ns };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Touch pan & pinch
  const lastTouch = useRef<{ x: number; y: number; dist: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouch.current = { x: 0, y: 0, dist: Math.hypot(dx, dy) };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!lastTouch.current) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setTf(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
      lastTouch.current = { ...lastTouch.current, x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastTouch.current.dist > 0) {
        const factor = dist / lastTouch.current.dist;
        setTf(t => ({ ...t, scale: Math.max(0.1, Math.min(3, t.scale * factor)) }));
      }
      lastTouch.current = { ...lastTouch.current, dist };
    }
  };

  if (!roots.length) return (
    <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-300)" }}>
      Nenhum dado encontrado.
    </div>
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <style>{TREE_CSS}</style>

      {/* Zoom controls */}
      <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <ZoomBtn label="+" title="Zoom in"  onClick={() => setTf(t => ({ ...t, scale: Math.min(3, t.scale * 1.2) }))} />
        <ZoomBtn label="−" title="Zoom out" onClick={() => setTf(t => ({ ...t, scale: Math.max(0.1, t.scale / 1.2) }))} />
        <ZoomBtn label="⌂" title="Resetar"  onClick={() => {
          const c = containerRef.current;
          const ct = contentRef.current;
          const scale = 0.8;
          const x = c && ct ? Math.max(20, (c.clientWidth - ct.scrollWidth * scale) / 2) : 60;
          setTf({ x, y: 60, scale });
        }} />
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onMouseDown={e => {
          if ((e.target as Element).closest(".org-node")) return;
          start.current = { mx: e.clientX, my: e.clientY, tx: tf.x, ty: tf.y };
          setDrag(true);
          e.preventDefault();
        }}
        onMouseMove={e => {
          if (!drag) return;
          setTf(t => ({
            ...t,
            x: start.current.tx + e.clientX - start.current.mx,
            y: start.current.ty + e.clientY - start.current.my,
          }));
        }}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { lastTouch.current = null; }}
        style={{
          width: "100%", height: "100%",
          overflow: "hidden",
          cursor: drag ? "grabbing" : "grab",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Transformable content */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0,
            transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`,
            transformOrigin: "0 0",
            willChange: "transform",
          }}
        >
          <div
            ref={contentRef}
            style={{ display: "flex", gap: 80, alignItems: "flex-start", padding: "20px 80px 80px" }}
          >
            {roots.map(root => (
              <div key={root.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <OrgNodeEl node={root} depth={0} isRoot />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
