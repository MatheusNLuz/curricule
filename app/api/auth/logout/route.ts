import { NextResponse } from "next/server";
import { logoutCurrentUser } from "@/lib/auth/logout";

export async function POST() {
  try {
    await logoutCurrentUser();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no logout:", error);
    return NextResponse.json({ error: "Falha ao deslogar" }, { status: 500 });
  }
}
