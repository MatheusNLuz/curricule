import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/huge-icon";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 px-5">
      <div className="relative grid size-16 place-items-center rounded-2xl bg-soft-primary text-primary">
        <HugeIcon icon={Loading03Icon} size={27} className="animate-spin" />
      </div>
      <h2 className="font-heading text-xl font-semibold tracking-tight">Carregando sua análise...</h2>
      <p className="text-center text-[13px] text-muted-foreground">Preparando o próximo ponto para você.</p>
    </div>
  );
}
