"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div className="animate-fade-up" style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)",
            marginBottom: 16,
            boxShadow: "var(--sh-md)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--text-900)",
            marginBottom: 4,
          }}>
            Sistema BP
          </h1>
          <p style={{ color: "var(--text-500)", fontSize: 13 }}>
            SIEG Gente &amp; Cultura
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--surface)",
          borderRadius: "var(--r)",
          border: "1px solid var(--border)",
          boxShadow: "var(--sh-md)",
          padding: "32px 28px",
        }}>
          <h2 style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--text-900)",
            marginBottom: 6,
          }}>
            Entrar
          </h2>
          <p style={{ color: "var(--text-500)", fontSize: 13, marginBottom: 24 }}>
            Acesse com suas credenciais corporativas
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-700)",
                marginBottom: 6,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border-2)",
                  background: "var(--surface)",
                  color: "var(--text-900)",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color .15s",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--brand)")}
                onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-700)",
                marginBottom: 6,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1.5px solid var(--border-2)",
                  background: "var(--surface)",
                  color: "var(--text-900)",
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color .15s",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--brand)")}
                onBlur={e => (e.target.style.borderColor = "var(--border-2)")}
              />
            </div>

            {error && (
              <p style={{
                background: "var(--red-bg)",
                color: "var(--red-text)",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                border: "none",
                background: loading
                  ? "var(--text-300)"
                  : "linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "opacity .15s",
                marginTop: 4,
              }}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
