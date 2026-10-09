"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "./session-context";
import { useCopy, useLocale } from "@/i18n/provider";
import { localPath } from "@/i18n";
import { AppHeader, Button, Card, PageShell } from "./ui";

export function LogoutButton() {
  const { logout } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const copy = useCopy();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="min-h-9 px-3 py-1.5 text-xs"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await logout();
        router.replace(localPath("/login", locale));
      }}
    >
      {copy.common.logout}
    </Button>
  );
}

export function AuthedHeader() {
  const { me } = useSession();
  return (
    <AppHeader
      right={
        <>
          <span className="hidden text-sm text-verde-musgo sm:block">
            {me?.conta.email}
          </span>
          <LogoutButton />
        </>
      }
    />
  );
}

export function StatusScreen({
  icon,
  tone = "info",
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  tone?: "info" | "error" | "success";
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <>
      <AuthedHeader />
      <PageShell title={title}>
        <Card className="flex flex-col items-start gap-5">
          <div
            className={
              tone === "error"
                ? "rounded-full bg-erro-fundo p-3 text-erro-terra"
                : "rounded-full bg-verde-banda p-3 text-verde-musgo"
            }
          >
            {icon}
          </div>
          <div className="text-sm leading-relaxed text-verde-floresta">
            {children}
          </div>
          {action}
        </Card>
      </PageShell>
    </>
  );
}
