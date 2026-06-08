import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Bloqueia iframe em outros sites (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Sem sniffing de MIME type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Força HTTPS por 1 ano, inclui subdomínios
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Não vaza URL de origem em requests cross-origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Bloqueia acesso a recursos desnecessários do browser
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // CSP: apenas recursos do próprio domínio + Supabase + Google Fonts
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // unsafe-inline necessário para Next.js inline scripts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"} https://*.supabase.co`,
              "img-src 'self' data: blob:",
              "frame-ancestors 'none'", // reforça X-Frame-Options
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
