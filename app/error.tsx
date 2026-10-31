"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/mascot/mascot";

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
      <Mascot pose="think" size="medium" />
      <div className="max-w-md space-y-2 text-center">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Algo saiu do caminho.</h1>
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
