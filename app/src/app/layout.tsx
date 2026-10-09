import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-context";

export const metadata: Metadata = {
  title: "ECOLchain · Portal da empresa",
  description:
    "Cadastro e onboarding de empresas na rede ECOLchain — rastreabilidade de resíduos via blockchain.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e4330",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-creme text-verde-floresta antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
