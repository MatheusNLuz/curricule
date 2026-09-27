"use client";

import { useEffect } from "react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { HugeIcon } from "@/components/ui/huge-icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if available
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 px-5">
      <div className="grid size-14 place-items-center rounded-2xl bg-signal/10 text-signal">
        <HugeIcon icon={Alert02Icon} size={27} />
      </div>
      <div className="max-w-md space-y-2 text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Algo saiu do caminho.</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Ocorreu um erro inesperado ao tentar processar sua solicitação. Por favor, tente novamente.
        </p>
      </div>
      <Button 
        onClick={() => reset()}
        variant="default"
        className="mt-4 h-11 rounded-xl px-4"
      >
        Tentar Novamente
      </Button>
    </div>
  );
}
