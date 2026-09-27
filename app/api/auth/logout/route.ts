import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNeonAuth } from "@/lib/auth/server";

export async function POST() {
  try {
    const auth = getNeonAuth();
    if (auth) {
      const result = await auth.signOut();
      return NextResponse.json(result);
    }

    // Temporary cleanup for sessions created before the Neon Auth migration.
    const cookieStore = await cookies();
    cookieStore.delete("session");
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no logout:", error);
    return NextResponse.json({ error: "Falha ao deslogar" }, { status: 500 });
  }
}
