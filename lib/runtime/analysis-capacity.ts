import { WorkQueue } from "./work-queue";
import { boundedSetting } from "./settings";

const queues = globalThis as typeof globalThis & { curriculeAnalysisQueue?: WorkQueue };
const queue = queues.curriculeAnalysisQueue ??= new WorkQueue({
  concurrency: boundedSetting(process.env.ANALYSIS_CONCURRENCY, 2, 8),
  maximumWaiting: 8,
  waitMs: 15_000,
});

export function withAnalysisCapacity<T>(work: () => Promise<T>, signal: AbortSignal) {
  return queue.run(work, signal);
}
