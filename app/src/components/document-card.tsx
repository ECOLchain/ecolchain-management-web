"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Download,
  FileUp,
  LoaderCircle,
  Upload,
  XCircle,
} from "lucide-react";
import { api, UnauthorizedError, uploadToPresignedUrl } from "@/lib/api";
import { friendlyMessage } from "@/lib/errors";
import {
  ALLOWED_EXTENSIONS,
  CONTENT_TYPE_BY_EXT,
  MAX_UPLOAD_BYTES,
  fileExtension,
  formatBytes,
} from "@/lib/format";
import { useSession } from "./session-context";
import { Button, cn } from "./ui";
import type { OnboardingAttribute } from "@/lib/types";

export type DocUiState =
  | "PENDING_UPLOAD"
  | "UPLOADED"
  | "REJECTED"
  | "ACCEPTED";

export function docState(attr: OnboardingAttribute): DocUiState {
  if (attr.valor == null) return "PENDING_UPLOAD";
  if (attr.revisao?.status === "REJECTED") return "REJECTED";
  if (attr.revisao?.status === "ACCEPTED") return "ACCEPTED";
  return "UPLOADED";
}

const STATE_LABEL: Record<DocUiState, string> = {
  PENDING_UPLOAD: "Pendente de envio",
  UPLOADED: "Enviado",
  REJECTED: "Rejeitado na revisão",
  ACCEPTED: "Aceito",
};

export function DocumentCard({
  attr,
  onChanged,
}: {
  attr: OnboardingAttribute;
  /** Chamado após upload confirmado (para recarregar o onboarding). */
  onChanged: () => void;
}) {
  const { expire } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"idle" | "presign" | "sending" | "confirming">(
    "idle",
  );
  const [erro, setErro] = useState<string | null>(null);
  const state = docState(attr);

  const extensoes = (
    attr.regras?.extensoesPermitidas?.length
      ? attr.regras?.extensoesPermitidas.map((e) => e.toLowerCase())
      : [...ALLOWED_EXTENSIONS]
  ) as string[];
  const maxBytes = Math.min(
    attr.regras?.tamanhoMaxBytes ?? MAX_UPLOAD_BYTES,
    MAX_UPLOAD_BYTES,
  );
  const accept = extensoes.map((e) => `.${e}`).join(",");

  function validar(file: File): string | null {
    const ext = fileExtension(file.name);
    if (!ext || !extensoes.includes(ext))
      return `Formato não aceito. Permitidos: ${extensoes.join(", ")}.`;
    if (file.size > maxBytes)
      return `Arquivo maior que o limite de ${formatBytes(maxBytes)}.`;
    if (file.size === 0) return "O arquivo está vazio.";
    return null;
  }

  async function enviar(file: File) {
    setErro(null);
    const invalido = validar(file);
    if (invalido) {
      setErro(invalido);
      return;
    }
    const ext = fileExtension(file.name);
    const contentType = CONTENT_TYPE_BY_EXT[ext];
    try {
      setBusy("presign");
      const presign = await api.createUploadUrl(attr.codigo, {
        nomeArquivo: file.name,
        contentType,
        tamanhoBytes: file.size,
      });
      if (!presign) throw new Error("empty");
      setBusy("sending");
      await uploadToPresignedUrl(presign.url, file, presign.contentType);
      setBusy("confirming");
      await api.confirmUpload(attr.codigo, presign.objectKey);
      onChanged();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        expire();
        return;
      }
      setErro(friendlyMessage(err));
    } finally {
      setBusy("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function baixar() {
    setErro(null);
    try {
      const data = await api.downloadUrl(attr.codigo);
      if (data?.url) window.open(data.url, "_blank", "noopener");
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        expire();
        return;
      }
      setErro(friendlyMessage(err));
    }
  }

  const busyLabel =
    busy === "presign"
      ? "Preparando envio..."
      : busy === "sending"
        ? "Enviando arquivo..."
        : busy === "confirming"
          ? "Confirmando..."
          : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        state === "REJECTED"
          ? "border-erro-terra/40 bg-erro-fundo/40"
          : state === "ACCEPTED"
            ? "border-verde-musgo/40 bg-ok-fundo/40"
            : "border-verde-floresta/20 bg-creme",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <StatusIcon state={state} />
          <div>
            <p className="text-sm font-semibold text-verde-floresta">
              {attr.rotulo}
              {attr.obrigatorio ? (
                <span className="text-erro-terra"> *</span>
              ) : null}
            </p>
            {attr.ajuda ? (
              <p className="mt-0.5 text-xs text-verde-musgo/90">{attr.ajuda}</p>
            ) : null}
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                state === "REJECTED" ? "text-erro-terra" : "text-verde-musgo",
              )}
            >
              {STATE_LABEL[state]}
            </p>
            {state === "REJECTED" && attr.revisao?.nota ? (
              <p className="mt-1 rounded bg-white/70 p-2 text-xs text-erro-terra">
                Nota do revisor: {attr.revisao.nota}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {state !== "ACCEPTED" && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void enviar(f);
                }}
              />
              <Button
                type="button"
                variant={state === "PENDING_UPLOAD" ? "primary" : "ghost"}
                className="min-h-9 px-3 py-1.5 text-xs"
                disabled={busy !== "idle"}
                onClick={() => inputRef.current?.click()}
              >
                {state === "PENDING_UPLOAD" ? (
                  <>
                    <Upload className="h-3.5 w-3.5" aria-hidden /> Enviar arquivo
                  </>
                ) : (
                  <>
                    <FileUp className="h-3.5 w-3.5" aria-hidden /> Substituir
                  </>
                )}
              </Button>
            </>
          )}
          {attr.valor != null && (
            <button
              type="button"
              onClick={baixar}
              className="inline-flex items-center gap-1 text-xs font-medium text-verde-musgo underline-offset-4 hover:underline"
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Baixar
            </button>
          )}
        </div>
      </div>
      {busyLabel ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-medium text-verde-musgo">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          {busyLabel}
        </p>
      ) : null}
      {erro ? (
        <p className="mt-3 text-xs font-medium text-erro-terra" role="alert">
          {erro}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-verde-musgo/70">
        Formatos: {extensoes.join(", ")} · até {formatBytes(maxBytes)}
      </p>
    </div>
  );
}

function StatusIcon({ state }: { state: DocUiState }) {
  if (state === "ACCEPTED")
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-verde-musgo" aria-hidden />;
  if (state === "REJECTED")
    return <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-erro-terra" aria-hidden />;
  if (state === "UPLOADED")
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-verde-musgo/60" aria-hidden />;
  return <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-dourado" aria-hidden />;
}
