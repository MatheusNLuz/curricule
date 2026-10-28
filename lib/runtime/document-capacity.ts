import { reserveCapacity } from "../security-rate-limit";
import { WorkQueue } from "./work-queue";
import { boundedSetting } from "./settings";

const concurrency = boundedSetting(process.env.DOCUMENT_CONCURRENCY, 1, 4);
const globalQueues = globalThis as typeof globalThis & { curriculeDocumentQueue?: WorkQueue };
const queue = globalQueues.curriculeDocumentQueue ??= new WorkQueue({ concurrency, maximumWaiting: 6, waitMs: 15_000 });

export function withDocumentCapacity<T>(operation: () => Promise<T>, signal?: AbortSignal) {
  return queue.run(async () => {
    // Also protects deployments with more than one Node process. No database
    // connection is held while Chromium or the PDF parser is working.
    const release = await reserveCapacity("document-heavy", "global", concurrency, 90_000);
    try { return await operation(); }
    finally { await release().catch(() => console.warn("A reserva de documento será liberada ao expirar.")); }
  }, signal);
}
