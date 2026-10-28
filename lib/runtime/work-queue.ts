import { HttpError } from "../http-error";

type Waiting = { start: () => void };
type QueueOptions = { concurrency: number; maximumWaiting: number; waitMs: number };

/** Holds capacity until the work and its cleanup finish, including failures. */
export class WorkQueue {
  private active = 0;
  private readonly waiting: Waiting[] = [];

  constructor(private readonly options: QueueOptions) {}

  async run<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const release = await this.acquire(signal);
    try {
      signal?.throwIfAborted();
      return await operation();
    } finally {
      release();
    }
  }

  private async acquire(signal?: AbortSignal): Promise<() => void> {
    signal?.throwIfAborted();
    if (this.active < this.options.concurrency) {
      this.active++;
      return this.releaseOnce();
    }
    if (this.waiting.length >= this.options.maximumWaiting) throw this.busy();
    return new Promise((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      };
      const remove = (error: unknown) => {
        if (settled) return;
        settled = true;
        const index = this.waiting.indexOf(entry);
        if (index >= 0) this.waiting.splice(index, 1);
        cleanup();
        reject(error);
      };
      const abort = () => remove(signal?.reason);
      const entry: Waiting = { start: () => {
        if (settled) return;
        settled = true;
        cleanup();
        this.active++;
        resolve(this.releaseOnce());
      } };
      const timer = setTimeout(() => remove(this.busy()), this.options.waitMs);
      this.waiting.push(entry);
      signal?.addEventListener("abort", abort, { once: true });
      // Covers cancellation between the initial check and listener registration.
      if (signal?.aborted) abort();
    });
  }

  private releaseOnce() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active--;
      this.waiting.shift()?.start();
    };
  }

  private busy() {
    return new HttpError(429, "Há processamentos na fila. Aguarde alguns instantes e tente novamente; seu material foi preservado.", "PROCESSING_BUSY");
  }
}
