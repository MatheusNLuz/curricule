export function boundedSetting(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export function databaseConnectionUrl(value: string | undefined) {
  if (!value) return undefined;
  const url = new URL(value);
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", String(boundedSetting(process.env.DB_CONNECTION_LIMIT, 3, 20)));
  if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "10");
  return url.href;
}
