export function taskPollDelay(active: boolean, failures: number) {
  if (failures) return Math.min(60_000, 3000 * 2 ** Math.min(failures, 5));
  return active ? 3000 : 30_000;
}
