"use client";

import { useState } from "react";
import { Download01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/huge-icon";
import { useToast } from "@/components/ui/custom-toast";
import { getFetchErrorMessage, readApiError } from "@/lib/api-client";
import { makeResumePdfFilename } from "@/lib/resume-library";

export function DownloadResumeButton({ analysisId, title }: { analysisId: string; title: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Não foi possível gerar o PDF."));

      const pdfUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = pdfUrl;
      anchor.download = makeResumePdfFilename(title);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
    } catch (error: unknown) {
      toast({
        title: "Não foi possível baixar o currículo",
        description: getFetchErrorMessage(error, "Tente gerar o PDF novamente."),
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      aria-busy={loading}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-soft-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-wait disabled:opacity-60"
    >
      <HugeIcon icon={loading ? Loading03Icon : Download01Icon} size={16} className={loading ? "animate-spin" : undefined} />
      {loading ? "Preparando PDF…" : "Baixar PDF"}
    </button>
  );
}
