export function getHomeRedirect(session: { userId: string } | null) {
  return session ? "/dashboard" : null;
}
