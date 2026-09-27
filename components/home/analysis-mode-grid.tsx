import type { CSSProperties } from "react";
import { LinkedInLogo } from "@/components/ui/linkedin-logo";
import { ModeRoute } from "@/components/home/mode-route";
import { ANALYSIS_MODES } from "@/lib/analysis-modes";

export function AnalysisModeGrid() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {ANALYSIS_MODES.map(({ value, ...mode }, index) => (
        <ModeRoute
          key={value}
          {...mode}
          customIcon={value === "LINKEDIN_OPTIMIZATION" ? <LinkedInLogo className="size-[19px] text-linkedin" /> : undefined}
          className={`route-card-enter lg:col-span-2 ${index === 3 ? "lg:col-start-2" : index === 4 ? "lg:col-start-4" : ""}`}
          style={{ "--route-delay": `${Math.min(index, 4) * 45}ms` } as CSSProperties}
        />
      ))}
    </div>
  );
}
