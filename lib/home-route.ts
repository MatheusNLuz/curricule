export function getHomeRedirect(session: { userId: string } | null) {
  return session ? "/history" : null;
}
