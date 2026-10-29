export function AiReviewNotice({ subject }: { subject: "analysis" | "questions" }) {
  return <p role="status" className="mb-5 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground">
    {subject === "analysis" ? "Esta análise foi gerada por uma IA. A segunda revisão estava indisponível; confira as informações antes de continuar." : "Estas perguntas foram geradas por uma IA. A segunda revisão estava indisponível; confira as informações antes de responder."}
  </p>;
}
