import { cookies } from "next/headers";
import { getNeonAuth } from "@/lib/auth/server";

export async function logoutCurrentUser() {
  const auth = getNeonAuth();
  if (auth) {
    await auth.signOut();
    return;
  }

  const cookieStore = await cookies();
  cookieStore.delete("session");
}
