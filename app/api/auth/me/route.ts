import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true }
    });

    return NextResponse.json({ user: user ? { ...user, image: session.image ?? null } : null });
  } catch (error) {
    console.error("Erro no fetch do usuário:", error);
    return NextResponse.json({ user: null });
  }
}
