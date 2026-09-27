import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/huge-icon";
import type { IconSvgElement } from "@hugeicons/react";

type ModeRouteProps = {
  href: string;
  icon: IconSvgElement;
  title: string;
  description: string;
  cta: string;
  customIcon?: ReactNode;
  accent?: "primary" | "route" | "signal" | "linkedin";
  className?: string;
  style?: CSSProperties;
};

const accentStyles = {
  primary: "text-primary bg-primary/10",
  route: "text-route bg-route/10",
  signal: "text-signal bg-signal/10",
  linkedin: "text-linkedin bg-linkedin/10",
};

export function ModeRoute({ href, icon, title, description, cta, customIcon, accent = "primary", className, style }: ModeRouteProps) {
  const styles = accentStyles[accent];

  return (
    <Link href={href} style={style} className={`group block rounded-2xl active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${className ?? ""}`}>
      <div className="surface surface-hover flex min-h-[164px] flex-col justify-between rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <span className={`grid size-10 place-items-center rounded-xl ${styles}`}>{customIcon ?? <HugeIcon icon={icon} size={19} />}</span>
          <HugeIcon icon={ArrowRight01Icon} size={18} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </div>
        <div className="mt-6">
          <h3 className="mt-1 text-[15px] font-semibold tracking-[-0.01em]">{title}</h3>
          <p className="mt-1.5 max-w-[34ch] text-[12px] leading-relaxed text-muted-foreground">{description}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary">{cta}<HugeIcon icon={ArrowRight01Icon} size={15} className="transition-transform group-hover:translate-x-1" /></p>
        </div>
      </div>
    </Link>
  );
}
