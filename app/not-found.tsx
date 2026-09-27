import Link from "next/link";
import { File02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { HugeIcon } from "@/components/ui/huge-icon";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 px-5">
      <div className="grid size-14 place-items-center rounded-2xl bg-soft-primary text-primary">
        <HugeIcon icon={File02Icon} size={27} />
      </div>
      <div className="max-w-md space-y-2 text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight">Este ponto não existe.</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Não conseguimos encontrar a página que você está procurando. Talvez ela tenha sido movida ou deletada.
        </p>
      </div>
      <Link href="/" className="mt-4">
        <Button variant="default" className="h-11 rounded-xl px-4">
          Voltar para o Início
        </Button>
      </Link>
    </div>
  );
}
