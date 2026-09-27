import { CheckmarkCircle01Icon, CircleIcon } from "@hugeicons/core-free-icons";
import { HugeIcon } from "@/components/ui/huge-icon";
import { cn } from "@/lib/utils";

type RouteStep = {
  label: string;
  description?: string;
};

type RouteLineProps = {
  steps: RouteStep[];
  activeIndex: number;
  className?: string;
};

const stepDelayClasses = ["delay-0", "delay-75", "delay-150", "delay-200", "delay-300"] as const;

export function RouteLine({ steps, activeIndex, className }: RouteLineProps) {
  return (
    <ol className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0", className)} aria-label="Etapas da jornada">
      {steps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        const stepDelay = stepDelayClasses[Math.min(index, stepDelayClasses.length - 1)];

        return (
          <li
            key={step.label}
            className={cn(
              "flex min-w-0 gap-3 sm:block",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:fill-mode-both",
              stepDelay,
              active && "text-foreground",
              !active && !complete && "text-muted-foreground",
            )}
            aria-current={active ? "step" : undefined}
          >
            <span className="flex shrink-0 flex-col items-center sm:flex-row sm:items-center">
              <span
                className={cn(
                  "relative z-10 grid size-6 shrink-0 place-items-center rounded-full bg-surface transition-colors duration-300",
                  active && "text-primary",
                  complete && "text-route",
                  !active && !complete && "text-muted-foreground/70",
                )}
              >
                <HugeIcon icon={complete ? CheckmarkCircle01Icon : CircleIcon} size={active ? 20 : 17} />
              </span>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "my-2 h-5 w-px bg-border/90 transition-colors duration-500 sm:mx-3 sm:my-0 sm:h-px sm:w-auto sm:flex-1",
                    complete && "bg-route/70",
                  )}
                />
              )}
            </span>
            <span className="min-w-0 sm:mt-2">
              <span className="block text-[12px] font-semibold leading-tight">{step.label}</span>
              {step.description && <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{step.description}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
