"use client";
import { useState } from "react";

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  children: OrgNode[];
}

const TREE_CSS = `
.org-wrap { overflow-x: auto; padding: 24px 40px 60px; }
.org-tree { display: flex; flex-direction: column; align-items: center; }

/* Child list */
.org-ul {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 28px 0 0;
  position: relative;
}
/* Vertical line from parent down to the horizontal bar */
.org-ul::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 28px;
  border-left: 1.5px dashed #94a3b8;
}

/* Each child slot */
.org-li {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 10px 0;
  position: relative;
}
/* Left half of the horizontal bar */
.org-li::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 50%;
  border-top: 1.5px dashed #94a3b8;
}
/* Right half of the horizontal bar */
.org-li::after {
  content: '';
  position: absolute;
  top: 0; left: 50%; right: 0;
  border-top: 1.5px dashed #94a3b8;
}
/* Edge children: remove overhanging half */
.org-li:first-child::before,
.org-li:only-child::before { display: none; }
.org-li:last-child::after,
.org-li:only-child::after  { display: none; }

/* Vertical drop from the horizontal bar to each node */
.org-node.hc::before {
  content: '';
  position: absolute;
  top: -28px; left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 28px;
  border-left: 1.5px dashed #94a3b8;
}
`;

/* Depth-based visual style */
const D = [
  { bg: "#16a34a", fg: "#fff",                    border: "#15803d" },  // 0 — root
  { bg: "#fff",    fg: "var(--brand)",             border: "var(--brand)" },  // 1
  { bg: "#fff",    fg: "var(--text-900)",          border: "var(--border-2)" },  // 2
  { bg: "var(--surface-2)", fg: "var(--text-500)", border: "var(--border)" },  // 3+
];

function shortName(n: string) {
  const p = n.trim().split(" ");
  return p.length <= 2 ? n : `${p[0]} ${p[p.length - 1]}`;
}

function OrgNode({
  node,
  depth,
  isRoot,
}: {
  node: OrgNode;
  depth: number;
  isRoot?: boolean;
}) {
  const [open, setOpen] = useState(depth < 2);
  const has = node.children.length > 0;
  const d = D[Math.min(depth, D.length - 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Node box */}
      <div
        className={`org-node${!isRoot ? " hc" : ""}`}
        onClick={has ? () => setOpen((v) => !v) : undefined}
        title={node.name}
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
          transition: "box-shadow 0.15s",
        }}
      >
        <div
          style={{
            fontSize: isRoot ? 14 : depth === 1 ? 13 : 11,
            fontWeight: depth <= 1 ? 700 : 600,
            lineHeight: 1.35,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {shortName(node.name)}
        </div>
        {node.role && (
          <div
            style={{
              fontSize: 10,
              marginTop: 2,
              opacity: 0.75,
              lineHeight: 1.3,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {node.role}
          </div>
        )}

        {/* Expand / collapse indicator */}
        {has && (
          <span
            style={{
              position: "absolute",
              bottom: -10,
              left: "50%",
              transform: "translateX(-50%)",
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: depth === 0 ? "#15803d" : "var(--brand)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              lineHeight: 1,
            }}
          >
            {open ? "−" : node.children.length}
          </span>
        )}
      </div>

      {/* Children */}
      {has && open && (
        <ul className="org-ul">
          {node.children.map((c) => (
            <li key={c.id} className="org-li">
              <OrgNode node={c} depth={depth + 1} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OrgTreeClient({ roots }: { roots: OrgNode[] }) {
  if (!roots.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 0",
          color: "var(--text-300)",
        }}
      >
        Nenhum dado encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <>
      <style>{TREE_CSS}</style>
      <div className="org-wrap">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 80,
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          {roots.map((root) => (
            <div key={root.id} className="org-tree">
              <OrgNode node={root} depth={0} isRoot />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
