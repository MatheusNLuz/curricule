export const HISTORY_PAGE_SIZE = 20;
export function historyQuery(input: { q?: string; mode?: string; cursor?: string }) {
  return { q: (input.q || "").trim().slice(0, 120), mode: (input.mode || "").slice(0, 40), cursor: (input.cursor || "").slice(0, 64) };
}
