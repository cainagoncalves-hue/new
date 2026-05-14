import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema BP · SIEG Gente & Cultura",
  description: "Check-in de Metas · Business Partners",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
