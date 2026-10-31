type AnalysisSummary = {
  id: string;
  mode: string;
  hasAnalysis: boolean;
  hasResume: boolean;
  hasLetter: boolean;
  running?: boolean;
};

/** Open stored results without starting another analysis. */
export function getAnalysisDestination(item: AnalysisSummary): string {
  if (item.running) return `/analysis/${item.id}`;
  if (item.hasResume && item.mode !== "LINKEDIN_OPTIMIZATION") {
    return `/analysis/${item.id}/preview`;
  }
  if (item.hasAnalysis || item.hasResume || item.hasLetter) return `/analysis/${item.id}`;
  return `/analysis/new?mode=${encodeURIComponent(item.mode)}&draft=${encodeURIComponent(item.id)}`;
}
