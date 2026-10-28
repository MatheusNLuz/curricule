import Link from "next/link";
import { HugeIcon } from "@/components/ui/huge-icon";
import { ArrowRight } from "@/components/ui/app-icon";
import { ANALYSIS_MODES } from "@/lib/analysis-modes";

export function AnalysisModeGrid() {
  return (
    <div className="sheet"><div className="actionList">
      {ANALYSIS_MODES.map(mode => <Link className="actionRow" href={mode.href} key={mode.value}><HugeIcon icon={mode.icon} size={23} /><span><strong>{mode.title}</strong><small>{mode.value === "MAKE_ATS_FRIENDLY" ? "Revise a estrutura e o conteúdo do currículo, mesmo sem uma vaga em mente." : mode.description}</small></span><ArrowRight size={18} /></Link>)}
    </div>
    </div>
  );
}
