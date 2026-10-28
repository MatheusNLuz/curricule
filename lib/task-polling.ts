export function taskPollDelay(active: boolean, failures: number) {
  if (failures >= 5 || (!active && failures === 0)) return null;
  if (failures) return Math.min(60_000, 3000 * 2 ** Math.min(failures, 5));
  return 3000;
}
