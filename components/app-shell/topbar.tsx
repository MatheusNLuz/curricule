import { getSessionUser, type SessionUser } from "@/lib/auth";
import { AppShellNav } from "@/components/app-shell/app-shell-nav";

export async function Topbar({ session }: { session?: SessionUser | null }) {
  const resolvedSession = session === undefined ? await getSessionUser() : session;
  return <AppShellNav session={resolvedSession} />;
}
