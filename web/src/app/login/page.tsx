export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
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
          <p style={{ color: "var(--text-500)", fontSize: 13 }}>SIEG Gente &amp; Cultura</p>
        </div>

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

          <form
            action="/api/auth/login"
            method="POST"
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <label style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-700)",
                marginBottom: 6,
                letterSpacing: "0.02em",
                textTransform: "uppercase" as const,
              }}>
                E-mail
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
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
                  boxSizing: "border-box" as const,
                }}
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
                textTransform: "uppercase" as const,
              }}>
                Senha
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
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
                  boxSizing: "border-box" as const,
                }}
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
                margin: 0,
              }}>
                E-mail ou senha incorretos.
              </p>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, var(--brand) 0%, var(--brand-mid) 100%)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
