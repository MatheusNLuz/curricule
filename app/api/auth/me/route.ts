import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ user: null }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return NextResponse.json({ user: { id: session.userId, email: session.email, name: session.name ?? null, image: session.image ?? null } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.warn("Não foi possível validar a sessão.", { type: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ user: null }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
