"use client";

import { useState } from "react";
import { useCopy } from "@/i18n/provider";
import { AdminAccounts } from "./admin-accounts";
import { AdminAudit } from "./admin-audit";
import { AdminCatalog } from "./admin-catalog";
import { AdminCompanies } from "./admin-console";
import { AuthedHeader } from "./status-screen";
import { PageShell } from "./ui";

type Tab = "companies" | "catalog" | "admins" | "audit";

export function AdminPlatform() {
  const c = useCopy();
  const a = c.admin;
  const [tab, setTab] = useState<Tab>("companies");

  const tabs: { id: Tab; label: string }[] = [
    { id: "companies", label: a.tabCompanies },
    { id: "catalog", label: a.tabCatalog },
    { id: "admins", label: a.tabAdmins },
    { id: "audit", label: a.tabAudit },
  ];

  return (
    <>
      <AuthedHeader />
      <PageShell title={a.title} subtitle={a.sub} wide>
        <nav
          className="mb-6 flex flex-wrap gap-1 border-b border-verde-floresta/15"
          aria-label={a.tabsAria}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? "border-b-2 border-verde-floresta bg-verde-banda/50 text-verde-floresta"
                  : "text-verde-musgo hover:bg-verde-banda/30"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {tab === "companies" ? <AdminCompanies /> : null}
        {tab === "catalog" ? <AdminCatalog /> : null}
        {tab === "admins" ? <AdminAccounts /> : null}
        {tab === "audit" ? <AdminAudit /> : null}
      </PageShell>
    </>
  );
}
