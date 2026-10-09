import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/session-context";
import { getCopy, DEFAULT_LOCALE } from "@/i18n";

const c = getCopy(DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: c.meta.title,
  description: c.meta.description,
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
